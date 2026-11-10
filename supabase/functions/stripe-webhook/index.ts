// Stripe Webhook Handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        // Obter assinatura do Stripe
        const signature = req.headers.get('stripe-signature');
        if (!signature) {
            throw new Error('Missing Stripe signature');
        }

        // Ler body como texto
        const body = await req.text();
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET not configured');
        }

        // Verificar assinatura do webhook
        const event = await verifyStripeSignature(body, signature, webhookSecret);

        logger.info(`Stripe webhook received: ${event.type}`, { eventId: event.id });

        // Criar cliente Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Processar evento baseado no tipo
        switch (event.type) {
            case 'payment_intent.succeeded':
                await handlePaymentSuccess(supabase, event.data.object);
                break;

            case 'payment_intent.payment_failed':
                await handlePaymentFailed(supabase, event.data.object);
                break;

            case 'payment_intent.canceled':
                await handlePaymentCanceled(supabase, event.data.object);
                break;

            case 'charge.refunded':
                await handleRefund(supabase, event.data.object);
                break;

            case 'payment_intent.requires_action':
                await handleRequiresAction(supabase, event.data.object);
                break;

            default:
                logger.info(`Unhandled event type: ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        logger.error('Stripe webhook error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

/**
 * Verificar assinatura do webhook Stripe
 */
async function verifyStripeSignature(
    payload: string,
    signature: string,
    secret: string
): Promise<any> {
    const encoder = new TextEncoder();

    // Extrair timestamp e assinatura
    const parts = signature.split(',');
    const timestamp = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const sig = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestamp || !sig) {
        throw new Error('Invalid signature format');
    }

    // Verificar se o timestamp não é muito antigo (5 minutos)
    const currentTime = Math.floor(Date.now() / 1000);
    const timestampNum = parseInt(timestamp, 10);
    if (currentTime - timestampNum > 300) {
        throw new Error('Timestamp too old');
    }

    // Criar assinatura esperada
    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const expectedSig = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(signedPayload)
    );

    // Converter para hex
    const expectedSigHex = Array.from(new Uint8Array(expectedSig))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

    // Comparar assinaturas
    if (expectedSigHex !== sig) {
        throw new Error('Invalid signature');
    }

    return JSON.parse(payload);
}

/**
 * Handler: Pagamento bem-sucedido
 */
async function handlePaymentSuccess(supabase: any, paymentIntent: any) {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
        logger.warn('Payment intent without order_id', { paymentIntentId: paymentIntent.id });
        return;
    }

    logger.info(`Payment succeeded for order ${orderId}`, {
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency
    });

    // Atualizar pedido
    const { error: orderError } = await supabase
        .from('orders')
        .update({
            status: 'paid',
            external_id: paymentIntent.id,
            paid_at: new Date().toISOString()
        })
        .eq('id', orderId);

    if (orderError) {
        logger.error(`Error updating order ${orderId}:`, orderError);
        throw orderError;
    }

    // Atualizar pagamento
    const { error: paymentError } = await supabase
        .from('payments')
        .update({
            status: 'paid',
            paid_at: new Date().toISOString()
        })
        .eq('order_id', orderId)
        .eq('external_payment_id', paymentIntent.id);

    if (paymentError) {
        logger.error(`Error updating payment for order ${orderId}:`, paymentError);
    }

    // Buscar informações do pedido para liberar acesso
    const { data: order } = await supabase
        .from('orders')
        .select('user_id, order_items(product_id, products(course_id))')
        .eq('id', orderId)
        .single();

    if (order && order.order_items?.length > 0) {
        const userId = order.user_id;

        // Liberar acesso aos cursos
        for (const item of order.order_items) {
            const courseId = item.products?.course_id;

            if (courseId) {
                // Verificar se já tem acesso
                const { data: existing } = await supabase
                    .from('user_course_access')
                    .select('id')
                    .eq('user_id', userId)
                    .eq('course_id', courseId)
                    .maybeSingle();

                if (!existing) {
                    await supabase.from('user_course_access').insert({
                        user_id: userId,
                        course_id: courseId,
                        source: 'checkout',
                        granted_by: null
                    });

                    logger.info(`Access granted to course ${courseId} for user ${userId}`);
                }
            }
        }
    }

    // TODO: Enviar email de confirmação
    // TODO: Disparar notificações
}

/**
 * Handler: Pagamento falhou
 */
async function handlePaymentFailed(supabase: any, paymentIntent: any) {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) {
        logger.warn('Payment intent without order_id', { paymentIntentId: paymentIntent.id });
        return;
    }

    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

    logger.info(`Payment failed for order ${orderId}`, {
        paymentIntentId: paymentIntent.id,
        error: errorMessage
    });

    // Atualizar pedido
    await supabase
        .from('orders')
        .update({
            status: 'failed',
            error_message: errorMessage
        })
        .eq('id', orderId);

    // Atualizar pagamento
    await supabase
        .from('payments')
        .update({
            status: 'failed',
            error_message: errorMessage
        })
        .eq('order_id', orderId)
        .eq('external_payment_id', paymentIntent.id);

    // TODO: Enviar email de falha
    // TODO: Notificar usuário
}

/**
 * Handler: Pagamento cancelado
 */
async function handlePaymentCanceled(supabase: any, paymentIntent: any) {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) return;

    logger.info(`Payment canceled for order ${orderId}`, {
        paymentIntentId: paymentIntent.id
    });

    await supabase
        .from('orders')
        .update({ status: 'canceled' })
        .eq('id', orderId);

    await supabase
        .from('payments')
        .update({ status: 'failed' })
        .eq('order_id', orderId)
        .eq('external_payment_id', paymentIntent.id);
}

/**
 * Handler: Reembolso processado
 */
async function handleRefund(supabase: any, charge: any) {
    const paymentIntentId = charge.payment_intent;

    logger.info(`Refund processed for charge ${charge.id}`, {
        paymentIntentId,
        amount: charge.amount_refunded,
        currency: charge.currency
    });

    // Buscar pagamento pelo external_payment_id
    const { data: payment } = await supabase
        .from('payments')
        .select('order_id')
        .eq('external_payment_id', paymentIntentId)
        .single();

    if (payment) {
        // Atualizar status do pedido
        await supabase
            .from('orders')
            .update({ status: 'refunded' })
            .eq('id', payment.order_id);

        // Atualizar status do pagamento
        await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('order_id', payment.order_id);

        // TODO: Revogar acesso ao curso
        // TODO: Enviar email de reembolso
    }
}

/**
 * Handler: Requer ação adicional (3D Secure)
 */
async function handleRequiresAction(supabase: any, paymentIntent: any) {
    const orderId = paymentIntent.metadata?.order_id;

    if (!orderId) return;

    logger.info(`Payment requires action for order ${orderId}`, {
        paymentIntentId: paymentIntent.id,
        nextAction: paymentIntent.next_action?.type
    });

    // Manter status como pending
    await supabase
        .from('orders')
        .update({ status: 'pending' })
        .eq('id', orderId);

    // TODO: Notificar usuário para completar autenticação
}
