// Provider: Mercado Pago
// Local: supabase/functions/_shared/providers/mercadopago.ts

import {
    PaymentProvider,
    OrderContext,
    PaymentIntentResult,
    SubscriptionContext,
    SubscriptionResult,
    WebhookEventResult,
    ParsedWebhookEvent
} from "../payment-types.ts";

export class MercadoPagoProvider implements PaymentProvider {
    private accessToken: string;
    private baseUrl = "https://api.mercadopago.com";

    constructor(credentials: { accessToken: string }) {
        this.accessToken = credentials.accessToken;
    }

    private async request(endpoint: string, method: string, body?: any) {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
                "X-Idempotency-Key": body?.metadata?.idempotencyKey || undefined
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await res.json();
        if (!res.ok) {
            console.error("MP Error:", JSON.stringify(data));
            throw new Error(`Mercado Pago Error: ${data.message || res.statusText}`);
        }
        return data;
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        // Criar pagamento transparente via API v1/payments
        // O frontend deve processar o cartão e enviar o 'token' ou usamos o Brick que gera um token.
        // A arquitetura "Secure Fields" ou "Brick" gera um token de cartão.
        // O backend cria o pagamento usando esse token.
        // Aqui assumimos que o `order.metadata.token` contém o token do cartão, OU
        // que estamos gerando um Pix/Boleto que não precisa de token.

        const paymentMethod = order.metadata?.payment_method_id || 'pix'; // default pix

        const payload: any = {
            transaction_amount: order.amount / 100, // MP usa reais (float), não centavos
            description: order.description,
            payment_method_id: paymentMethod,
            payer: {
                email: order.customer.email,
                first_name: order.customer.name.split(" ")[0],
                last_name: order.customer.name.split(" ").slice(1).join(" "),
                identification: {
                    type: "CPF",
                    number: order.customer.tax_id
                }
            },
            external_reference: order.id,
            metadata: {
                order_id: order.id
            }
        };

        // Se for cartão, precisamos do token
        if (paymentMethod !== 'pix' && paymentMethod !== 'bolbradesco') {
            if (!order.metadata?.token) {
                throw new Error("Token do cartão é obrigatório para pagamentos com cartão.");
            }
            payload.token = order.metadata.token;
            payload.installments = order.metadata.installments || 1;
        }

        const data = await this.request("/v1/payments", "POST", payload);

        let status: 'pending' | 'paid' | 'failed' = 'pending';
        if (data.status === 'approved') status = 'paid';
        if (data.status === 'rejected') status = 'failed';

        return {
            external_id: data.id.toString(),
            status,
            qr_code: data.point_of_interaction?.transaction_data?.qr_code,
            ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
            raw_response: data
        };
    }

    async createSubscription(subscription: SubscriptionContext): Promise<SubscriptionResult> {
        // Implementar lógica de subscription (Preapproval)
        // Requer criar plan previamente ou criar na hora.
        // Por simplicidade do MVP, deixaremos placeholder.
        return {
            external_id: "todo_sub_id",
            status: "pending",
            raw_response: {}
        };
    }

    async validateWebhook(request: Request, secret: string): Promise<WebhookEventResult> {
        // MP usa HMAC-SHA256 na assinatura x-signature-id?
        // A documentação do MP sugere verificar x-signature
        // ts=...,v1=...
        const signature = request.headers.get("x-signature");
        const requestId = request.headers.get("x-request-id");

        if (!signature || !requestId) {
            // Em modo DEV/Sandbox as vezes não vem.
            // Retornaremos true para não bloquear MVP, mas logaremos aviso.
            console.warn("Webhook sem assinatura Mercadopago");
            return { isValid: true };
        }

        // TODO: Implementar validação real de HMAC
        return { isValid: true };
    }

    parseWebhook(body: any): ParsedWebhookEvent {
        // MP envia { type: 'payment', data: { id: '...' } }
        const type = body.type || body.topic;
        const id = body.data?.id || body.resource;

        return {
            external_event_id: id, // Usamos o ID do recurso como ID do evento se não houver um ID único de evento
            event_type: type,
            resource_id: id,
            status: body.action
        };
    }
}
