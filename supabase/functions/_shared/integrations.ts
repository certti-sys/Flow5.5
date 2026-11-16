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
// Despacho
// ============================================================================

export async function sendIntegrationEvent(
    integration: Integration,
    payload: OrderPayload,
    event: string,
): Promise<SendResult> {
    switch (integration.kind) {
        case "utmify":
            return sendUtmify(integration, payload, event);
        case "pixel_meta":
            return sendMetaCapi(integration, payload, event);
        case "spedy":
            return sendSpedy(integration, payload);
        default:
            logger.warn(`[integrations] kind não implementado: ${integration.kind}`);
            return { outcome: "skip", error: `kind ${integration.kind} sem envio implementado` };
    }
}
