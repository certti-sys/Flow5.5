// TIPO: Definições core para o sistema de pagamentos
// Local: supabase/functions/_shared/payment-types.ts

export interface PaymentProvider {
    createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult>;
    createSubscription(subscription: SubscriptionContext): Promise<SubscriptionResult>;
    validateWebhook(request: Request, secret: string): Promise<WebhookEventResult>;
    parseWebhook(body: any): ParsedWebhookEvent;
}

export type GatewaySlug = 'mercadopago' | 'stripe' | 'asaas';

export interface OrderContext {
    id: string; // Order ID interno
    amount: number; // Centavos
    currency: string;
    description: string;
    customer: {
        email: string;
        name: string;
        tax_id?: string; // CPF
    };
    items: Array<{
        id: string;
        title: string;
        unit_price: number;
        quantity: number;
    }>;
    metadata?: Record<string, any>;
}

export interface SubscriptionContext {
    id: string;
    email: string;
    price_id: string;
    gateway_price_id?: string; // ID do plano no gateway (se existir)
}

export interface PaymentIntentResult {
    external_id: string;
    status: 'pending' | 'paid' | 'failed';
    client_secret?: string; // Para Stripe/MP Brick
    ticket_url?: string; // Boleto/Pix
    qr_code?: string; // Pix
    raw_response: any;
}

export interface SubscriptionResult {
    external_id: string;
    status: string;
    raw_response: any;
}

export interface WebhookEventResult {
    isValid: boolean;
    event_type?: string;
}

export interface ParsedWebhookEvent {
    external_event_id: string;
    event_type: string;
    resource_id?: string; // ID do pagamento/assinatura no gateway
    status?: string; // Novo status
    metadata?: any;
}
