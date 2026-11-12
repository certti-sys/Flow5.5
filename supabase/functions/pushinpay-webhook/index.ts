// Webhook do PushinPay — confirma pagamentos PIX
//
// O PushinPay envia POSTs com o corpo { id, value, status, end_to_end_id }.
// NUNCA confiamos no corpo: reconsultamos GET /transactions/{id} com o token
// da conta antes de alterar qualquer status.
//
// Se `webhook_secret` estiver configurado, exigimos o header
// `X-Webhook-Signature: sha256=<hmac-sha256 do corpo>`.
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

async function hmacHex(secret: string, payload: string): Promise<string> {
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

function mapStatus(status: string): InternalStatus {
    const s = (status || "").toLowerCase();
    if (s === "paid") return "paid";
    if (s === "canceled" || s === "cancelled" || s === "expired") return "failed";
    return "pending";
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

    const transactionId = (body?.id ?? "").toString();
    if (!transactionId) {
        // Eventos sem transação (ex.: teste de webhook do painel) são ignorados.
        return json({ ok: true, ignored: "no transaction id" });
    }

    const { data: gateway } = await admin
        .from("gateways")
        .select("id")
        .eq("slug", "pushinpay")
        .maybeSingle();

    if (!gateway) {
        console.error("[pushinpay-webhook] gateway pushinpay não registrado");
        return json({ ok: false, error: "pushinpay gateway missing" });
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
    const apiToken: string | undefined = cred?.secret_key ?? undefined;

    if (credError || !apiToken) {
        console.error("[pushinpay-webhook] credenciais ausentes/erro", credError);
        return json({ ok: false, error: "pushinpay credentials not configured" });
    }

    // Assinatura opcional do corpo (HMAC-SHA256).
    const secret = (cred?.webhook_secret || Deno.env.get("PUSHINPAY_WEBHOOK_SECRET") || "").trim();
    if (secret) {
        const received = req.headers.get("x-webhook-signature")
            ?? req.headers.get("x-signature")
            ?? "";
        const expected = `sha256=${await hmacHex(secret, rawBody)}`;
        if (!timingSafeEqual(received, expected)) {
            console.error("[pushinpay-webhook] assinatura inválida", { transactionId });
            return json({ ok: false, error: "invalid signature" }, 401);
        }
    } else {
        console.warn("[pushinpay-webhook] webhook_secret não configurado — assinatura não validada");
    }

    // Reconsulta autoritativa.
    const baseUrl = cred?.env === "test"
        ? "https://api-sandbox.pushinpay.com.br/api"
        : "https://api.pushinpay.com.br/api";

    let transaction: any;
    try {
        const res = await fetch(`${baseUrl}/transactions/${transactionId}`, {
            headers: {
                Authorization: `Bearer ${apiToken}`,
                Accept: "application/json",
            },
        });
        if (!res.ok) {
            const text = await res.text();
            console.error("[pushinpay-webhook] falha ao consultar transação", {
                transactionId,
                status: res.status,
                body: text.slice(0, 500),
            });
            return json({ ok: false, error: "transaction lookup failed" });
        }
        transaction = await res.json();
    } catch (err) {
        console.error("[pushinpay-webhook] erro de rede ao consultar transação", err);
        return json({ ok: false, error: "transaction lookup error" });
    }

    const pushinStatus = String(transaction?.status ?? body?.status ?? "").toLowerCase();
    const internalStatus = mapStatus(pushinStatus);
    const externalPaymentId = String(transaction?.id ?? transactionId);

    // PushinPay não guarda external_reference: o vínculo está em payments.
    const { data: paymentRow } = await admin
        .from("payments")
        .select("id, order_id")
        .eq("external_payment_id", externalPaymentId)
        .maybeSingle();

    let orderId: string | undefined = paymentRow?.order_id ?? undefined;

    if (!orderId) {
        const { data: order } = await admin
            .from("orders")
            .select("id")
            .eq("external_id", externalPaymentId)
            .maybeSingle();
        orderId = order?.id ?? undefined;
    }

    if (!orderId) {
        console.error("[pushinpay-webhook] pedido não encontrado", { transactionId });
        return json({ ok: true, ignored: "order not found" });
    }

    const { data: order, error: orderError } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError || !order) {
        console.error("[pushinpay-webhook] erro ao buscar pedido", { orderId, orderError });
        return json({ ok: true, ignored: "order not found" });
    }

    // Idempotência.
    if (order.status === "paid" && internalStatus === "paid") {
        return json({ ok: true, ignored: "already paid" });
    }
    if (order.status === "failed" && internalStatus === "failed") {
        return json({ ok: true, ignored: "already failed" });
    }

    // Nunca rebaixa pedido pago com eventos tardios (pending/canceled).
    if (order.status === "paid" && internalStatus === "pending") {
        return json({ ok: true, ignored: "paid order, pending event" });
    }
    if (order.status === "paid" && internalStatus === "failed") {
        return json({ ok: true, ignored: "paid order, non-refund event" });
    }

    const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
    const orderUpdate: Record<string, any> = {
        status: internalStatus,
        external_id: externalPaymentId,
    };
    if (paidAt) orderUpdate.paid_at = paidAt;
    if (internalStatus === "failed") {
        orderUpdate.error_message = pushinStatus || "Cobrança PIX cancelada";
    }

    const { error: updateError } = await admin
        .from("orders")
        .update(orderUpdate)
        .eq("id", order.id);

    if (updateError) {
        console.error("[pushinpay-webhook] erro ao atualizar pedido", updateError);
        return json({ ok: false, error: "order update failed" }, 500);
    }

    const amountCents = Number.isFinite(transaction?.value)
        ? Number(transaction.value)
        : Number(body?.value ?? 0);

    if (paymentRow?.id) {
        await admin
            .from("payments")
            .update({
                status: internalStatus,
                paid_at: paidAt,
                error_message: internalStatus === "failed" ? pushinStatus : null,
            })
            .eq("id", paymentRow.id);
    } else {
        await admin.from("payments").insert({
            order_id: order.id,
            gateway_id: gateway.id,
            external_payment_id: externalPaymentId,
            status: internalStatus,
            amount: amountCents,
            currency: "BRL",
            payment_method_type: "pix",
            paid_at: paidAt,
            raw_response: transaction ?? null,
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
                console.error("[pushinpay-webhook] erro ao liberar acesso", { courseId, error });
            }
        }
    }

    return json({
        ok: true,
        orderId: order.id,
        pushinStatus,
        status: internalStatus,
    });
});
