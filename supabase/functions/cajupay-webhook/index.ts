// Webhook do CajuPay — confirma pagamentos PIX e de cartão.
//
// A CajuPay envia POSTs no envelope { id, type, data: { object } } assinados
// com HMAC-SHA256. NUNCA confiamos no corpo: reconsultamos o pagamento
// (GET /api/payments/{id}) ou a sessão de checkout
// (GET /api/sdk/v1/checkout/sessions/{id}) antes de alterar qualquer status.
//
// Assinatura (quando `webhook_secret` está configurado):
//   X-CajuPay-Signature: t=<unix>,v1=<hex>
//   HMAC_SHA256(secret, `${t}.${rawBody}`) — janela de 300s.
//
// IMPORTANTE: esta função roda com `verify_jwt = false` (ver config.toml).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyOrderPaid } from "../_shared/notify-order.ts";

type InternalStatus = "pending" | "paid" | "failed";

const CAJUPAY_BASE = "https://api.cajupay.com.br";

const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

function parseSignatureHeader(header: string): { t?: string; v1?: string } {
    const out: { t?: string; v1?: string } = {};
    for (const part of header.split(",")) {
        const [rawKey, ...rest] = part.split("=");
        if (rest.length === 0) continue;
        const key = rawKey.trim().toLowerCase();
        const value = rest.join("=").trim();
        if (key === "t") out.t = value;
        if (key === "v1") out.v1 = value;
    }
    return out;
}

