import { logger } from "./logger.ts";

/**
 * Adaptadores de envio das integrações de marketing.
 *
 * Cada serviço tem seu contrato e nenhum deles segue o padrão do outro —
 * UTMfy autentica por header `x-api-token` e recebe valores em reais; Meta CAPI
 * autentica por query string e exige PII com SHA-256; Spedy usa `X-Api-Key` e
 * duas chamadas em sequência. Por isso um arquivo por serviço em vez de uma
 * tabela de "como chamar".
 *
 * Nenhum lança: a fila decide retry a partir do resultado.
 */

export type Integration = {
    id: string;
    kind: string;
    config: Record<string, any>;
    secret: string | null;
};

/**
 * Dados internos da entrega que NÃO podem ir para o `payload`: o mesmo payload
 * é enviado a webhooks do cliente, e aqui ficam segredos (config de SMS do
 * produto, código PIX).
 */
export type DeliveryContext = {
    product_id?: string | null;
    pix_code?: string | null;
    sms?: Record<string, any>;
};

export type OrderPayload = {
    order_id: string;
    status: string;
    currency: string | null;
    amount: number;
    paid_at: string | null;
    external_id: string | null;
    created_at: string;
    payment_method: string | null;
    tracking: Record<string, string>;
    /** IP e user-agent do checkout, gravados pelo `payment-ops`. */
    device?: { ip?: string | null; user_agent?: string | null };
    customer: {
        name: string | null;
        email: string | null;
        phone: string | null;
        document: string | null;
    };
    items: Array<{
        product_id: string;
        product_name: string;
        course_id: string | null;
        kind: string | null;
        amount: number;
    }>;
};

/** `ok` encerra; `retry` volta com backoff; `skip` é definitivo e sem culpa. */
export type Outcome = "ok" | "retry" | "skip";

export type SendResult = {
    outcome: Outcome;
    status?: number | null;
    body?: string | null;
    error?: string | null;
};

const TIMEOUT_MS = 15_000;
const MAX_BODY = 2000;

async function postJson(
    url: string,
    body: unknown,
    headers: Record<string, string> = {},
): Promise<SendResult> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        clearTimeout(timer);

        const text = (await res.text()).slice(0, MAX_BODY);
        if (res.ok) return { outcome: "ok", status: res.status, body: text };

        // 400/401/403/422 não melhoram com repetição: credencial ou payload
        // errado. 429 e 5xx são transitórios.
        const permanent = [400, 401, 403, 404, 422].includes(res.status);
        return {
            outcome: permanent ? "skip" : "retry",
            status: res.status,
            body: text,
            error: `HTTP ${res.status}`,
        };
    } catch (err) {
        return {
            outcome: "retry",
            error: err instanceof Error ? err.message : String(err),
        };
    }
}

// ============================================================================
// UTMfy
// ============================================================================
// Um POST por pedido. Status vem do evento: `waiting_payment` para PIX/boleto
// emitido, `paid` para aprovado, `refunded`, `refused`.

const UTMIFY_ENDPOINT = "https://api.utmify.com.br/api-credentials/orders";

function utmifyStatus(event: string): string | null {
    switch (event) {
        case "pix.generated":
        case "boleto.generated":
            return "waiting_payment";
        case "order.paid":
            return "paid";
        case "order.refunded":
            return "refunded";
        case "order.failed":
            return "refused";
        default:
            return null;
    }
}

function utmifyPaymentMethod(raw: string | null): string {
    const v = (raw || "").toLowerCase();
    if (v.includes("pix")) return "pix";
    if (v.includes("boleto") || v.includes("brad")) return "boleto";
    return "credit_card";
}

/** `YYYY-MM-DD HH:MM:SS` em UTC — formato que a UTMfy espera. */
function utcStamp(iso: string | null): string | null {
    if (!iso) return null;
    return new Date(iso).toISOString().slice(0, 19).replace("T", " ");
}

