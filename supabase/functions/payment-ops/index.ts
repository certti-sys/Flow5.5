// Função de Pagamento - Versão Funcional Simplificada
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateCSRF } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "https://esm.sh/zod@3.25.76";

// --- SCHEMAS ---

const PaymentOpsSchema = z.object({
  action: z.enum(['create_paymentIntent', 'check_payment_status', 'test_connection']),
  payload: z.object({
    orderId: z.string().optional(),
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
    address: z.object({
      zip_code: z.string(),
      street_name: z.string(),
      street_number: z.string(),
      neighborhood: z.string(),
      city: z.string(),
      federal_unit: z.string(),
    }).optional(),
    // Usado apenas em test_connection para escolher o ambiente.
    env: z.enum(['test', 'live']).optional(),
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
        phone?: string;
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
    /** Quando o cliente precisa concluir o pagamento numa página do gateway. */
    redirect_url?: string;
    raw_response: any;
}

interface MercadoPagoCredentials {
    accessToken: string;
    /** URL pública que o MP deve chamar quando o status mudar. */
    notificationUrl?: string;
    /** Limite de parcelas configurado no admin. */
    maxInstallments?: number;
}

/** Converte Date para ISO 8601 no horário de Brasília (UTC-3). */
function isoBrazil(date: Date): string {
    const shifted = new Date(date.getTime() - 3 * 60 * 60 * 1000);
    return shifted.toISOString().replace("Z", "-03:00");
}

class MercadoPagoProvider implements PaymentProvider {
    private accessToken: string;
    private notificationUrl?: string;
    private maxInstallments: number;
    private baseUrl = "https://api.mercadopago.com";

    constructor(credentials: MercadoPagoCredentials) {
        this.accessToken = credentials.accessToken;
        this.notificationUrl = credentials.notificationUrl;
        this.maxInstallments = Math.max(1, Number(credentials.maxInstallments) || 1);
    }

    private async request(endpoint: string, method: string, body?: any, idempotencyKey?: string) {
        const headers: Record<string, string> = {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
        };

        if (idempotencyKey) {
            headers["X-Idempotency-Key"] = idempotencyKey;
        }

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        const rawText = await res.text();
        let data: any = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText };
        }

        if (!res.ok) {
            const cause = Array.isArray(data?.cause) ? data.cause[0]?.description : data?.cause;
            const detail = cause || data?.message || res.statusText;
            const error: any = new Error(`Mercado Pago: ${detail}`);
            error.status = res.status;
            error.detail = detail;
            throw error;
        }

        return data;
    }

    /** Testa as credenciais consultando o endpoint de pagamentos. */
    async testConnection(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/v1/payments/search?limit=1`, {
                headers: { "Authorization": `Bearer ${this.accessToken}` },
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        const paymentMethod = order.metadata?.payment_method_id || "pix";
        const isCard = paymentMethod !== "pix" && paymentMethod !== "bolbradesco";
        const isBoleto = paymentMethod === "bolbradesco";
        const idempotencyKey = order.metadata?.idempotency_key || order.id;

        // Documento do pagador — obrigatório e validado (nunca enviar CPF fictício).
        const document = String(order.customer.tax_id || "").replace(/\D/g, "");
        if (document.length !== 11 && document.length !== 14) {
            throw new Error("Mercado Pago: informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
        }

        const nameParts = (order.customer.name || "Cliente").trim().split(/\s+/);
        const firstName = nameParts[0] || "Cliente";
        const lastName = nameParts.slice(1).join(" ") || nameParts[0] || "Cliente";

        const payer: Record<string, any> = {
            email: order.customer.email,
            first_name: firstName,
            last_name: lastName,
            identification: {
                type: document.length === 14 ? "CNPJ" : "CPF",
                number: document,
            },
        };

        // Endereço é exigido pelo Mercado Pago para boleto.
        if (isBoleto) {
            const address = order.metadata?.address;
            if (
                !address?.zip_code ||
                !address?.street_name ||
                !address?.street_number ||
                !address?.neighborhood ||
                !address?.city ||
                !address?.federal_unit
            ) {
                throw new Error("Mercado Pago: endereço completo é obrigatório para boleto.");
            }
            payer.address = {
                zip_code: String(address.zip_code).replace(/\D/g, ""),
                street_name: String(address.street_name),
                street_number: String(address.street_number),
                neighborhood: String(address.neighborhood),
                city: String(address.city),
                federal_unit: String(address.federal_unit).toUpperCase().slice(0, 2),
            };
        }

        const payload: Record<string, any> = {
            transaction_amount: Number((order.amount / 100).toFixed(2)),
            description: order.description,
            payment_method_id: paymentMethod,
            payer,
            external_reference: order.id,
            metadata: {
                order_id: order.id,
                user_id: order.metadata?.user_id,
            },
        };

        if (this.notificationUrl && /^https:\/\//i.test(this.notificationUrl)) {
            payload.notification_url = this.notificationUrl;
        }

        if (isCard) {
            if (!order.metadata?.token) {
                throw new Error("Token obrigatório para pagamentos com cartão");
            }
            const requested = Math.max(1, Number(order.metadata.installments) || 1);
            payload.token = order.metadata.token;
            payload.installments = Math.min(requested, this.maxInstallments);
            if (order.metadata.issuer_id) {
                payload.issuer_id = order.metadata.issuer_id;
            }
        }

        if (paymentMethod === "pix") {
            // QR Code válido por 30 minutos.
            payload.date_of_expiration = isoBrazil(new Date(Date.now() + 30 * 60 * 1000));
        }

        if (isBoleto) {
            // Boleto vence em 3 dias.
            payload.date_of_expiration = isoBrazil(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
        }

        const data = await this.request("/v1/payments", "POST", payload, idempotencyKey);

        let status: "pending" | "paid" | "failed" = "pending";
        if (data.status === "approved" || data.status === "authorized") status = "paid";
        if (["rejected", "cancelled", "refunded", "charged_back"].includes(data.status)) status = "failed";

        return {
            external_id: String(data.id),
            status,
            qr_code: data.point_of_interaction?.transaction_data?.qr_code,
            qr_code_base64: data.point_of_interaction?.transaction_data?.qr_code_base64,
            ticket_url:
                data.point_of_interaction?.transaction_data?.ticket_url ||
                data.transaction_details?.external_resource_url,
            raw_response: data,
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
            case 'requires_capture':
                return 'pending';
            case 'canceled':
                return 'failed';
            default:
                return 'pending';
        }
    }
}

interface PushinPayCredentials {
    apiToken: string;
    /** true => api-sandbox.pushinpay.com.br (credencial de teste). */
    sandbox: boolean;
    /** URL pública que o PushinPay chama a cada mudança de status. */
    webhookUrl?: string;
}

/**
 * PushinPay — PIX apenas.
 * API: POST /pix/cashIn { value (centavos), webhook_url } com Bearer token.
 * O QR volta em `qr_code` (copia-e-cola) e `qr_code_base64` (imagem).
 */
class PushinPayProvider implements PaymentProvider {
    private apiToken: string;
    private baseUrl: string;
    private webhookUrl: string;

    constructor(credentials: PushinPayCredentials) {
        this.apiToken = credentials.apiToken;
        this.baseUrl = credentials.sandbox
            ? "https://api-sandbox.pushinpay.com.br/api"
            : "https://api.pushinpay.com.br/api";
        this.webhookUrl = credentials.webhookUrl || "";
    }

    private async request(endpoint: string, method: string, body?: any) {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                Authorization: `Bearer ${this.apiToken}`,
                Accept: "application/json",
                ...(body ? { "Content-Type": "application/json" } : {}),
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const rawText = await res.text();
        let data: any = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText };
        }

        if (!res.ok) {
            let message = data?.message || res.statusText;
            if (Array.isArray(data?.errors) && data.errors.length > 0) {
                const first = data.errors[0];
                const value = typeof first === "string"
                    ? first
                    : Object.values(first ?? {})[0];
                if (value) message = String(value);
            }
            const error: any = new Error(`PushinPay: ${message}`);
            error.status = res.status;
            throw error;
        }

        return data;
    }

    async testConnection(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/transactions?per_page=1`, {
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    Accept: "application/json",
                },
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        const method = String(order.metadata?.payment_method_id || "pix").toLowerCase();
        if (method !== "pix") {
            throw new Error("PushinPay aceita apenas PIX.");
        }
        if (!this.webhookUrl) {
            throw new Error("URL de webhook do PushinPay ausente.");
        }

        // PushinPay exige valor mínimo de 50 centavos.
        const value = Math.max(50, Math.round(Number(order.amount) || 0));

        const data = await this.request("/pix/cashIn", "POST", {
            value,
            webhook_url: this.webhookUrl,
        });

        if (!data?.id) {
            throw new Error("PushinPay: resposta sem identificador da transação.");
        }

        // Alguns gateways devolvem o data URI completo; a página de obrigado
        // espera apenas o base64.
        const qrCodeBase64 = typeof data.qr_code_base64 === "string"
            ? data.qr_code_base64.replace(/^data:image\/[a-z]+;base64,/, "")
            : undefined;

        return {
            external_id: String(data.id),
            status: "pending",
            qr_code: data.qr_code,
            qr_code_base64: qrCodeBase64,
            raw_response: data,
        };
    }
}

/** Mapeia o status de uma cobrança Pagar.me para o status interno. */
function mapPagarmeChargeStatus(charge: any): "pending" | "paid" | "failed" {
    const status = String(charge?.status || "").toLowerCase();
    if (status === "paid") return "paid";
    if (["refunded", "partial_refunded", "failed", "canceled", "cancelled"].includes(status)) {
        return "failed";
    }

    const txStatus = String(charge?.last_transaction?.status || "").toLowerCase();
    if (["captured", "paid"].includes(txStatus)) return "paid";
    if (["failed", "not_authorized", "voided", "refused"].includes(txStatus)) return "failed";

    return "pending";
}

interface PagarmeCredentials {
    /** Secret key (`sk_test_...` / `sk_live_...`), usada em Basic Auth. */
    secretKey: string;
    /** true => sdx-api.pagar.me (credencial de teste). */
    sandbox: boolean;
    maxInstallments?: number;
    /** URL pública do site, usada no success_url do checkout de cartão. */
    siteUrl?: string;
}

/**
 * Pagar.me v5.
 * - PIX e boleto: POST /orders (transparente), QR/linha retornam na hora.
 * - Cartão: link de pagamento hospedado (POST /paymentlinks), mantendo os
 *   dados do cartão fora do nosso backend (mesmo modelo do Asaas).
 */
class PagarmeProvider implements PaymentProvider {
    private secretKey: string;
    private baseUrl: string;
    private maxInstallments: number;
    private siteUrl: string;

    constructor(credentials: PagarmeCredentials) {
        this.secretKey = credentials.secretKey;
        this.baseUrl = credentials.sandbox
            ? "https://sdx-api.pagar.me/core/v5"
            : "https://api.pagar.me/core/v5";
        this.maxInstallments = Math.min(12, Math.max(1, Number(credentials.maxInstallments) || 1));
        this.siteUrl = (credentials.siteUrl || "").replace(/\/$/, "");
    }

    private headers(extra: Record<string, string> = {}) {
        return {
            Authorization: `Basic ${btoa(`${this.secretKey}:`)}`,
            Accept: "application/json",
            "Content-Type": "application/json",
            "User-Agent": "Flow55-Checkout/1.0",
            ...extra,
        };
    }

    private async request(
        endpoint: string,
        method: string,
        body?: any,
        extraHeaders: Record<string, string> = {},
    ) {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: this.headers(extraHeaders),
            body: body ? JSON.stringify(body) : undefined,
        });

        const rawText = await res.text();
        let data: any = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText };
        }

        if (!res.ok) {
            let message = data?.message || res.statusText;
            const errors = data?.errors;
            if (Array.isArray(errors) && errors.length > 0) {
                const first = errors[0];
                message = typeof first === "string"
                    ? first
                    : (first?.message ?? first?.description ?? JSON.stringify(first));
            }
            const error: any = new Error(`Pagar.me: ${message}`);
            error.status = res.status;
            error.detail = message;
            throw error;
        }

        return data;
    }

    async testConnection(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/charges?size=1`, {
                headers: this.headers(),
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    private normalizePhone(raw: string): { area: string; number: string } | null {
        let digits = String(raw || "").replace(/\D/g, "");
        if (!digits) return null;
        if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
        digits = digits.replace(/^0+/, "");
        if (digits.length < 10) return null;
        if (digits.length > 11) digits = digits.slice(-11);
        if (digits.length === 10) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
        return { area: digits.slice(0, 2), number: digits.slice(2) };
    }

    private buildCustomer(order: OrderContext): Record<string, any> {
        const document = String(order.customer.tax_id || "").replace(/\D/g, "");
        const isCompany = document.length === 14;

        const customer: Record<string, any> = {
            name: (order.customer.name || "Cliente").slice(0, 64),
            email: (order.customer.email || "").slice(0, 64),
            type: isCompany ? "company" : "individual",
            document: document || "00000000000",
            document_type: isCompany ? "CNPJ" : "CPF",
        };

        const phone = this.normalizePhone(order.customer.phone || "");
        customer.phones = phone
            ? {
                mobile_phone: {
                    country_code: "55",
                    area_code: phone.area,
                    number: phone.number,
                },
            }
            : {
                mobile_phone: { country_code: "55", area_code: "11", number: "999999999" },
            };

        const address = order.metadata?.address;
        if (address?.zip_code) {
            const zip = String(address.zip_code).replace(/\D/g, "").slice(0, 8);
            const line1 = [address.street_number, address.street_name, address.neighborhood]
                .filter(Boolean)
                .join(", ");
            if (line1) {
                customer.address = {
                    line_1: line1.slice(0, 256),
                    zip_code: zip,
                    city: String(address.city || "").slice(0, 64),
                    state: String(address.federal_unit || "").toUpperCase().slice(0, 2),
                    country: "BR",
                };
            }
        }

        return customer;
    }

    private async createOrder(
        order: OrderContext,
        payment: Record<string, any>,
        idempotencyKey: string,
    ) {
        const code = `ord_${order.id.replace(/-/g, "").slice(0, 40)}`;

        const data = await this.request(
            "/orders",
            "POST",
            {
                code,
                items: [{
                    amount: Math.max(1, Math.round(order.amount)),
                    description: order.description,
                    quantity: 1,
                    code: order.id,
                }],
                payments: [payment],
                customer: this.buildCustomer(order),
                closed: true,
            },
            { "Idempotency-Key": idempotencyKey.slice(0, 64) },
        );

        const charge = Array.isArray(data?.charges) ? data.charges[0] : null;
        if (!charge?.id) {
            throw new Error("Pagar.me: pedido sem cobrança na resposta.");
        }
        return charge;
    }

    private mapChargeStatus(charge: any): "pending" | "paid" | "failed" {
        return mapPagarmeChargeStatus(charge);
    }

    private async createHostedCardCheckout(order: OrderContext): Promise<PaymentIntentResult> {
        const name = `Pedido ${order.id.slice(0, 8)}`;
        const body: Record<string, any> = {
            type: "order",
            name,
            order_code: order.id,
            expires_in: 60,
            payment_settings: {
                accepted_payment_methods: ["credit_card"],
                credit_card_settings: {
                    operation_type: "auth_and_capture",
                    installments_setup: {
                        max_installments: this.maxInstallments,
                        amount: Math.max(1, Math.round(order.amount)),
                    },
                },
            },
            customer_settings: { customer: this.buildCustomer(order) },
            cart_settings: {
                items: [{
                    name: order.description.slice(0, 100),
                    description: order.description.slice(0, 255),
                    amount: Math.max(1, Math.round(order.amount)),
                    default_quantity: 1,
                }],
            },
        };

        if (this.siteUrl) {
            body.flow_settings = {
                success_url: `${this.siteUrl}/checkout/obrigado/${order.id}?method=card`,
            };
        }

        const link = await this.request(
            "/paymentlinks",
            "POST",
            body,
            { "Idempotency-Key": `cardlink-${order.id}`.slice(0, 64) },
        );

        if (!link?.url) {
            throw new Error("Pagar.me: não foi possível gerar o link de pagamento do cartão.");
        }

        return {
            external_id: `paymentlink:${link.id}`,
            status: "pending",
            redirect_url: link.url,
            raw_response: link,
        };
    }

    private async createPix(order: OrderContext): Promise<PaymentIntentResult> {
        const charge = await this.createOrder(
            order,
            {
                payment_method: "pix",
                amount: Math.max(1, Math.round(order.amount)),
                pix: { expires_in: 86400 },
            },
            `pix-${order.id}`,
        );

        const tx = charge.last_transaction ?? {};
        return {
            external_id: String(charge.id),
            status: this.mapChargeStatus(charge),
            qr_code: tx.qr_code,
            ticket_url: tx.qr_code_url,
            raw_response: charge,
        };
    }

    private async createBoleto(order: OrderContext): Promise<PaymentIntentResult> {
        const dueAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 19);

        const charge = await this.createOrder(
            order,
            {
                payment_method: "boleto",
                amount: Math.max(1, Math.round(order.amount)),
                boleto: {
                    instructions: `Pedido ${order.id}`.slice(0, 255),
                    due_at: dueAt,
                },
            },
            `boleto-${order.id}`,
        );

        const tx = charge.last_transaction ?? {};
        let barcode = "";
        for (const key of ["line", "digitable_line", "barcode", "boleto_barcode"]) {
            if (typeof tx[key] === "string" && tx[key]) {
                barcode = tx[key].replace(/\D/g, "") || tx[key];
                break;
            }
        }
        let pdfUrl = "";
        for (const key of ["pdf", "url", "pdf_url", "boleto_pdf", "boleto_url"]) {
            if (typeof tx[key] === "string" && tx[key].startsWith("http")) {
                pdfUrl = tx[key];
                break;
            }
        }

        return {
            external_id: String(charge.id),
            status: this.mapChargeStatus(charge),
            ticket_url: pdfUrl || undefined,
            raw_response: { ...charge, _barcode: barcode },
        };
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        const method = String(order.metadata?.payment_method_id || "pix").toLowerCase();

        if (method === "credit_card") {
            return this.createHostedCardCheckout(order);
        }
        if (method === "bolbradesco") {
            return this.createBoleto(order);
        }
        return this.createPix(order);
    }
}

/** Mapeia o status de uma Order PayPal (v2) para o status interno. */
function mapPaypalOrderStatus(order: any): "pending" | "paid" | "failed" {
    const status = String(order?.status || "").toUpperCase();
    const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = String(capture?.status || "").toUpperCase();

    if (status === "COMPLETED" || captureStatus === "COMPLETED") return "paid";
    if (["VOIDED", "CANCELLED"].includes(status)) return "failed";
    if (["DECLINED", "FAILED", "REFUNDED", "REVERSED"].includes(captureStatus)) return "failed";

    return "pending";
}

interface PayPalCredentials {
    clientId: string;
    clientSecret: string;
    sandbox: boolean;
    /** URL pública do site, usada no return_url/cancel_url do checkout. */
    siteUrl?: string;
}

/** Cache de access token do PayPal por processo (evita OAuth a cada request). */
const paypalTokenCache = new Map<string, { token: string; expiresAt: number }>();

/**
 * PayPal Orders API v2 (checkout hospedado).
 * Fluxo: criamos a Order, redirecionamos para `approve`, e capturamos no
 * retorno (polling da página de obrigado) ou pelo webhook.
 * Moeda: USD (o PayPal não opera em BRL).
 */
class PayPalProvider implements PaymentProvider {
    private clientId: string;
    private clientSecret: string;
    private baseUrl: string;
    private siteUrl: string;

    constructor(credentials: PayPalCredentials) {
        this.clientId = credentials.clientId;
        this.clientSecret = credentials.clientSecret;
        this.baseUrl = credentials.sandbox
            ? "https://api-m.sandbox.paypal.com"
            : "https://api-m.paypal.com";
        this.siteUrl = (credentials.siteUrl || "").replace(/\/$/, "");
    }

    private async accessToken(): Promise<string> {
        const cacheKey = `${this.baseUrl}:${this.clientId}`;
        const cached = paypalTokenCache.get(cacheKey);
        if (cached && cached.expiresAt > Date.now() + 30_000) {
            return cached.token;
        }

        const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
            method: "POST",
            headers: {
                Authorization: `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body: "grant_type=client_credentials",
        });

        if (!res.ok) {
            const text = await res.text();
            const error: any = new Error(
                "PayPal: falha na autenticação. Verifique Client ID/Secret e o ambiente (sandbox/produção).",
            );
            error.detail = text.slice(0, 300);
            throw error;
        }

        const data = await res.json();
        const token = String(data?.access_token || "");
        if (!token) throw new Error("PayPal: token de acesso vazio.");

        const expiresIn = Number(data?.expires_in) || 300;
        paypalTokenCache.set(cacheKey, {
            token,
            expiresAt: Date.now() + Math.max(60, expiresIn - 60) * 1000,
        });

        return token;
    }

    private async request(
        endpoint: string,
        method: string,
        body?: any,
        extraHeaders: Record<string, string> = {},
    ) {
        const token = await this.accessToken();
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/json",
                ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
                ...extraHeaders,
            },
            body: body !== undefined ? JSON.stringify(body) : undefined,
        });

        const rawText = await res.text();
        let data: any = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText };
        }

        if (!res.ok) {
            const detail = data?.details?.[0]?.description || data?.message || res.statusText;
            const error: any = new Error(`PayPal: ${detail}`);
            error.status = res.status;
            error.detail = detail;
            error.issue = data?.details?.[0]?.issue;
            throw error;
        }

        return data;
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.accessToken();
            return true;
        } catch {
            return false;
        }
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        if (!this.siteUrl) {
            throw new Error("URL pública do site não configurada para o retorno do PayPal.");
        }

        const amount = (Math.max(1, Math.round(order.amount)) / 100).toFixed(2);
        const name = (order.customer.name || "Cliente").trim();
        const [given, ...rest] = name.split(/\s+/);
        const surname = rest.join(" ") || given;

        const body: Record<string, any> = {
            intent: "CAPTURE",
            purchase_units: [{
                reference_id: order.id.slice(0, 256),
                custom_id: order.id.slice(0, 127),
                description: (order.description || `Pedido ${order.id}`).slice(0, 127),
                amount: { currency_code: "USD", value: amount },
            }],
            application_context: {
                brand_name: "Flow5.5",
                locale: "pt-BR",
                shipping_preference: "NO_SHIPPING",
                user_action: "PAY_NOW",
                return_url: `${this.siteUrl}/checkout/obrigado/${order.id}?method=card&paypal=1`,
                cancel_url: `${this.siteUrl}/checkout/obrigado/${order.id}?method=card&status=cancelled`,
            },
        };

        if (order.customer.email) {
            const payer: Record<string, any> = {
                email_address: order.customer.email,
                name: {
                    given_name: given.slice(0, 140),
                    surname: surname.slice(0, 140),
                },
            };
            const phone = String(order.customer.phone || "").replace(/\D/g, "").slice(-14);
            if (phone.length >= 8) {
                payer.phone = {
                    phone_type: "MOBILE",
                    phone_number: { national_number: phone },
                };
            }
            body.payer = payer;
        }

        const data = await this.request(
            "/v2/checkout/orders",
            "POST",
            body,
            { "PayPal-Request-Id": `create-${order.id}`.slice(0, 108) },
        );

        const approveUrl = Array.isArray(data?.links)
            ? data.links.find((l: any) => l?.rel === "approve")?.href
                ?? data.links.find((l: any) => l?.rel === "payer-action")?.href
            : undefined;

        if (!data?.id || !approveUrl) {
            throw new Error("PayPal: não foi possível obter o link de aprovação.");
        }

        return {
            external_id: String(data.id),
            status: "pending",
            redirect_url: approveUrl,
            raw_response: data,
        };
    }

    /**
     * Consulta a Order e, se estiver APROVADA, captura o pagamento.
     * Idempotente: reenvios recebem 422 e caem na releitura da Order.
     */
    async getTransactionStatus(
        paypalOrderId: string,
    ): Promise<"pending" | "paid" | "failed" | null> {
        const id = String(paypalOrderId || "").trim();
        if (!id) return null;

        try {
            let order = await this.request(`/v2/checkout/orders/${id}`, "GET");
            let mapped = mapPaypalOrderStatus(order);

            if (mapped === "pending" && String(order?.status || "").toUpperCase() === "APPROVED") {
                try {
                    const captured = await this.request(
                        `/v2/checkout/orders/${id}/capture`,
                        "POST",
                        {},
                        { "PayPal-Request-Id": `cap-${id}`.slice(0, 108) },
                    );
                    order = captured;
                    mapped = mapPaypalOrderStatus(captured);
                } catch {
                    try {
                        order = await this.request(`/v2/checkout/orders/${id}`, "GET");
                        mapped = mapPaypalOrderStatus(order);
                    } catch {
                        // mantém o status pendente; o webhook confirma depois
                    }
                }
            }

            return mapped;
        } catch {
            return null;
        }
    }
}