function mapStatus(status: unknown): InternalStatus {
    const s = String(status ?? "").toLowerCase().trim();
    if (!s) return "pending";
    if ([
        "paid", "completed", "complete", "settled", "approved", "confirmed",
        "success", "successful", "succeeded", "captured", "pago", "aprovado",
    ].includes(s)) {
        return "paid";
    }
    if ([
        "cancelled", "canceled", "expired", "failed", "refunded", "rejected",
        "refused", "chargedback",
    ].includes(s)) {
        return "failed";
    }
    return "pending";
}

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function pickString(source: any, keys: string[]): string | undefined {
    for (const key of keys) {
        const value = source?.[key];
        if (typeof value === "string" && value.trim() !== "") return value.trim();
    }
    return undefined;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    let rawBody = "";
    try {
        rawBody = await req.text();
    } catch {
        return json({ ok: false, error: "invalid body" }, 400);
    }

    let body: any = {};
    try {
        body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
        return json({ ok: false, error: "invalid json" }, 400);
    }

    const eventType = String(
        req.headers.get("x-cajupay-event") ?? body?.type ?? "",
    );
    const object = body?.data?.object ?? body?.data ?? body?.object ?? {};

    const sessionId = pickString(object, [
        "checkout_session_id",
        "checkout_sessionId",
        "session_id",
    ]);
    let paymentId = pickString(object, ["payment_id"]);

    // Alguns eventos trazem apenas `id`; só aceitamos UUID para não confundir
    // com ids de sessão/assinatura.
    if (!paymentId && !sessionId) {
        const rawId = pickString(object, ["id"]);
        if (rawId && uuidLike.test(rawId) && eventType.startsWith("pix.")) {
            paymentId = rawId;
        }
    }

    if (!paymentId && !sessionId) {
        // Eventos sem pagamento (ex.: teste do painel) são ignorados.
        return json({ ok: true, ignored: "no payment/session id", event: eventType });
    }

    const { data: gateway } = await admin
        .from("gateways")
        .select("id")
        .eq("slug", "cajupay")
        .maybeSingle();

    if (!gateway) {
        console.error("[cajupay-webhook] gateway cajupay não registrado");
        return json({ ok: false, error: "cajupay gateway missing" });
    }

    // Credencial ativa: 'live' tem prioridade sobre 'test'.
    const { data: credRows, error: credError } = await admin
        .from("gateway_credentials")
        .select("id, env, public_key, secret_key, webhook_secret")
        .eq("gateway_id", gateway.id)
        .eq("is_active", true)
        .order("env", { ascending: true }) // 'live' < 'test'
        .limit(2);

    const cred = credRows?.find((c: any) => c.env === "live") ?? credRows?.[0];
    const publicKey: string | undefined = cred?.public_key ?? undefined;
    const secretKey: string | undefined = cred?.secret_key ?? undefined;

    if (credError || !publicKey || !secretKey) {
        console.error("[cajupay-webhook] credenciais ausentes/erro", credError);
        return json({ ok: false, error: "cajupay credentials not configured" });
    }

    // Assinatura HMAC-SHA256 (t=timestamp,v1=hex).
    const secret = (cred?.webhook_secret || Deno.env.get("CAJUPAY_WEBHOOK_SECRET") || "").trim();
    if (secret) {
        const sigParts = parseSignatureHeader(req.headers.get("x-cajupay-signature") ?? "");
        const timestamp = sigParts.t ?? req.headers.get("x-cajupay-timestamp") ?? "";
        const received = (sigParts.v1 ?? "").toLowerCase();

        if (!received || !timestamp || !/^\d+$/.test(timestamp)) {
            console.error("[cajupay-webhook] assinatura ausente/malformada", { paymentId, sessionId });
            return json({ ok: false, error: "missing signature" }, 401);
        }

        const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
        if (age > 300) {
            console.error("[cajupay-webhook] timestamp fora da janela", { age });
            return json({ ok: false, error: "stale timestamp" }, 401);
        }

        const expected = await hmacSha256Hex(secret, `${timestamp}.${rawBody}`);
        if (!timingSafeEqual(expected, received)) {
            console.error("[cajupay-webhook] assinatura inválida", { paymentId, sessionId });
            return json({ ok: false, error: "invalid signature" }, 401);
        }
    } else {
        console.warn("[cajupay-webhook] webhook_secret não configurado — validando pela reconsulta");
    }

    // -------------------------------------------------------------------------
    // Reconsulta autoritativa
    // -------------------------------------------------------------------------
    const authHeaders = {
        "X-API-Key": publicKey,
        "X-API-Secret": secretKey,
        Accept: "application/json",
        "User-Agent": "Flow55-Webhook/1.0",
    };

    let record: any = null;
    let externalPaymentId = paymentId ? paymentId : `session:${sessionId}`;

    try {
        const endpoint = paymentId
            ? `${CAJUPAY_BASE}/api/payments/${encodeURIComponent(paymentId)}`
            : `${CAJUPAY_BASE}/api/sdk/v1/checkout/sessions/${encodeURIComponent(sessionId!)}`;
        const res = await fetch(endpoint, { headers: authHeaders });
        if (!res.ok) {
            const text = await res.text();
            console.error("[cajupay-webhook] falha na reconsulta", {
                paymentId,
                sessionId,
                status: res.status,
                body: text.slice(0, 500),
            });
            return json({ ok: false, error: "lookup failed" });
        }
        record = await res.json();
    } catch (err) {
        console.error("[cajupay-webhook] erro de rede na reconsulta", err);
        return json({ ok: false, error: "lookup error" });
    }

    const rawStatus = record?.payment_status ?? record?.checkout_status ?? record?.status;
    const internalStatus = mapStatus(rawStatus);
    const isRefund = eventType.includes("refund") || String(rawStatus ?? "").toLowerCase().includes("refund");

    // Em eventos de sessão paga, a própria reconsulta pode trazer o payment_id.
    const resolvedPaymentId = paymentId
        ?? pickString(record, ["payment_id"])
        ?? pickString(record?.payment, ["id"]);
    if (resolvedPaymentId) {
        externalPaymentId = resolvedPaymentId;
    }

    // -------------------------------------------------------------------------
    // Vínculo com o pedido
    // -------------------------------------------------------------------------
    let orderId: string | undefined;
    let paymentRowId: string | undefined;

    const candidateIds = [
        externalPaymentId,
        resolvedPaymentId,
        sessionId ? `session:${sessionId}` : undefined,
        sessionId,
    ].filter((v): v is string => Boolean(v));

    for (const candidate of candidateIds) {
        if (orderId) break;
        const { data: payment } = await admin
            .from("payments")
            .select("id, order_id")
            .eq("external_payment_id", candidate)
            .maybeSingle();
        if (payment?.order_id) {
            orderId = payment.order_id;
            paymentRowId = payment.id;
        }
    }

    if (!orderId) {
        for (const candidate of candidateIds) {
            if (orderId) break;
            const { data: order } = await admin
                .from("orders")
                .select("id")
                .eq("external_id", candidate)
                .maybeSingle();
            orderId = order?.id ?? undefined;
        }
    }

    if (!orderId) {
        // product_ref/customer_ref = order-<uuid> / flow55-order-<uuid>.
        const refs = [
            pickString(object, ["product_ref"]),
            pickString(object, ["customer_ref"]),
            pickString(record, ["product_ref"]),
            pickString(record, ["customer_ref"]),
            pickString(record?.metadata, ["external_id"]),
        ].filter((v): v is string => Boolean(v));

        for (const ref of refs) {
            const match = ref.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
            if (!match) continue;
            const { data: order } = await admin
                .from("orders")
                .select("id")
                .eq("id", match[1])
                .maybeSingle();
            if (order?.id) {
                orderId = order.id;
                break;
            }
        }
    }

    if (!orderId) {
        console.error("[cajupay-webhook] pedido não encontrado", {
            externalPaymentId,
            sessionId,
            eventType,
        });
        return json({ ok: true, ignored: "order not found" });
    }

    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError || !order) {
        console.error("[cajupay-webhook] erro ao buscar pedido", { orderId, orderError });
        return json({ ok: true, ignored: "order not found" });
    }

    // Idempotência.
    if (order.status === "paid" && internalStatus === "paid") {
        return json({ ok: true, ignored: "already paid" });
    }
    if (order.status === "failed" && internalStatus === "failed") {
        return json({ ok: true, ignored: "already failed" });
    }

    // Nunca rebaixa pedido pago, exceto em estorno.
    if (order.status === "paid" && internalStatus === "pending") {
        return json({ ok: true, ignored: "paid order, pending event" });
    }
    if (order.status === "paid" && internalStatus === "failed" && !isRefund) {
        return json({ ok: true, ignored: "paid order, non-refund failure event" });
    }

    const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
    const orderUpdate: Record<string, any> = {
        status: internalStatus,
        external_id: externalPaymentId,
    };
    if (paidAt) orderUpdate.paid_at = paidAt;
    if (internalStatus === "failed") {
        orderUpdate.error_message = isRefund ? "Pagamento estornado" : String(rawStatus || eventType);
    }

    const { error: updateError } = await admin
        .from("orders")
        .update(orderUpdate)
        .eq("id", order.id);

    if (updateError) {
        console.error("[cajupay-webhook] erro ao atualizar pedido", updateError);
        return json({ ok: false, error: "order update failed" }, 500);
    }

    if (internalStatus === "paid") {
        await notifyOrderPaid(admin, order.id);
    }

    const amountCents = Number(
        record?.amount_cents ?? record?.amount ?? object?.amount_cents ?? 0,
    );
    const rawMethod = String(
        record?.payment_method ?? record?.method ?? object?.payment_method ?? object?.method ?? "",
    ).toLowerCase();
    const methodType = rawMethod.includes("pix") || eventType.startsWith("pix.")
        ? "pix"
        : "credit_card";

    if (!paymentRowId) {
        const { data: existing } = await admin
            .from("payments")
            .select("id")
            .eq("order_id", order.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        paymentRowId = existing?.id;
    }

    if (paymentRowId) {
        await admin
            .from("payments")
            .update({
                external_payment_id: externalPaymentId,
                status: internalStatus,
                paid_at: paidAt,
                error_message: internalStatus === "failed" ? String(rawStatus || eventType) : null,
            })
            .eq("id", paymentRowId);
    } else {
        await admin.from("payments").insert({
            order_id: order.id,
            gateway_id: gateway.id,
            external_payment_id: externalPaymentId,
            status: internalStatus,
            amount: Number.isFinite(amountCents) ? amountCents : 0,
            currency: String(record?.currency ?? "BRL").toUpperCase(),
            payment_method_type: methodType,
            raw_response: record ?? null,
            paid_at: paidAt,
        });
    }

    // -------------------------------------------------------------------------
    // Acesso ao curso
    // -------------------------------------------------------------------------
    const { data: items } = await admin
        .from("order_items")
        .select("product_id, products:product_id(course_id)")
        .eq("order_id", order.id);

    const courseIds = new Set<string>();
    for (const item of items ?? []) {
        const courseId = (item.products as any)?.course_id;
        if (courseId) courseIds.add(courseId);
    }

    if (internalStatus === "paid" && order.user_id) {
        for (const courseId of courseIds) {
            const { error } = await admin.from("user_course_access").upsert(
                {
                    user_id: order.user_id,
                    course_id: courseId,
                    source: "checkout",
                    granted_by: null,
                },
                { onConflict: "user_id,course_id", ignoreDuplicates: true },
            );
            if (error) {
                console.error("[cajupay-webhook] erro ao liberar acesso", { courseId, error });
            }
        }
    }

    // Estorno: revoga o acesso se não houver outra compra paga.
    if (internalStatus === "failed" && order.user_id && isRefund) {
        for (const courseId of courseIds) {
            const { data: otherPaid } = await admin
                .from("order_items")
                .select("order_id, orders!inner(id, user_id, status), products!inner(course_id)")
                .eq("products.course_id", courseId)
                .eq("orders.user_id", order.user_id)
                .eq("orders.status", "paid")
                .neq("order_id", order.id)
                .limit(1);

            if (!otherPaid || otherPaid.length === 0) {
                await admin
                    .from("user_course_access")
                    .delete()
                    .eq("user_id", order.user_id)
                    .eq("course_id", courseId)
                    .eq("source", "checkout");
            }
        }
    }

    return json({
        ok: true,
        orderId: order.id,
        event: eventType,
        cajupayStatus: rawStatus,
        status: internalStatus,
    });
});
