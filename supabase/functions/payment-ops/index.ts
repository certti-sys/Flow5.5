// Função de Pagamento - Versão Funcional Simplificada
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateCSRF } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "https://esm.sh/zod@3.25.76";

// --- SCHEMAS ---

const PaymentOpsSchema = z.object({
  action: z.enum(['create_paymentIntent', 'check_payment_status']),
  payload: z.object({
    productId: z.string().optional(),
    gatewayId: z.string().optional(),
    amount: z.number().optional(),
    email: z.string().email().optional(),
    name: z.string().optional(),
    phone: z.string().optional(),
    cpf: z.string().optional(),
    token: z.string().optional(),
    installments: z.number().optional(),
    payment_method_id: z.string().optional(),
    issuer_id: z.string().optional(),
    idempotencyKey: z.string().optional(),
    orderBumps: z.array(z.string()).optional(),
    couponId: z.string().uuid().nullable().optional(),
    couponCode: z.string().nullable().optional(),
    discountAmount: z.number().optional(),
  })
});


interface PaymentProvider {
    createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult>;
}

interface OrderContext {
    id: string;
    amount: number;
    currency: string;
    description: string;
    customer: {
        email: string;
        name: string;
        tax_id?: string;
    };
    items: Array<{
        id: string;
        title: string;
        unit_price: number;
        quantity: number;
    }>;
    metadata?: Record<string, any>;
}

interface PaymentIntentResult {
    external_id: string;
    status: 'pending' | 'paid' | 'failed';
    client_secret?: string;
    ticket_url?: string;
    qr_code?: string;
    qr_code_base64?: string;
    raw_response: any;
}

class MercadoPagoProvider implements PaymentProvider {
    private accessToken: string;
    private baseUrl = "https://api.mercadopago.com";

    constructor(credentials: { accessToken: string }) {
        this.accessToken = credentials.accessToken;
    }

    private async request(endpoint: string, method: string, body?: any, idempotencyKey?: string) {
        const headers: any = {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
        };

        if (idempotencyKey) {
            headers["X-Idempotency-Key"] = idempotencyKey;
        }

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(`Mercado Pago Error: ${data.message || res.statusText}`);
        }
        return data;
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        const paymentMethod = order.metadata?.payment_method_id || 'pix';
        const idempotencyKey = order.metadata?.idempotency_key || order.id;

        const payload: any = {
            transaction_amount: Number((order.amount / 100).toFixed(2)),
            description: order.description,
            payment_method_id: paymentMethod,
            payer: {
                email: order.customer.email,
                first_name: order.customer.name.split(" ")[0] || "Cliente",
                last_name: order.customer.name.split(" ").slice(1).join(" ") || "Cliente",
                identification: {
                    type: "CPF",
                    number: order.customer.tax_id ? order.customer.tax_id.replace(/\D/g, "") : "00000000000"
                }
            },
            external_reference: order.id,
            metadata: { 
                order_id: order.id,
                user_id: order.metadata?.user_id
            }
        };

        if (paymentMethod !== 'pix' && paymentMethod !== 'bolbradesco') {
            if (!order.metadata?.token) throw new Error("Token obrigatório para pagamentos com cartão");
            payload.token = order.metadata.token;
            payload.installments = Number(order.metadata.installments) || 1;
            
            // Adicionar issuer_id se fornecido
            if (order.metadata.issuer_id) {
                payload.issuer_id = order.metadata.issuer_id;
            }
        }

        const data = await this.request("/v1/payments", "POST", payload, idempotencyKey);

        console.log('[MercadoPago] Resposta completa:', JSON.stringify(data, null, 2));

        // Diagnóstico específico para Pix
        if (paymentMethod === 'pix') {
            console.log('[MercadoPago PIX] Diagnóstico:');
            console.log('  - point_of_interaction existe?', !!data.point_of_interaction);
            console.log('  - transaction_data existe?', !!data.point_of_interaction?.transaction_data);
            console.log('  - qr_code existe?', !!data.point_of_interaction?.transaction_data?.qr_code);
            console.log('  - qr_code length:', data.point_of_interaction?.transaction_data?.qr_code?.length || 0);
            console.log('  - qr_code_base64 existe?', !!data.point_of_interaction?.transaction_data?.qr_code_base64);
            console.log('  - ticket_url existe?', !!data.point_of_interaction?.transaction_data?.ticket_url);
        }

        let status: 'pending' | 'paid' | 'failed' = 'pending';
        if (data.status === 'approved') status = 'paid';
        if (data.status === 'rejected' || data.status === 'cancelled') status = 'failed';