interface AsaasCredentials {
    apiKey: string;
    /** true => sandbox (credencial de teste), false => produção. */
    sandbox: boolean;
    maxInstallments?: number;
    /** URL pública do site, usada nos callbacks do checkout hospedado. */
    siteUrl?: string;
}

/** Data no formato YYYY-MM-DD (Asaas só aceita data, sem hora). */
function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

const ASAAS_PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);
const ASAAS_FAILED_STATUSES = new Set([
    "REFUSED",
    "DECLINED",
    "CANCELLED",
    "DELETED",
    "REFUNDED",
    "REFUND_REQUESTED",
    "REFUND_IN_PROGRESS",
    "CHARGEBACK_REQUESTED",
    "CHARGEBACK_DISPUTE",
    "AWAITING_CHARGEBACK_REVERSAL",
]);

class AsaasProvider implements PaymentProvider {
    private apiKey: string;
    private baseUrl: string;
    private maxInstallments: number;
    private siteUrl: string;

    constructor(credentials: AsaasCredentials) {
        this.apiKey = credentials.apiKey;
        this.baseUrl = credentials.sandbox
            ? "https://api-sandbox.asaas.com/v3"
            : "https://api.asaas.com/v3";
        this.maxInstallments = Math.min(12, Math.max(1, Number(credentials.maxInstallments) || 1));
        this.siteUrl = (credentials.siteUrl || "").replace(/\/$/, "");
    }