export async function sendUtmify(
    integration: Integration,
    payload: OrderPayload,
    event: string,
): Promise<SendResult> {
    const token = integration.secret;
    if (!token) return { outcome: "skip", error: "chave de API ausente" };

    const status = utmifyStatus(event);
    if (!status) return { outcome: "skip", error: `evento ${event} sem status UTMfy` };

    // Valores em centavos viram reais; a UTMfy recusa string.
    const totalBrl = payload.amount / 100;
    const tracking = payload.tracking ?? {};

    const body = {
        orderId: payload.external_id || payload.order_id,
        platform: "Flow",
        paymentMethod: utmifyPaymentMethod(payload.payment_method),
        status,
        createdAt: utcStamp(payload.created_at),
        approvedDate: status === "paid" ? utcStamp(payload.paid_at) : null,
        refundedAt: status === "refunded" ? utcStamp(new Date().toISOString()) : null,
        customer: {
            name: payload.customer.name ?? "",
            email: payload.customer.email ?? "",
            phone: (payload.customer.phone ?? "").replace(/\D/g, "") || null,
            document: (payload.customer.document ?? "").replace(/\D/g, "") || null,
            country: "BR",
        },
        products: payload.items
            .filter((i) => i.kind !== "order_bump" || i.amount > 0)
            .map((i) => ({
                id: i.product_id,
                name: i.product_name,
                // Obrigatórios na UTMfy; usamos o próprio produto como plano,
                // porque no Flow um produto não tem plano separado.
                planId: i.product_id,
                planName: i.product_name,
                quantity: 1,
                priceInCents: i.amount,
            })),
        trackingParameters: {
            src: tracking.src ?? null,
            sck: tracking.sck ?? null,
            utm_source: tracking.utm_source ?? null,
            utm_medium: tracking.utm_medium ?? null,
            utm_campaign: tracking.utm_campaign ?? null,
            utm_content: tracking.utm_content ?? null,
            utm_term: tracking.utm_term ?? null,
            fbclid: tracking.fbclid ?? null,
            gclid: tracking.gclid ?? null,
            msclkid: tracking.msclkid ?? null,
        },
        commission: {
            totalPriceInCents: payload.amount,
            gatewayFeeInCents: 0,
            userCommissionInCents: payload.amount,
        },
        isTest: false,
    };

    return postJson(UTMIFY_ENDPOINT, body, { "x-api-token": token });
}

// ============================================================================
// Meta CAPI
// ============================================================================
// Purchase server-side com deduplicação por `event_id` (o mesmo id que o pixel
// do navegador usa, senão a Meta conta a venda duas vezes).

const GRAPH_VERSION = "v21.0";

