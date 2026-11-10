// Webhook Handler Genérico
// Local: supabase/functions/payment-webhook/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PaymentFactory } from "../_shared/payment-factory.ts";

serve(async (req) => {
    const url = new URL(req.url);
    const gatewaySlug = url.searchParams.get("gateway"); // ?gateway=mercadopago

    if (!gatewaySlug) {
        return new Response("Gateway param required", { status: 400 });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const paymentEnv = Deno.env.get('PAYMENT_ENV') || 'test';

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        // 1. Buscar Informações do Gateway e Configurações (Credential)
        const { data: gateway } = await supabaseAdmin
            .from('gateways')
            .select('id, slug')
            .eq('slug', gatewaySlug)
            .single();

        if (!gateway) return new Response("Gateway not found", { status: 404 });

        const { data: creds } = await supabaseAdmin
            .from('gateway_credentials')
            .select('*')
            .eq('gateway_id', gateway.id)
            .eq('env', paymentEnv)
            .single();

        if (!creds) {
            console.error(`Credenciais não encontradas para webhook ${gatewaySlug} env ${paymentEnv}`);
            return new Response("Config Error", { status: 500 });
        }

        // 2. Instanciar Provider
        const provider = PaymentFactory.create(gatewaySlug, {
            access_token: creds.secret_key,
            public_key: creds.public_key,
            webhook_secret: creds.webhook_secret
        });

        // 3. Validar Assinatura (Segurança)
        const validation = await provider.validateWebhook(req, creds.webhook_secret);
        if (!validation.isValid) {
            return new Response("Invalid Signature", { status: 401 });
        }

        // 4. Ler Corpo e Parsear
        const body = await req.json();
        const parsedEvent = provider.parseWebhook(body);

        console.log(`Webhook Event [${gatewaySlug}]:`, parsedEvent);

        // 5. Idempotência (Verificar se já processamos)
        if (parsedEvent.external_event_id) {
            const { data: existing } = await supabaseAdmin
                .from('webhook_events')
                .select('id')
                .eq('gateway_id', gateway.id)
                .eq('external_event_id', parsedEvent.external_event_id)
                .single();

            if (existing) {
                console.log("Evento duplicado, ignorando.");
                return new Response("Already Processed", { status: 200 });
            }
        }

        // 6. Registrar Evento
        const { data: eventLog, error: logError } = await supabaseAdmin
            .from('webhook_events')
            .insert({
                gateway_id: gateway.id,
                event_type: parsedEvent.event_type,
                external_event_id: parsedEvent.external_event_id,
                payload: body,
                status: 'processing'
            })
            .select()
            .single();

        if (logError) {
            console.error("Erro ao logar webhook:", logError);
            // Continuamos mesmo assim ou falhamos? 
            // Se falhar o log, melhor retornar 500 para gateway tentar de novo
            return new Response("Database Error", { status: 500 });
        }

        // 7. Processar Lógica de Negócio (Atualizar Payments/Orders)
        // Se o evento for de pagamento atualizado...
        if (parsedEvent.resource_id) {
            // Buscar pagamento pelo external_payment_id
            // MercadoPago usa ID numérico longo
            // Stripe usa pi_xxx

            // MVP: Log apenas
            // TODO: Implementar atualização real de status
            // await updatePaymentStatus(supabaseAdmin, parsedEvent.resource_id, parsedEvent.status);
        }

        // 8. Marcar evento como processado
        await supabaseAdmin
            .from('webhook_events')
            .update({ status: 'processed', processed_at: new Date().toISOString() })
            .eq('id', eventLog.id);

        return new Response("OK", { status: 200 });

    } catch (error: any) {
        console.error("Webhook Error:", error);
        return new Response(error.message, { status: 500 });
    }
});