    private async request(endpoint: string, method: string, body?: any) {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                access_token: this.apiKey,
                "Content-Type": "application/json",
                "User-Agent": "Flow55-Checkout/1.0",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        const rawText = await res.text();
        let data: any = {};
        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { message: rawText };
        }

        if (!res.ok) {
            const firstError = Array.isArray(data?.errors) ? data.errors[0] : null;
            const detail = firstError?.description || data?.message || res.statusText;
            const error: any = new Error(`Asaas: ${detail}`);
            error.status = res.status;
            error.detail = detail;
            throw error;
        }

        return data;
    }

    async testConnection(): Promise<boolean> {
        try {
            const res = await fetch(`${this.baseUrl}/customers?limit=1`, {
                headers: {
                    access_token: this.apiKey,
                    "User-Agent": "Flow55-Checkout/1.0",
                },
            });
            return res.ok;
        } catch {
            return false;
        }
    }

    /** Asaas exige celular com 11 dígitos (DDD + 9 + 8). */
    private normalizePhone(raw: string): string {
        let digits = String(raw || "").replace(/\D/g, "");
        if (!digits) return "";
        if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
        digits = digits.replace(/^0+/, "");
        if (digits.length > 11) digits = digits.slice(-11);
        if (digits.length < 10) return "";
        if (digits.length === 10) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
        return digits;
    }

    /** Reaproveita o cliente pelo CPF/CNPJ; cria um novo se não existir. */
    private async ensureCustomer(order: OrderContext): Promise<string> {
        const document = String(order.customer.tax_id || "").replace(/\D/g, "");
        if (document.length !== 11 && document.length !== 14) {
            throw new Error("Asaas: informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido.");
        }

        try {
            const existing = await this.request(`/customers?cpfCnpj=${document}&limit=1`, "GET");
            const found = Array.isArray(existing?.data) ? existing.data[0] : null;
            if (found?.id) return String(found.id);
        } catch (e: any) {
            // Falha na busca não impede a criação.
            console.warn("[Asaas] busca de cliente falhou:", e?.message);
        }

        const body: Record<string, any> = {
            name: order.customer.name || "Cliente",
            cpfCnpj: document,
            email: order.customer.email,
            externalReference: order.id,
        };

        const phone = this.normalizePhone(order.customer.phone || "");
        if (phone) body.mobilePhone = phone;

        const address = order.metadata?.address;
        if (address?.zip_code) {
            body.postalCode = String(address.zip_code).replace(/\D/g, "").slice(0, 8);
            if (address.street_name) body.address = String(address.street_name);
            if (address.street_number) body.addressNumber = String(address.street_number);
            if (address.neighborhood) body.province = String(address.neighborhood);
            if (address.city) body.city = String(address.city);
            if (address.federal_unit) {
                body.state = String(address.federal_unit).toUpperCase().slice(0, 2);
            }
        }

        const created = await this.request("/customers", "POST", body);
        if (!created?.id) throw new Error("Asaas: resposta sem ID do cliente.");
        return String(created.id);
    }

    private mapStatus(asaasStatus: string): "pending" | "paid" | "failed" {
        const s = (asaasStatus || "").toUpperCase();
        if (ASAAS_PAID_STATUSES.has(s)) return "paid";
        if (ASAAS_FAILED_STATUSES.has(s)) return "failed";
        return "pending";
    }

    /**
     * Cartão NUNCA passa pelo nosso servidor (escopo PCI). Usamos o checkout
     * hospedado do Asaas, com fatura como fallback caso o Checkout não esteja
     * habilitado na conta.
     */
    private async createHostedCheckout(
        order: OrderContext,
        customerId: string,
    ): Promise<PaymentIntentResult> {
        const value = Number((order.amount / 100).toFixed(2));
        const successUrl = `${this.siteUrl}/checkout/obrigado/${order.id}?method=card`;
        const cancelUrl = `${this.siteUrl}/checkout/obrigado/${order.id}?method=card&status=cancelled`;

        // O Asaas exige URLs absolutas nos callbacks. Sem siteUrl conhecida,
        // pulamos o checkout hospedado e usamos a fatura (que não tem callback).
        if (this.siteUrl) {
            try {
                const checkout = await this.request("/checkouts", "POST", {
                    billingTypes: ["CREDIT_CARD"],
                    chargeTypes: ["DETACHED"],
                    minutesToExpire: 60,
                    externalReference: order.id,
                    callback: { successUrl, cancelUrl, expiredUrl: cancelUrl },
                    items: [
                        {
                            name: order.description,
                            description: order.description,
                            quantity: 1,
                            value,
                        },
                    ],
                    customer: customerId,
                    installment: { maxInstallmentCount: this.maxInstallments },
                });

                if (checkout?.link) {
                    return {
                        external_id: `checkout:${checkout.id}`,
                        status: "pending",
                        redirect_url: checkout.link,
                        raw_response: checkout,
                    };
                }
            } catch (e: any) {
                console.warn("[Asaas] checkout hospedado indisponível, usando fatura:", e?.message);
            }
        }

        const invoice = await this.request("/payments", "POST", {
            customer: customerId,
            billingType: "UNDEFINED",
            value,
            dueDate: isoDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
            description: order.description,
            externalReference: order.id,
        });

        if (!invoice?.invoiceUrl) {
            throw new Error("Asaas: não foi possível gerar a página de pagamento.");
        }

        return {
            external_id: String(invoice.id),
            status: "pending",
            redirect_url: invoice.invoiceUrl,
            raw_response: invoice,
        };
    }

    private async buildResult(payment: any, method: string): Promise<PaymentIntentResult> {
        const id = String(payment.id);
        const status = this.mapStatus(payment.status);
        let qrCode: string | undefined;
        let qrCodeBase64: string | undefined;
        let ticketUrl: string | undefined;

        if (method === "pix") {
            // O QR pode levar alguns instantes para ser gerado no Asaas.
            for (let attempt = 0; attempt < 2 && !qrCode; attempt++) {
                try {
                    const qr = await this.request(`/payments/${id}/pixQrCode`, "GET");
                    qrCode = qr?.payload;
                    qrCodeBase64 = qr?.encodedImage;
                } catch (e: any) {
                    console.warn(`[Asaas] QR Code indisponível (tentativa ${attempt + 1}):`, e?.message);
                    if (attempt === 0) await new Promise((r) => setTimeout(r, 1200));
                }
            }
        }

        if (method === "bolbradesco") {
            ticketUrl = payment.bankSlipUrl;
            if (!ticketUrl) {
                try {
                    const fresh = await this.request(`/payments/${id}`, "GET");
                    ticketUrl = fresh?.bankSlipUrl;
                } catch {
                    // segue sem link; a fatura também aparece no painel do Asaas
                }
            }
        }

        return {
            external_id: id,
            status,
            qr_code: qrCode,
            qr_code_base64: qrCodeBase64,
            ticket_url: ticketUrl,
            raw_response: payment,
        };
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        const method = order.metadata?.payment_method_id || "pix";
        const customerId = await this.ensureCustomer(order);

        // Idempotência: se já existe cobrança para este pedido, reaproveita.
        try {
            const existing = await this.request(
                `/payments?externalReference=${encodeURIComponent(order.id)}&limit=1`,
                "GET",
            );
            const found = Array.isArray(existing?.data) ? existing.data[0] : null;
            if (found?.id) {
                return this.buildResult(found, method);
            }
        } catch (e: any) {
            console.warn("[Asaas] busca por cobrança existente falhou:", e?.message);
        }

        if (method === "credit_card") {
            return this.createHostedCheckout(order, customerId);
        }

        const isPix = method === "pix";
        const dueDate = isoDate(
            new Date(Date.now() + (isPix ? 1 : 3) * 24 * 60 * 60 * 1000),
        );

        const payment = await this.request("/payments", "POST", {
            customer: customerId,
            billingType: isPix ? "PIX" : "BOLETO",
            value: Number((order.amount / 100).toFixed(2)),
            dueDate,
            description: order.description,
            externalReference: order.id,
        });

        if (!payment?.id) {
            throw new Error("Asaas: resposta sem identificador do pagamento.");
        }

        return this.buildResult(payment, method);
    }
}