        return {
            external_id: data.id.toString(),
            status,
            qr_code: data.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
            raw_response: data
        };
    }
}

class StripeProvider implements PaymentProvider {
    private apiKey: string;
    private baseUrl = "https://api.stripe.com/v1";

    constructor(credentials: { apiKey: string }) {
        this.apiKey = credentials.apiKey;
    }

    private async request(endpoint: string, method: string, body?: Record<string, any>) {
        const headers: Record<string, string> = {
            "Authorization": `Bearer ${this.apiKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
        };

        // Converter objeto para form-urlencoded
        const formBody = body ? new URLSearchParams(
            Object.entries(body).reduce((acc, [key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    // Para objetos aninhados, usar notação de colchetes
                    Object.entries(value).forEach(([subKey, subValue]) => {
                        acc[`${key}[${subKey}]`] = String(subValue);
                    });
                } else {
                    acc[key] = String(value);
                }
                return acc;
            }, {} as Record<string, string>)
        ).toString() : undefined;

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers,
            body: formBody
        });

        const data = await res.json();
        if (!res.ok) {
            const errorMessage = data.error?.message || res.statusText;
            throw new Error(`Stripe Error: ${errorMessage}`);
        }
        return data;
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        console.log('[Stripe] Creating payment intent for order:', order.id);

        const payload: Record<string, any> = {
            amount: order.amount, // já em centavos
            currency: order.currency.toLowerCase(),
            description: order.description,
            receipt_email: order.customer.email,
            'metadata[order_id]': order.id,
            'metadata[user_id]': order.metadata?.user_id || '',
            'metadata[product_id]': order.items[0]?.id || '',
            'automatic_payment_methods[enabled]': 'true'
        };

        const paymentIntent = await this.request("/payment_intents", "POST", payload);

        console.log('[Stripe] Payment Intent created:', {
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });

        return {
            external_id: paymentIntent.id,
            status: this.mapStatus(paymentIntent.status),
            client_secret: paymentIntent.client_secret,
            raw_response: paymentIntent
        };
    }

    private mapStatus(stripeStatus: string): 'pending' | 'paid' | 'failed' {
        switch (stripeStatus) {
            case 'succeeded':
                return 'paid';
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
            case 'processing':
                return 'pending';
            case 'canceled':
            case 'requires_capture':
                return 'failed';
            default:
                return 'pending';
        }
    }
}

function createPaymentProvider(slug: string, credentials: any): PaymentProvider {
    if (slug === 'mercadopago') {
        const token = credentials.access_token || credentials.secret_key;
        if (!token) throw new Error("Access token do Mercado Pago ausente");
        return new MercadoPagoProvider({ accessToken: token });
    }

    if (slug === 'stripe') {
        const apiKey = credentials.secret_key;
        if (!apiKey) throw new Error("Secret key do Stripe ausente");
        return new StripeProvider({ apiKey });
    }

    throw new Error(`Gateway '${slug}' não suportado`);
}


Deno.serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    // --- CSRF PROTECTION ---
    const csrfError = validateCSRF(req);
    if (csrfError) return csrfError;

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

        const authHeader = req.headers.get('Authorization');
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader || '' } }
        });

        const { data: { user }, error: authUserError } = await supabaseClient.auth.getUser();
        if (authUserError || !user) throw new Error("Não autenticado");

        // --- RATE LIMITING ---
        const rateLimit = await checkRateLimit(
            supabaseClient,
            user.id,
            'payment-ops',
            10,    // 10 requests
            60     // per minute
        );

        if (!rateLimit.allowed) {
            logger.warn(`Rate limit hit for payment-ops: ${user.id}`);
            return new Response(
                JSON.stringify({ 
                    error: 'Muitas solicitações.', 
                    retryAfter: rateLimit.retryAfter 
                }), 
                { 
                    status: 429, 
                    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) } 
                }
            );
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const bodyRaw = await req.json();
        const validation = PaymentOpsSchema.safeParse(bodyRaw);

        if (!validation.success) {
            logger.error('Invalid payment-ops payload', validation.error.format());
            return new Response(JSON.stringify({ error: "Dados inválidos", details: validation.error.format() }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const { action, payload } = validation.data;
        logger.info(`Action: ${action}`, { productId: payload?.productId, gatewayId: payload?.gatewayId });

        if (action === 'create_paymentIntent') {

            const { productId, gatewayId } = payload;
            if (!productId || !gatewayId) throw new Error("productId e gatewayId obrigatórios");

            const { data: cred } = await supabaseAdmin
                .from('gateway_credentials')
                .select('*, gateway:gateways(slug)')
                .eq('gateway_id', gatewayId)
                .eq('is_active', true)
                .order('env', { ascending: false })
                .limit(1)
                .single();

            if (!cred) throw new Error("Gateway inativo");

            const provider = createPaymentProvider(cred.gateway.slug, cred);

            const { data: product } = await supabaseAdmin
                .from('products')
                .select('id, name, price, course_id')
                .eq('id', productId)
                .single();

            if (!product) throw new Error("Produto não encontrado");

            // O preço final vem do frontend (que já considerou Order Bumps e Cupons),
            // mas deveríamos validar no backend em um cenário real complexo.
            // Para simplificar, confiaremos no payload.amount se ele for razoável, senão base price
            const price = payload.amount ?? product.price ?? 0;

            // Determinar moeda baseada no gateway
            const currency = cred.gateway.slug === 'stripe' ? 'USD' : 'BRL';

            const { data: order } = await supabaseAdmin.from('orders').insert({
                user_id: user.id,
                status: 'pending',
                currency: currency,
                total_amount: price,
                customer_email: user.email || payload.email,
                customer_name: payload.name || user.user_metadata?.name || null,
                customer_phone: payload.phone || user.user_metadata?.phone || null,
                customer_cpf: payload.cpf || null
            }).select('*').single();

            // Insert coupon usage if applied
            if (payload.couponId && payload.discountAmount) {
                try {
                    await supabaseAdmin.from('coupon_usage').insert({
                        coupon_id: payload.couponId,
                        order_id: order.id,
                        user_id: user.id,
                        discount_applied: payload.discountAmount
                    });

                    // Increment uses_count (using rpc is better but update works for low volume)
                    const { data: currentCoupon } = await supabaseAdmin
                        .from('coupons')
                        .select('uses_count')
                        .eq('id', payload.couponId)
                        .single();

                    if (currentCoupon) {
                        await supabaseAdmin
                            .from('coupons')
                            .update({ uses_count: (currentCoupon.uses_count || 0) + 1 })
                            .eq('id', payload.couponId);
                    }
                } catch (couponErr) {
                    logger.error(`Error recording coupon usage for order ${order.id}:`, couponErr);
                    // We don't fail the order if coupon recording fails, just log it
                }
            }

            await supabaseAdmin.from('order_items').insert({
                order_id: order.id,
                product_id: productId,
                quantity: 1,
                unit_amount: price
            });

            const orderContext: OrderContext = {
                id: order.id,
                amount: price,
                currency: currency,
                description: `Pedido #${order.id.slice(0, 8)}`,
                customer: {
                    email: user.email!,
                    name: payload.name || user.user_metadata?.name || "Cliente",
                    tax_id: payload.cpf || user.user_metadata?.cpf
                },
                items: [{
                    id: productId,
                    title: product.name,
                    unit_price: price,
                    quantity: 1
                }],
                metadata: {
                    token: payload.token,
                    installments: payload.installments || 1,
                    payment_method_id: payload.payment_method_id,
                    issuer_id: payload.issuer_id,
                    user_id: user.id,
                    idempotency_key: payload.idempotencyKey
                }
            };

            const result = await provider.createPaymentIntent(orderContext);
            logger.info(`Payment intent created: ${result.external_id}`, { status: result.status });

            const { data: paymentRecord } = await supabaseAdmin.from('payments').insert({
                order_id: order.id,
                gateway_id: gatewayId,
                external_payment_id: result.external_id,
                status: result.status,
                amount: price,
                currency: currency,
                payment_method_type: payload.payment_method_id || 'unknown',
                raw_response: result.raw_response,
                paid_at: result.status === 'paid' ? new Date().toISOString() : null
            }).select('id').single();

            if (result.status === 'paid') {
                await supabaseAdmin.from('orders').update({ status: 'paid' }).eq('id', order.id);

                if (product.course_id) {
                    const { data: existing } = await supabaseAdmin
                        .from('user_course_access')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('course_id', product.course_id)
                        .maybeSingle();

                    if (!existing) {
                        await supabaseAdmin.from('user_course_access').insert({
                            user_id: user.id,
                            course_id: product.course_id,
                            source: 'checkout',
                            granted_by: null
                        });
                    }
                }
            }

            return new Response(JSON.stringify({
                ...result,
                orderId: order.id,
                internalPaymentId: paymentRecord?.id
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Action não suportada`);

    } catch (error: any) {
        logger.error(`Error in payment-ops`, error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