async function sha256(value: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

export async function sendMetaCapi(
    integration: Integration,
    payload: OrderPayload,
    event: string,
): Promise<SendResult> {
    const pixelId = integration.config?.pixel_id;
    const token = integration.secret;
    if (!pixelId) return { outcome: "skip", error: "pixel_id ausente" };
    if (!token) return { outcome: "skip", error: "access token ausente" };

    const isPurchase = event === "order.paid";
    if (!isPurchase && event !== "order.failed") {
        return { outcome: "skip", error: `evento ${event} não mapeado` };
    }

    const email = (payload.customer.email ?? "").trim().toLowerCase();
    const phone = (payload.customer.phone ?? "").replace(/\D/g, "");
    const name = (payload.customer.name ?? "").trim().toLowerCase();
    const [firstName, ...rest] = name.split(/\s+/).filter(Boolean);

    const userData: Record<string, unknown> = {};
    if (email) userData.em = [await sha256(email)];
    if (phone) userData.ph = [await sha256(`55${phone.replace(/^55/, "")}`)];
    if (firstName) userData.fn = [await sha256(firstName)];
    if (rest.length) userData.ln = [await sha256(rest.join(" "))];
    const doc = (payload.customer.document ?? "").replace(/\D/g, "");
    if (doc) userData.external_id = [await sha256(doc)];

    // Só o que existe: campos vazios fazem a Meta descartar o evento.
    if (Object.keys(userData).length === 0) {
        return { outcome: "skip", error: "sem dados do cliente para atribuição" };
    }

    const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;

    const result = await postJson(url, {
        data: [{
            event_name: isPurchase ? "Purchase" : "Lead",
            event_time: Math.floor(new Date(payload.paid_at || payload.created_at).getTime() / 1000),
            // Dedupe com o pixel do navegador.
            event_id: `order-${payload.order_id}`,
            action_source: "website",
            user_data: userData,
            custom_data: {
                value: payload.amount / 100,
                currency: payload.currency || "BRL",
                order_id: payload.order_id,
                content_ids: payload.items.map((i) => i.product_id),
                contents: payload.items.map((i) => ({
                    id: i.product_id,
                    quantity: 1,
                    item_price: i.amount / 100,
                })),
                num_items: payload.items.length,
            },
        }],
    });

    // A Meta responde 200 com erro no corpo em alguns casos (token de outra
    // conta, pixel inexistente). Não adianta repetir.
    if (result.outcome === "ok" && result.body?.includes('"error"')) {
        return { ...result, outcome: "skip", error: "Meta recusou o evento" };
    }
    return result;
}

// ============================================================================
// Spedy (nota fiscal)
// ============================================================================
// Duas chamadas: cria o pedido, depois emite a nota. O id devolvido pela
// primeira é obrigatório na segunda, então não dá para paralelizar.

const SPEDY_BASE = {
    production: "https://api.spedy.com.br/v1",
    sandbox: "https://sandbox-api.spedy.com.br/v1",
} as const;

export async function sendSpedy(
    integration: Integration,
    payload: OrderPayload,
): Promise<SendResult> {
    const token = integration.secret;
    if (!token) return { outcome: "skip", error: "chave de API ausente" };

    const env = integration.config?.environment === "sandbox" ? "sandbox" : "production";
    const base = SPEDY_BASE[env];
    const headers = { "X-Api-Key": token };

    const doc = (payload.customer.document ?? "").replace(/\D/g, "");
    if (!doc) return { outcome: "skip", error: "CPF/CNPJ ausente" };

    const method = (payload.payment_method ?? "").toLowerCase();
    const paymentMethod = method.includes("pix")
        ? "pix"
        : method.includes("boleto") || method.includes("brad")
        ? "billetBank"
        : "creditCard";

    const created = await postJson(`${base}/orders`, {
        transactionId: payload.order_id,
        customer: {
            name: (payload.customer.name ?? "").slice(0, 80),
            federalTaxNumber: doc,
            email: (payload.customer.email ?? "").slice(0, 50),
            phone: (payload.customer.phone ?? "").replace(/\D/g, "").slice(0, 15),
        },
        amount: payload.amount / 100,
        date: new Date(payload.paid_at || payload.created_at).toISOString(),
        status: "approved",
        paymentMethod,
        items: payload.items.map((i) => ({
            quantity: 1,
            price: i.amount / 100,
            amount: i.amount / 100,
            product: { code: i.product_id, name: i.product_name, price: i.amount / 100 },
        })),
    }, headers);

    if (created.outcome !== "ok") return created;

    let spedyId: string | undefined;
    try {
        spedyId = JSON.parse(created.body || "{}")?.id;
    } catch {
        // Corpo inesperado: o pedido foi criado, então não é retry.
        return { ...created, error: "resposta sem id do pedido" };
    }

    if (!spedyId) return { ...created, error: "Spedy não devolveu id do pedido" };

    const invoice = await postJson(`${base}/orders/${spedyId}/invoices/issue`, {}, headers);
    return invoice.outcome === "ok"
        ? { ...invoice, body: `pedido ${spedyId}; ${invoice.body ?? ""}`.slice(0, MAX_BODY) }
        : { ...invoice, error: `pedido ${spedyId} criado; falha na nota: ${invoice.error}` };
}

// ============================================================================
// IntegraX (SMS)
// ============================================================================
// O token vai na própria URL (`/v1/integration/{token}/send-sms`) e o corpo é
// `{ to: ["55..."], message }`. Só dois eventos têm SMS: o código PIX logo
// depois da cobrança e o acesso logo depois da aprovação.

const INTEGRAX_BASE = "https://sms.aresfun.com/v1/integration";
const SMS_MAX_LENGTH = 160;

/** Mesmo default do sistema de referência quando o produto não configurou SMS. */
const SMS_DEFAULTS: Record<string, string> = {
    pix_generated: "PIX de {nome_produto} ({valor}). Pague: {link_pix}",
    access_delivery: "Ola {nome_cliente}! Seu acesso a {nome_produto}: {link_acesso}",
};

/** `55` + DDD + número, como a IntegraX exige. */
function normalizeBrPhone(raw: string | null | undefined): string | null {
    const digits = (raw ?? "").replace(/\D/g, "");
    if (!digits) return null;
    if (digits.startsWith("55") && digits.length >= 12) return digits;
    if (digits.length >= 10 && digits.length <= 11) return `55${digits}`;
    if (digits.length >= 12 && digits.length <= 13) return digits;
    return null;
}

function renderSms(template: string, variables: Record<string, string>): string {
    let message = template;
    for (const [key, value] of Object.entries(variables)) {
        message = message.split(key).join(value);
    }
    return message.replace(/\s+/g, " ").trim();
}

/** Aceita o mesmo `enabled` tolerante do sistema de referência. */
function smsEnabled(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
    return false;
}

function formatBrl(cents: number): string {
    return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export async function sendIntegrax(
    integration: Integration,
    payload: OrderPayload,
    event: string,
    context: DeliveryContext = {},
): Promise<SendResult> {
    const token = integration.secret?.trim();
    if (!token) return { outcome: "skip", error: "token da API ausente" };

    const isPix = event === "pix.generated";
    const isAccess = event === "order.paid";
    if (!isPix && !isAccess) return { outcome: "skip", error: `evento ${event} sem SMS` };

    const phone = normalizeBrPhone(payload.customer.phone);
    if (!phone) return { outcome: "skip", error: "telefone do cliente inválido" };

    // `checkout_config.sms` do produto; o trigger copia para `context` porque
    // configuração interna não pode vazar no payload de webhook.
    const sms = (context.sms ?? {}) as Record<string, any>;
    const key = isPix ? "pix_generated" : "access_delivery";
    const cfg = typeof sms[key] === "object" && sms[key] ? sms[key] as Record<string, any> : {};
    if (!smsEnabled(cfg.enabled)) return { outcome: "skip", error: `SMS ${key} desligado no produto` };

    const siteUrl = (Deno.env.get("SITE_URL") || "").replace(/\/$/, "");
    const productName = payload.items[0]?.product_name ?? "Produto";
    const customerName = payload.customer.name?.trim() || "Cliente";

    const variables: Record<string, string> = {
        "{nome_cliente}": customerName,
        "{nome_produto}": productName,
        "{valor}": formatBrl(payload.amount),
        "{email_cliente}": payload.customer.email ?? "",
        // A senha temporária só existe no e-mail de boas-vindas; não é
        // recuperável depois, então a variável sai vazia.
        "{senha}": "",
        // Página de obrigado já lê o código PIX via `get_order_pix`, então
        // basta mandar o link.
        "{link_pix}": `${siteUrl}/checkout/obrigado/${payload.order_id}?method=pix`,
        "{link_acesso}": `${siteUrl}/login`,
    };

    const template = (typeof cfg.body_text === "string" && cfg.body_text.trim())
        || SMS_DEFAULTS[key];
    const message = renderSms(template, variables);

    if (!message || message.length > SMS_MAX_LENGTH) {
        return { outcome: "skip", error: `SMS com ${message.length} caracteres (máx. ${SMS_MAX_LENGTH})` };
    }

    const body: Record<string, unknown> = { to: [phone], message };
    const from = Deno.env.get("INTEGRAX_FROM_NUMBER")?.trim();
    if (from) body.from = from;

    return postJson(`${INTEGRAX_BASE}/${encodeURIComponent(token)}/send-sms`, body, {
        Accept: "application/json",
    });
}

/** Envio direto, usado pelo botão "Enviar SMS de teste" do painel. */
export async function sendIntegraxSms(
    integration: Integration,
    phone: string,
    message: string,
): Promise<SendResult> {
    const token = integration.secret?.trim();
    if (!token) return { outcome: "skip", error: "token da API ausente" };

    const normalized = normalizeBrPhone(phone);
    if (!normalized) return { outcome: "skip", error: "telefone inválido (use DDD + número)" };

    const text = message.trim();
    if (!text) return { outcome: "skip", error: "mensagem vazia" };
    if (text.length > SMS_MAX_LENGTH) {
        return { outcome: "skip", error: `mensagem com ${text.length} caracteres (máx. ${SMS_MAX_LENGTH})` };
    }

    const body: Record<string, unknown> = { to: [normalized], message: text };
    const from = Deno.env.get("INTEGRAX_FROM_NUMBER")?.trim();
    if (from) body.from = from;

    return postJson(`${INTEGRAX_BASE}/${encodeURIComponent(token)}/send-sms`, body, {
        Accept: "application/json",
    });
}

// ============================================================================
// Pixel X (postback próprio)
// ============================================================================
// Gateway de conversão do fornecedor: recebe um payload fixo com `token` no
// corpo e um status nativo no lugar do nome do evento.

const PIXEL_X_STATUS: Record<string, string> = {
    pedido_pendente: "waiting_payment",
    pedido_pago: "approved",
    pagamento_recusado: "waiting_payment",
    reembolso: "refund",
    pix_gerado: "billet_pix_generate",
    boleto_gerado: "billet_pix_generate",
    carrinho_abandonado: "abandoned_cart",
    assinatura_criada: "subscribe",
    assinatura_renovada: "subscribe",
    assinatura_cancelada: "canceled",
};

function pixelXSlug(event: string): string | null {
    switch (event) {
        case "order.paid":
            return "pedido_pago";
        case "order.failed":
            return "pagamento_recusado";
        case "order.refunded":
            return "reembolso";
        case "pix.generated":
            return "pix_gerado";
        case "boleto.generated":
            return "boleto_gerado";
        default:
            return null;
    }
}

function pixelXPaymentMethod(raw: string | null): string {
    const v = (raw || "").toLowerCase();
    if (v.includes("pix")) return "pix";
    if (v.includes("boleto") || v.includes("brad")) return "boleto";
    return "credit_card";
}

export async function sendPixelX(
    integration: Integration,
    payload: OrderPayload,
    event: string,
): Promise<SendResult> {
    const url = integration.config?.url;
    const token = integration.secret;
    if (!url) return { outcome: "skip", error: "URL do webhook ausente" };
    if (!token) return { outcome: "skip", error: "token ausente" };

    const slug = pixelXSlug(event);
    if (!slug) return { outcome: "skip", error: `evento ${event} não mapeado na Pixel X` };

    const tracking = payload.tracking ?? {};
    const product = payload.items[0];

    const body: Record<string, unknown> = {
        // Token no corpo, não em header: é o contrato da Pixel X.
        token,
        event: {
            status: PIXEL_X_STATUS[slug] ?? "waiting_payment",
            date: new Date().toISOString().slice(0, 19).replace("T", " "),
        },
        product: {
            id: product?.product_id ?? "",
            name: product?.product_name ?? "",
            value: (payload.amount / 100).toFixed(2),
            currency: payload.currency || "BRL",
            payment_method: pixelXPaymentMethod(payload.payment_method),
            installments: 1,
        },
        lead: {
            name: payload.customer.name ?? "",
            email: payload.customer.email ?? "",
            phone: payload.customer.phone ?? "",
            document: payload.customer.document ?? "",
            location: { country: "BR" },
        },
        device: {
            ip: payload.device?.ip ?? "",
            agent: payload.device?.user_agent ?? "",
        },
        parameter: {
            utm_source: tracking.utm_source ?? "",
            utm_medium: tracking.utm_medium ?? "",
            fbclid: tracking.fbclid ?? "",
            fbp: tracking.fbp ?? "",
            gclid: tracking.gclid ?? "",
        },
    };

    // `recurrence` só faz sentido nos eventos de assinatura; nenhum dos nossos
    // eventos de pedido é assinatura, então fica de fora.

    return postJson(String(url), body);
}

// ============================================================================
// Despacho
// ============================================================================

export async function sendIntegrationEvent(
    integration: Integration,
    payload: OrderPayload,
    event: string,
    context: DeliveryContext = {},
): Promise<SendResult> {
    switch (integration.kind) {
        case "utmify":
            return sendUtmify(integration, payload, event);
        case "pixel_meta":
            return sendMetaCapi(integration, payload, event);
        case "spedy":
            return sendSpedy(integration, payload);
        case "integrax":
            return sendIntegrax(integration, payload, event, context);
        case "pixel_x":
            return sendPixelX(integration, payload, event);
        default:
            logger.warn(`[integrations] kind não implementado: ${integration.kind}`);
            return { outcome: "skip", error: `kind ${integration.kind} sem envio implementado` };
    }
}