function createPaymentProvider(
    slug: string,
    credentials: any,
    options?: {
        notificationUrl?: string;
        maxInstallments?: number;
        env?: string;
        siteUrl?: string;
    }
): PaymentProvider {
    if (slug === 'mercadopago') {
        const token = credentials.access_token || credentials.secret_key;
        if (!token) throw new Error("Access token do Mercado Pago ausente");
        return new MercadoPagoProvider({
            accessToken: token,
            notificationUrl: options?.notificationUrl,
            maxInstallments: options?.maxInstallments,
        });
    }

    if (slug === 'asaas') {
        const apiKey = credentials.secret_key;
        if (!apiKey) throw new Error("API key do Asaas ausente");
        return new AsaasProvider({
            apiKey,
            sandbox: (options?.env ?? credentials.env) === 'test',
            maxInstallments: options?.maxInstallments,
            siteUrl: options?.siteUrl,
        });
    }

    if (slug === 'stripe') {
        const apiKey = credentials.secret_key;
        if (!apiKey) throw new Error("Secret key do Stripe ausente");
        return new StripeProvider({ apiKey });
    }

    if (slug === 'pushinpay') {
        const apiToken = credentials.secret_key;
        if (!apiToken) throw new Error("API token do PushinPay ausente");
        return new PushinPayProvider({
            apiToken,
            sandbox: (options?.env ?? credentials.env) === 'test',
            webhookUrl: options?.notificationUrl,
        });
    }

    if (slug === 'pagarme') {
        const secretKey = credentials.secret_key;
        if (!secretKey) throw new Error("Secret key do Pagar.me ausente");
        return new PagarmeProvider({
            secretKey,
            sandbox: (options?.env ?? credentials.env) === 'test',
            maxInstallments: options?.maxInstallments,
            siteUrl: options?.siteUrl,
        });
    }

    if (slug === 'paypal') {
        // public_key = Client ID; secret_key = Client Secret.
        const clientId = credentials.public_key || credentials.client_id;
        const clientSecret = credentials.secret_key;
        if (!clientId || !clientSecret) throw new Error("Client ID/Secret do PayPal ausentes");
        return new PayPalProvider({
            clientId,
            clientSecret,
            sandbox: (options?.env ?? credentials.env) === 'test',
            siteUrl: options?.siteUrl,
        });
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

        // Origem pública do site, usada em callbacks de gateways com página
        // hospedada (ex.: checkout de cartão do Asaas).
        const siteUrl = (Deno.env.get('SITE_URL') || req.headers.get('origin') || '')
            .replace(/\/$/, '');

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

            const { data: credRows } = await supabaseAdmin
                .from('gateway_credentials')
                .select('*, gateway:gateways(slug, is_active)')
                .eq('gateway_id', gatewayId)
                .eq('is_active', true)
                .order('env', { ascending: true }) // 'live' antes de 'test'
                .limit(2);

            // Prefere credenciais de produção; cai para teste se for a única configurada.
            const cred = credRows?.find((c: any) => c.env === 'live') ?? credRows?.[0];

            if (!cred) throw new Error("Gateway inativo");

            // O gateway também precisa estar ativo na listagem do admin:
            // desativar ali deve bloquear novas cobranças, não só esconder do checkout.
            if (cred.gateway?.is_active === false) {
                throw new Error("Gateway desativado. Ative-o em Admin → Gateways.");
            }

            // Cada gateway tem sua própria function de webhook. A env
            // MERCADOPAGO_WEBHOOK_URL continua valendo como override apenas do MP.
            const baseSiteUrl = supabaseUrl.replace(/\/$/, '');
            const defaultWebhookUrl = `${baseSiteUrl}/functions/v1/${cred.gateway.slug}-webhook`;
            const notificationUrl = cred.gateway.slug === 'mercadopago'
                ? (Deno.env.get('MERCADOPAGO_WEBHOOK_URL') || defaultWebhookUrl)
                : defaultWebhookUrl;

            const provider = createPaymentProvider(cred.gateway.slug, cred, {
                notificationUrl,
                maxInstallments: cred.max_installments,
                env: cred.env,
                siteUrl,
            });

            const { data: product } = await supabaseAdmin
                .from('products')
                .select('id, name, price, course_id')
                .eq('id', productId)
                .single();

            if (!product) throw new Error("Produto não encontrado");

            // Cálculo server-side do valor esperado (protege contra manipulação de preço no cliente)
            let baseTotal = product.price || 0;
            const itemsToInsert: Array<{
                product_id: string;
                unit_amount: number;
                total_amount: number;
                kind: string;
            }> = [{
                product_id: productId,
                unit_amount: product.price || 0,
                total_amount: product.price || 0,
                kind: 'main'
            }];

            // Validar Order Bumps se houver
            if (payload.orderBumps && payload.orderBumps.length > 0) {
                const { data: bumps } = await supabaseAdmin
                    .from('order_bumps')
                    .select('id, offer_product_id, discount_percent, products:offer_product_id(id, name, price)')
                    .in('id', payload.orderBumps)
                    .eq('is_active', true);

                if (bumps) {
                    for (const bump of bumps) {
                        const bumpProduct: any = bump.products;
                        if (bumpProduct && bumpProduct.price != null) {
                            const discount = bump.discount_percent || 0;
                            const bumpPrice = Math.round(bumpProduct.price * (1 - discount / 100));
                            baseTotal += bumpPrice;
                            itemsToInsert.push({
                                product_id: bumpProduct.id,
                                unit_amount: bumpPrice,
                                total_amount: bumpPrice,
                                kind: 'order_bump'
                            });
                        }
                    }
                }
            }

            // Validar Cupom se houver
            let discountApplied = 0;
            if (payload.couponId) {
                const { data: coupon } = await supabaseAdmin
                    .from('coupons')
                    .select('*')
                    .eq('id', payload.couponId)
                    .eq('is_active', true)
                    .maybeSingle();

                if (coupon) {
                    const now = new Date();
                    const isValidDate = (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
                                        (!coupon.valid_until || new Date(coupon.valid_until) >= now);
                    const hasUses = !coupon.max_uses || (coupon.uses_count || 0) < coupon.max_uses;

                    if (isValidDate && hasUses) {
                        if (coupon.discount_type === 'percent') {
                            discountApplied = Math.round((baseTotal * coupon.discount_value) / 100);
                        } else {
                            discountApplied = Math.round(coupon.discount_value);
                        }
                        baseTotal = Math.max(0, baseTotal - discountApplied);
                    }
                }
            }

            // Se o payload.amount vier muito abaixo do calculado (ex: manipulação), força o valor calculado
            const price = (payload.amount != null && payload.amount >= baseTotal * 0.95)
                ? payload.amount
                : baseTotal;

            // Determinar moeda baseada no gateway. O PayPal não opera em BRL.
            const currency = (cred.gateway.slug === 'stripe' || cred.gateway.slug === 'paypal') ? 'USD' : 'BRL';

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
            if (payload.couponId && (discountApplied > 0 || payload.discountAmount)) {
                try {
                    await supabaseAdmin.from('coupon_usage').insert({
                        coupon_id: payload.couponId,
                        order_id: order.id,
                        user_id: user.id,
                        discount_applied: discountApplied || payload.discountAmount || 0
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

            // Inserir order_items com unit_amount E total_amount
            for (const item of itemsToInsert) {
                await supabaseAdmin.from('order_items').insert({
                    order_id: order.id,
                    product_id: item.product_id,
                    quantity: 1,
                    unit_amount: item.unit_amount,
                    total_amount: item.total_amount,
                    kind: item.kind
                });
            }

            const orderContext: OrderContext = {
                id: order.id,
                amount: price,
                currency: currency,
                description: `Pedido #${order.id.slice(0, 8)}`,
                customer: {
                    email: user.email!,
                    name: payload.name || user.user_metadata?.name || "Cliente",
                    tax_id: payload.cpf || user.user_metadata?.cpf,
                    phone: payload.phone || user.user_metadata?.phone
                },
                items: itemsToInsert.map(it => ({
                    id: it.product_id,
                    title: it.product_id === productId ? product.name : 'Order Bump',
                    unit_price: it.unit_amount,
                    quantity: 1
                })),
                metadata: {
                    token: payload.token,
                    installments: payload.installments || 1,
                    payment_method_id: payload.payment_method_id,
                    issuer_id: payload.issuer_id,
                    user_id: user.id,
                    idempotency_key: payload.idempotencyKey,
                    address: payload.address,
                }
            };

            let result;
            try {
                result = await provider.createPaymentIntent(orderContext);
            } catch (providerError: any) {
                // Sem isso o pedido ficaria "pending" para sempre e o cupom já
                // teria sido consumido, mesmo sem cobrança criada.
                logger.error(`Falha ao criar cobrança no gateway (order ${order.id})`, providerError);
                await supabaseAdmin
                    .from('orders')
                    .update({
                        status: 'failed',
                        error_message: providerError?.detail || providerError?.message || 'Falha ao criar cobrança',
                    })
                    .eq('id', order.id);
                throw providerError;
            }
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

            // Atualizar status e external_id em orders
            const orderUpdate: Record<string, any> = { external_id: result.external_id };
            if (result.status === 'paid') {
                orderUpdate.status = 'paid';
                orderUpdate.paid_at = new Date().toISOString();
            }
            await supabaseAdmin.from('orders').update(orderUpdate).eq('id', order.id);

            if (result.status === 'paid' && product.course_id) {
                const { data: existing } = await supabaseAdmin
                    .from('user_course_access')
                    .select('id')
                    .eq('user_id', user.id)
                    .eq('course_id', product.course_id)
                    .maybeSingle();

                if (!existing) {
                    const { error: accessError } = await supabaseAdmin.from('user_course_access').insert({
                        user_id: user.id,
                        course_id: product.course_id,
                        source: 'checkout',
                        granted_by: null
                    });
                    if (accessError) {
                        logger.error(`Failed to grant course access for order ${order.id}`, accessError);
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

        // --- ACTION: check_payment_status ---
        if (action === 'check_payment_status') {
            const orderId = payload.orderId;
            if (!orderId) throw new Error("orderId obrigatório");

            const { data: order } = await supabaseAdmin
                .from('orders')
                .select('id, status, total_amount, currency, user_id, paid_at')
                .eq('id', orderId)
                .single();

            if (!order) throw new Error("Pedido não encontrado");

            if (order.status === 'paid') {
                return new Response(JSON.stringify({
                    status: 'paid',
                    orderId: order.id,
                    paid_at: order.paid_at
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const { data: payment } = await supabaseAdmin
                .from('payments')
                .select('id, external_payment_id, gateway_id, status, gateway:gateways(slug)')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!payment || !payment.external_payment_id) {
                return new Response(JSON.stringify({
                    status: order.status,
                    orderId: order.id
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            const { data: credRows } = await supabaseAdmin
                .from('gateway_credentials')
                .select('*')
                .eq('gateway_id', payment.gateway_id)
                .eq('is_active', true)
                .order('env', { ascending: true }) // 'live' antes de 'test'
                .limit(2);

            const cred = credRows?.find((c: any) => c.env === 'live') ?? credRows?.[0];

            const gatewaySlug = (payment as any).gateway?.slug;
            let realStatus: 'pending' | 'paid' | 'failed' = payment.status as any;

            if (cred && gatewaySlug === 'mercadopago') {
                const token = cred.access_token || cred.secret_key;
                try {
                    const res = await fetch(`https://api.mercadopago.com/v1/payments/${payment.external_payment_id}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const mpData = await res.json();
                        if (mpData.status === 'approved') realStatus = 'paid';
                        else if (['rejected', 'cancelled'].includes(mpData.status)) realStatus = 'failed';
                    }
                } catch (e) {
                    logger.warn('Failed to query MercadoPago status', e);
                }
            } else if (cred && gatewaySlug === 'stripe') {
                const apiKey = cred.secret_key;
                try {
                    const res = await fetch(`https://api.stripe.com/v1/payment_intents/${payment.external_payment_id}`, {
                        headers: { 'Authorization': `Bearer ${apiKey}` }
                    });
                    if (res.ok) {
                        const stripeData = await res.json();
                        if (stripeData.status === 'succeeded') realStatus = 'paid';
                        else if (stripeData.status === 'canceled') realStatus = 'failed';
                    }
                } catch (e) {
                    logger.warn('Failed to query Stripe status', e);
                }
            } else if (cred && gatewaySlug === 'asaas') {
                // Ids com prefixo "checkout:" são sessões hospedadas, não cobranças.
                if (!payment.external_payment_id.startsWith('checkout:')) {
                    const asaasBase = cred.env === 'test'
                        ? 'https://api-sandbox.asaas.com/v3'
                        : 'https://api.asaas.com/v3';
                    try {
                        const res = await fetch(`${asaasBase}/payments/${payment.external_payment_id}`, {
                            headers: {
                                access_token: cred.secret_key,
                                'User-Agent': 'Flow55-Checkout/1.0',
                            },
                        });
                        if (res.ok) {
                            const asaasData = await res.json();
                            const s = String(asaasData.status || '').toUpperCase();
                            if (ASAAS_PAID_STATUSES.has(s)) realStatus = 'paid';
                            else if (ASAAS_FAILED_STATUSES.has(s)) realStatus = 'failed';
                        }
                    } catch (e) {
                        logger.warn('Failed to query Asaas status', e);
                    }
                }
            } else if (cred && gatewaySlug === 'pushinpay') {
                const pushinBase = cred.env === 'test'
                    ? 'https://api-sandbox.pushinpay.com.br/api'
                    : 'https://api.pushinpay.com.br/api';
                try {
                    const res = await fetch(`${pushinBase}/transactions/${payment.external_payment_id}`, {
                        headers: {
                            Authorization: `Bearer ${cred.secret_key}`,
                            Accept: 'application/json',
                        },
                    });
                    if (res.ok) {
                        const pushinData = await res.json();
                        const s = String(pushinData.status || '').toLowerCase();
                        if (s === 'paid') realStatus = 'paid';
                        else if (s === 'canceled' || s === 'cancelled') realStatus = 'failed';
                    }
                } catch (e) {
                    logger.warn('Failed to query PushinPay status', e);
                }
            } else if (cred && gatewaySlug === 'pagarme') {
                // Ids com prefixo "paymentlink:" são links de cartão, não cobranças.
                if (!payment.external_payment_id.startsWith('paymentlink:')) {
                    const pagarmeBase = cred.env === 'test'
                        ? 'https://sdx-api.pagar.me/core/v5'
                        : 'https://api.pagar.me/core/v5';
                    try {
                        const res = await fetch(`${pagarmeBase}/charges/${payment.external_payment_id}`, {
                            headers: {
                                Authorization: `Basic ${btoa(`${cred.secret_key}:`)}`,
                                Accept: 'application/json',
                                'User-Agent': 'Flow55-Checkout/1.0',
                            },
                        });
                        if (res.ok) {
                            const charge = await res.json();
                            const mapped = mapPagarmeChargeStatus(charge);
                            if (mapped === 'paid') realStatus = 'paid';
                            else if (mapped === 'failed') realStatus = 'failed';
                        }
                    } catch (e) {
                        logger.warn('Failed to query Pagar.me status', e);
                    }
                }
            } else if (cred && gatewaySlug === 'paypal') {
                // O PayPal pode estar APROVADO sem captura: getTransactionStatus
                // captura na hora e devolve o status já consolidado.
                const clientId = cred.public_key || cred.client_id;
                if (clientId && cred.secret_key) {
                    const provider = new PayPalProvider({
                        clientId,
                        clientSecret: cred.secret_key,
                        sandbox: cred.env === 'test',
                    });
                    const mapped = await provider.getTransactionStatus(payment.external_payment_id);
                    if (mapped === 'paid') realStatus = 'paid';
                    else if (mapped === 'failed') realStatus = 'failed';
                }
            }

            if (realStatus === 'failed' && order.status === 'pending') {
                await supabaseAdmin
                    .from('orders')
                    .update({ status: 'failed', error_message: 'Cobrança recusada no gateway' })
                    .eq('id', order.id);
            }

            if (realStatus === 'paid' && order.status !== 'paid') {
                const paidAt = new Date().toISOString();
                await supabaseAdmin.from('orders').update({ status: 'paid', paid_at: paidAt }).eq('id', order.id);
                await supabaseAdmin.from('payments').update({ status: 'paid', paid_at: paidAt }).eq('id', payment.id);

                const { data: items } = await supabaseAdmin
                    .from('order_items')
                    .select('product_id, products:product_id(course_id)')
                    .eq('order_id', order.id);

                if (items) {
                    for (const item of items) {
                        const courseId = (item.products as any)?.course_id;
                        if (courseId) {
                            const { data: existing } = await supabaseAdmin
                                .from('user_course_access')
                                .select('id')
                                .eq('user_id', order.user_id)
                                .eq('course_id', courseId)
                                .maybeSingle();

                            if (!existing) {
                                const { error: accessError } = await supabaseAdmin.from('user_course_access').insert({
                                    user_id: order.user_id,
                                    course_id: courseId,
                                    source: 'checkout',
                                    granted_by: null
                                });
                                if (accessError) {
                                    logger.error(`Failed to grant course access (status check) order ${order.id}`, accessError);
                                }
                            }
                        }
                    }
                }
            }

            return new Response(JSON.stringify({
                status: realStatus,
                orderId: order.id
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // --- ACTION: test_connection ---
        if (action === 'test_connection') {
            const gatewayId = payload.gatewayId;
            if (!gatewayId) throw new Error("gatewayId obrigatório");

            const { data: credRows } = await supabaseAdmin
                .from('gateway_credentials')
                .select('*, gateway:gateways(slug)')
                .eq('gateway_id', gatewayId)
                .order('env', { ascending: true })
                .limit(2);

            const cred = payload.env
                ? credRows?.find((c: any) => c.env === payload.env)
                : (credRows?.find((c: any) => c.env === 'live') ?? credRows?.[0]);
            if (!cred) {
                return new Response(JSON.stringify({
                    ok: false,
                    error: payload.env
                        ? `Nenhuma credencial salva no ambiente "${payload.env}".`
                        : "Nenhuma credencial configurada para este gateway",
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }

            const slug = cred.gateway?.slug;
            let ok = false;
            let detail = "";

            if (slug === 'mercadopago') {
                const token = cred.access_token || cred.secret_key;
                const provider = new MercadoPagoProvider({ accessToken: token });
                ok = await provider.testConnection();
                if (!ok) detail = "Access token rejeitado pelo Mercado Pago.";
            } else if (slug === 'stripe') {
                try {
                    const res = await fetch("https://api.stripe.com/v1/balance", {
                        headers: { Authorization: `Bearer ${cred.secret_key}` },
                    });
                    ok = res.ok;
                    if (!ok) detail = `Stripe respondeu ${res.status}.`;
                } catch (e: any) {
                    detail = e?.message ?? "Falha de rede ao consultar o Stripe.";
                }
            } else if (slug === 'asaas') {
                const provider = new AsaasProvider({
                    apiKey: cred.secret_key,
                    sandbox: cred.env === 'test',
                });
                ok = await provider.testConnection();
                if (!ok) detail = "API key rejeitada pelo Asaas (verifique também o ambiente: sandbox x produção).";
            } else if (slug === 'pushinpay') {
                const provider = new PushinPayProvider({
                    apiToken: cred.secret_key,
                    sandbox: cred.env === 'test',
                });
                ok = await provider.testConnection();
                if (!ok) detail = "Token rejeitado pelo PushinPay (verifique também o ambiente: sandbox x produção).";
            } else if (slug === 'pagarme') {
                const provider = new PagarmeProvider({
                    secretKey: cred.secret_key,
                    sandbox: cred.env === 'test',
                });
                ok = await provider.testConnection();
                if (!ok) detail = "Secret key rejeitada pelo Pagar.me (verifique também o ambiente: teste x produção).";
            } else if (slug === 'paypal') {
                const clientId = cred.public_key || cred.client_id;
                if (!clientId) {
                    detail = "Client ID do PayPal não configurado.";
                } else {
                    const provider = new PayPalProvider({
                        clientId,
                        clientSecret: cred.secret_key,
                        sandbox: cred.env === 'test',
                    });
                    ok = await provider.testConnection();
                    if (!ok) detail = "Client ID/Secret rejeitados pelo PayPal (verifique também o ambiente: sandbox x produção).";
                }
            } else {
                detail = `Gateway '${slug}' não suportado para teste.`;
            }

            return new Response(JSON.stringify({ ok, env: cred.env, gateway: slug, detail }), {
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
