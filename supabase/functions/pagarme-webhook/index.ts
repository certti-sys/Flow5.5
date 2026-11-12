// Webhook do Pagar.me — confirma pagamentos (PIX, boleto e cartão)
//
// Pagar.me envia POSTs com { type, data } (API v5). NUNCA confiamos no corpo:
// reconsultamos GET /charges/{id} com a secret key antes de alterar status.
//
// Assinatura: X-Hub-Signature = HMAC-SHA1 hex do corpo bruto, usando a secret
// key (ou o webhook_secret, se configurado). Aceita prefixo "sha1=".
//
// IMPORTANTE: esta função roda com `verify_jwt = false` (ver config.toml).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InternalStatus = "pending" | "paid" | "failed";

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

async function hmacSha1Hex(secret: string, payload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-1" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

async function signatureMatches(header: string, payload: string, secrets: string[]): Promise<boolean> {
    let received = header.trim().toLowerCase();
    if (received.startsWith("sha1=")) received = received.slice(5).trim();

    for (const secret of secrets) {
        if (!secret) continue;
        const expected = await hmacSha1Hex(secret, payload);
        if (timingSafeEqual(expected, received)) return true;
    }
    return false;
}

function mapChargeStatus(charge: any): InternalStatus {
    const status = String(charge?.status || "").toLowerCase();
    if (status === "paid") return "paid";
    if (["refunded", "partial_refunded", "chargedback", "failed", "canceled", "cancelled"].includes(status)) {
        return "failed";
    }

    const txStatus = String(charge?.last_transaction?.status || "").toLowerCase();
    if (["captured", "paid"].includes(txStatus)) return "paid";
    if (["failed", "not_authorized", "voided", "refused"].includes(txStatus)) return "failed";

    return "pending";
}

/** Extrai o id da cobrança (ch_...) do payload de order/charge. */
function resolveChargeId(payload: any): string | null {
    const type = String(payload?.type ?? "");
    const data = payload?.data;
    if (!data || typeof data !== "object") return null;

    if (typeof data.id === "string" && data.id.startsWith("ch_")) return data.id;
    if (type.startsWith("charge.") && typeof data.id === "string" && data.id) return data.id;

    const first = Array.isArray(data.charges) ? data.charges[0] : null;
    if (typeof first?.id === "string" && first.id.startsWith("ch_")) return first.id;

    return null;
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

    const eventType = String(body?.type ?? "");
    const chargeId = resolveChargeId(body);

    if (!chargeId) {
        // Eventos sem cobrança (customer, checkout, link expirado) são ignorados.
        return json({ ok: true, ignored: "no charge id", event: eventType });
    }

    const { data: gateway } = await admin
        .from("gateways")
        .select("id")
        .eq("slug", "pagarme")
        .maybeSingle();

    if (!gateway) {
        console.error("[pagarme-webhook] gateway pagarme não registrado");
        return json({ ok: false, error: "pagarme gateway missing" });
    }

    // Credencial ativa: 'live' tem prioridade sobre 'test'.
    const { data: credRows, error: credError } = await admin
        .from("gateway_credentials")
        .select("id, env, secret_key, webhook_secret")
        .eq("gateway_id", gateway.id)
        .eq("is_active", true)
        .order("env", { ascending: true }) // 'live' < 'test'
        .limit(2);

    const cred = credRows?.find((c: any) => c.env === "live") ?? credRows?.[0];
    const secretKey: string | undefined = cred?.secret_key ?? undefined;

    if (credError || !secretKey) {
        console.error("[pagarme-webhook] credenciais ausentes/erro", credError);
        return json({ ok: false, error: "pagarme credentials not configured" });
    }

    // Assinatura: obrigatória se webhook_secret estiver configurado; caso
    // contrário validamos a secret key e seguimos para a reconsulta.
    const secrets = [cred?.webhook_secret, secretKey, Deno.env.get("PAGARME_WEBHOOK_SECRET")]
        .filter((s): s is string => typeof s === "string" && s.trim() !== "");
    const signatureHeader = req.headers.get("x-hub-signature") ?? "";

    if (signatureHeader) {
        if (!(await signatureMatches(signatureHeader, rawBody, secrets))) {
            console.error("[pagarme-webhook] assinatura inválida", { chargeId });
            return json({ ok: false, error: "invalid signature" }, 401);
        }
    } else if (cred?.webhook_secret) {
        console.error("[pagarme-webhook] assinatura ausente", { chargeId });
        return json({ ok: false, error: "missing signature" }, 401);
    } else {
        console.warn("[pagarme-webhook] sem X-Hub-Signature — validando pela reconsulta");
    }

    // Reconsulta autoritativa.
    const baseUrl = cred?.env === "test"
        ? "https://sdx-api.pagar.me/core/v5"
        : "https://api.pagar.me/core/v5";

    let charge: any;
    try {
        const res = await fetch(`${baseUrl}/charges/${chargeId}`, {
            headers: {
                Authorization: `Basic ${btoa(`${secretKey}:`)}`,
                Accept: "application/json",
                "User-Agent": "Flow55-Webhook/1.0",
            },
        });
        if (!res.ok) {
            const text = await res.text();
            console.error("[pagarme-webhook] falha ao consultar cobrança", {
                chargeId,
                status: res.status,
                body: text.slice(0, 500),
            });
            return json({ ok: false, error: "charge lookup failed" });
        }
        charge = await res.json();
    } catch (err) {
        console.error("[pagarme-webhook] erro de rede ao consultar cobrança", err);
        return json({ ok: false, error: "charge lookup error" });
    }

    const chargeStatus = String(charge?.status ?? "").toLowerCase();
    const internalStatus = mapChargeStatus(charge);
    const isRefund = ["refunded", "chargedback"].includes(chargeStatus)
        || eventType.includes("refund")
        || eventType.includes("chargedback");

    const data = body?.data ?? {};
    const paymentLinkId = String(
        data?.payment_link_id ?? data?.payment_link?.id ?? "",
    );

    // -------------------------------------------------------------------------
    // Vínculo com o pedido
    // -------------------------------------------------------------------------
    let orderId: string | undefined;

    const { data: paymentByCharge } = await admin
        .from("payments")
        .select("id, order_id")
        .eq("external_payment_id", chargeId)
        .maybeSingle();
    orderId = paymentByCharge?.order_id ?? undefined;

    if (!orderId && paymentLinkId) {
        const { data: linkPayment } = await admin
            .from("payments")
            .select("id, order_id")
            .eq("external_payment_id", `paymentlink:${paymentLinkId}`)
            .maybeSingle();
        orderId = linkPayment?.order_id ?? undefined;
    }

    if (!orderId) {
        // Links de cartão guardam o id do pedido em order_code → data.code.
        const code = typeof data?.code === "string" ? data.code : "";
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidLike.test(code)) {
            const { data: order } = await admin
                .from("orders")
                .select("id")
                .eq("id", code)
                .maybeSingle();
            orderId = order?.id ?? undefined;
        }
    }

    if (!orderId) {
        const externalIds = [String(data?.id ?? ""), paymentLinkId ? `paymentlink:${paymentLinkId}` : ""]
            .filter(Boolean);
        for (const externalId of externalIds) {
            const { data: order } = await admin
                .from("orders")
                .select("id")
                .eq("external_id", externalId)
                .maybeSingle();
            if (order?.id) {
                orderId = order.id;
                break;
            }
        }
    }

    if (!orderId) {
        console.error("[pagarme-webhook] pedido não encontrado", { chargeId, eventType });
        return json({ ok: true, ignored: "order not found" });
    }

    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError || !order) {
        console.error("[pagarme-webhook] erro ao buscar pedido", { orderId, orderError });
        return json({ ok: true, ignored: "order not found" });
    }

    // Idempotência.
    if (order.status === "paid" && internalStatus === "paid") {
        return json({ ok: true, ignored: "already paid" });
    }
    if (order.status === "failed" && internalStatus === "failed") {
        return json({ ok: true, ignored: "already failed" });
    }

    // Nunca rebaixa pedido pago, exceto em estorno/chargeback.
    if (order.status === "paid" && internalStatus === "pending") {
        return json({ ok: true, ignored: "paid order, pending event" });
    }
    if (order.status === "paid" && internalStatus === "failed" && !isRefund) {
        return json({ ok: true, ignored: "paid order, non-refund failure event" });
    }

    const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
    const orderUpdate: Record<string, any> = {
        status: internalStatus,
        external_id: chargeId,
    };
    if (paidAt) orderUpdate.paid_at = paidAt;
    if (internalStatus === "failed") {
        orderUpdate.error_message = isRefund ? "Pagamento estornado" : (chargeStatus || eventType);
    }

    const { error: updateError } = await admin
        .from("orders")
        .update(orderUpdate)
        .eq("id", order.id);

    if (updateError) {
        console.error("[pagarme-webhook] erro ao atualizar pedido", updateError);
        return json({ ok: false, error: "order update failed" }, 500);
    }

    // Atualiza o registro em payments — inclusive o link de cartão, trocando o
    // external_payment_id para o id da cobrança real.
    let paymentRowId = paymentByCharge?.id ?? undefined;
    if (!paymentRowId) {
        const { data: linkPayment } = await admin
            .from("payments")
            .select("id")
            .eq("order_id", order.id)
            .like("external_payment_id", "paymentlink:%")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
        paymentRowId = linkPayment?.id ?? undefined;
    }

    if (paymentRowId) {
        await admin
            .from("payments")
            .update({
                external_payment_id: chargeId,
                status: internalStatus,
                paid_at: paidAt,
                error_message: internalStatus === "failed"
                    ? (isRefund ? "Pagamento estornado" : chargeStatus)
                    : null,
            })
            .eq("id", paymentRowId);
    } else {
        await admin.from("payments").insert({
            order_id: order.id,
            gateway_id: gateway.id,
            external_payment_id: chargeId,
            status: internalStatus,
            amount: Number.isFinite(charge?.amount) ? charge.amount : 0,
            currency: String(charge?.currency ?? "BRL").toUpperCase(),
            payment_method_type: charge?.payment_method ?? "unknown",
            raw_response: charge ?? null,
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
                console.error("[pagarme-webhook] erro ao liberar acesso", { courseId, error });
            }
        }
    }

    // Estorno/chargeback: revoga o acesso se não houver outra compra paga.
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
        chargeStatus,
        status: internalStatus,
    });
});
