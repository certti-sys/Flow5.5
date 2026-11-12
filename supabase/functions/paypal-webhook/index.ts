// Webhook do PayPal — Orders API v2
//
// O PayPal assina o evento nos headers paypal-transmission-*. NUNCA confiamos
// no corpo: primeiro validamos a assinatura em
// POST /v1/notifications/verify-webhook-signature e depois reconsultamos a
// Order em GET /v2/checkout/orders/{id} (capturando quando estiver APPROVED).
//
// webhook_id: coluna `webhook_secret` da credencial ou env PAYPAL_WEBHOOK_ID.
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

interface PaypalOrderStatus {
    status: InternalStatus;
    /** Estorno parcial: não revoga acesso, mas marca o pagamento como reembolsado. */
    partialRefund: boolean;
}

function mapOrder(order: any): PaypalOrderStatus {
    const status = String(order?.status || "").toUpperCase();
    const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = String(capture?.status || "").toUpperCase();

    if (captureStatus === "PARTIALLY_REFUNDED") {
        return { status: "paid", partialRefund: true };
    }
    if (captureStatus === "REFUNDED" || captureStatus === "REVERSED") {
        return { status: "failed", partialRefund: false };
    }
    if (captureStatus === "DECLINED" || captureStatus === "FAILED") {
        return { status: "failed", partialRefund: false };
    }
    if (status === "COMPLETED" || captureStatus === "COMPLETED") {
        return { status: "paid", partialRefund: false };
    }
    if (status === "VOIDED" || status === "CANCELLED") {
        return { status: "failed", partialRefund: false };
    }

    return { status: "pending", partialRefund: false };
}

/** Identifica a Order do PayPal a partir do evento. */
function resolveOrderId(payload: any): string | null {
    const eventType = String(payload?.event_type ?? "");
    const resource = payload?.resource ?? {};

    const related = resource?.supplementary_data?.related_ids?.order_id;
    if (typeof related === "string" && related) return related;

    if (eventType.startsWith("CHECKOUT.ORDER.") && typeof resource?.id === "string" && resource.id) {
        return resource.id;
    }

    return null;
}

/**
 * Eventos de estorno podem vir apenas com o id da captura. O link "up" do
 * recurso aponta para /v2/payments/captures/{id}, de onde recuperamos a Order.
 */
function extractCaptureId(payload: any): string | null {
    const links = payload?.resource?.links;
    if (!Array.isArray(links)) return null;

    for (const link of links) {
        if (link?.rel !== "up" || typeof link?.href !== "string") continue;
        const match = link.href.match(/\/captures\/([^/?#]+)/);
        if (match?.[1]) return match[1];
    }

    return null;
}

async function getAccessToken(
    baseUrl: string,
    clientId: string,
    clientSecret: string,
): Promise<string> {
    const res = await fetch(`${baseUrl}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
        },
        body: "grant_type=client_credentials",
    });

    if (!res.ok) {
        throw new Error(`PayPal OAuth ${res.status}`);
    }

    const data = await res.json();
    const token = String(data?.access_token || "");
    if (!token) throw new Error("PayPal OAuth sem access_token");
    return token;
}

async function paypalRequest(
    baseUrl: string,
    token: string,
    endpoint: string,
    method: string,
    body?: unknown,
) {
    const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
            ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();
    let data: any = {};
    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    return { ok: res.ok, status: res.status, data };
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    let body: any = {};
    try {
        body = await req.json();
    } catch {
        return json({ ok: false, error: "invalid json" }, 400);
    }

    const eventType = String(body?.event_type ?? "");
    let paypalOrderId = resolveOrderId(body);

    const { data: gateway } = await admin
        .from("gateways")
        .select("id")
        .eq("slug", "paypal")
        .maybeSingle();

    if (!gateway) {
        console.error("[paypal-webhook] gateway paypal não registrado");
        return json({ ok: false, error: "paypal gateway missing" });
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
    const clientId: string | undefined = cred?.public_key ?? undefined;
    const clientSecret: string | undefined = cred?.secret_key ?? undefined;

    if (credError || !clientId || !clientSecret) {
        console.error("[paypal-webhook] credenciais ausentes/erro", credError);
        return json({ ok: false, error: "paypal credentials not configured" });
    }

    const webhookId = String(cred?.webhook_secret || Deno.env.get("PAYPAL_WEBHOOK_ID") || "").trim();
    if (!webhookId) {
        console.error("[paypal-webhook] webhook_id não configurado");
        return json({ ok: false, error: "paypal webhook id not configured" }, 401);
    }

    const baseUrl = cred?.env === "test"
        ? "https://api-m.sandbox.paypal.com"
        : "https://api-m.paypal.com";

    let token: string;
    try {
        token = await getAccessToken(baseUrl, clientId, clientSecret);
    } catch (err) {
        console.error("[paypal-webhook] falha no OAuth", err);
        return json({ ok: false, error: "paypal auth failed" }, 500);
    }

    // -------------------------------------------------------------------------
    // Verificação de assinatura (fonte oficial)
    // -------------------------------------------------------------------------
    const verification = await paypalRequest(
        baseUrl,
        token,
        "/v1/notifications/verify-webhook-signature",
        "POST",
        {
            auth_algo: req.headers.get("paypal-auth-algo") ?? "",
            cert_url: req.headers.get("paypal-cert-url") ?? "",
            transmission_id: req.headers.get("paypal-transmission-id") ?? "",
            transmission_sig: req.headers.get("paypal-transmission-sig") ?? "",
            transmission_time: req.headers.get("paypal-transmission-time") ?? "",
            webhook_id: webhookId,
            webhook_event: body,
        },
    );

    const verificationStatus = String(verification.data?.verification_status ?? "").toUpperCase();
    if (!verification.ok || verificationStatus !== "SUCCESS") {
        console.error("[paypal-webhook] assinatura inválida", {
            status: verification.status,
            verificationStatus,
        });
        return json({ ok: false, error: "invalid signature" }, 401);
    }

    // -------------------------------------------------------------------------
    // Reconsulta autoritativa (e captura se estiver APROVADO)
    // -------------------------------------------------------------------------
    if (!paypalOrderId) {
        const captureId = extractCaptureId(body);
        if (captureId) {
            try {
                const captureLookup = await paypalRequest(
                    baseUrl,
                    token,
                    `/v2/payments/captures/${encodeURIComponent(captureId)}`,
                    "GET",
                );
                if (captureLookup.ok) {
                    const related = captureLookup.data?.supplementary_data?.related_ids?.order_id;
                    if (typeof related === "string" && related) paypalOrderId = related;
                }
            } catch (err) {
                console.warn("[paypal-webhook] falha ao resolver captura", err);
            }
        }
    }

    if (!paypalOrderId) {
        return json({ ok: true, ignored: "no paypal order id", event: eventType });
    }

    let order: any;
    try {
        const lookup = await paypalRequest(
            baseUrl,
            token,
            `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`,
            "GET",
        );
        if (!lookup.ok) {
            console.error("[paypal-webhook] falha ao consultar order", {
                paypalOrderId,
                status: lookup.status,
            });
            return json({ ok: false, error: "order lookup failed" });
        }
        order = lookup.data;
    } catch (err) {
        console.error("[paypal-webhook] erro de rede ao consultar order", err);
        return json({ ok: false, error: "order lookup error" });
    }

    if (String(order?.status || "").toUpperCase() === "APPROVED") {
        try {
            const captured = await paypalRequest(
                baseUrl,
                token,
                `/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`,
                "POST",
                {},
            );
            if (captured.ok && captured.data) {
                order = captured.data;
            } else {
                console.warn("[paypal-webhook] captura não concluída", captured.status);
            }
        } catch (err) {
            console.warn("[paypal-webhook] erro ao capturar order", err);
        }
    }

    const mapped = mapOrder(order);
    const internalStatus = mapped.status;

    const { data: paymentByOrder } = await admin
        .from("payments")
        .select("id, order_id")
        .eq("external_payment_id", paypalOrderId)
        .maybeSingle();

    let orderId = paymentByOrder?.order_id ?? undefined;

    if (!orderId) {
        const { data: byExternal } = await admin
            .from("orders")
            .select("id")
            .eq("external_id", paypalOrderId)
            .maybeSingle();
        orderId = byExternal?.id ?? undefined;
    }

    if (!orderId) {
        // Último recurso: custom_id/reference_id carregam o id do pedido.
        const unit = order?.purchase_units?.[0];
        const candidate = String(unit?.custom_id || unit?.reference_id || "");
        const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidLike.test(candidate)) {
            const { data: byId } = await admin
                .from("orders")
                .select("id")
                .eq("id", candidate)
                .maybeSingle();
            orderId = byId?.id ?? undefined;
        }
    }

    if (!orderId) {
        console.error("[paypal-webhook] pedido não encontrado", { paypalOrderId, eventType });
        return json({ ok: true, ignored: "order not found" });
    }

    const { data: orderRow, error: orderError } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();

    if (orderError || !orderRow) {
        console.error("[paypal-webhook] erro ao buscar pedido", { orderId, orderError });
        return json({ ok: true, ignored: "order not found" });
    }

    const capture = order?.purchase_units?.[0]?.payments?.captures?.[0];
    const captureStatus = String(capture?.status || "").toUpperCase();

    if (mapped.partialRefund) {
        if (paymentByOrder?.id) {
            await admin
                .from("payments")
                .update({ status: "refunded", error_message: "Estorno parcial no PayPal" })
                .eq("id", paymentByOrder.id);
        }
        return json({ ok: true, orderId, info: "partial refund" });
    }

    // Idempotência.
    if (orderRow.status === "paid" && internalStatus === "paid") {
        return json({ ok: true, ignored: "already paid" });
    }
    if (orderRow.status === "failed" && internalStatus === "failed") {
        return json({ ok: true, ignored: "already failed" });
    }

    // Nunca rebaixa pedido pago, exceto em estorno/chargeback.
    const isRefund = ["REFUNDED", "REVERSED"].includes(captureStatus)
        || eventType.includes("REFUND")
        || eventType.includes("REVERSED");

    if (orderRow.status === "paid" && internalStatus === "pending") {
        return json({ ok: true, ignored: "paid order, pending event" });
    }
    if (orderRow.status === "paid" && internalStatus === "failed" && !isRefund) {
        return json({ ok: true, ignored: "paid order, non-refund failure event" });
    }

    const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
    const orderUpdate: Record<string, any> = {
        status: internalStatus,
        external_id: paypalOrderId,
    };
    if (paidAt) orderUpdate.paid_at = paidAt;
    if (internalStatus === "failed") {
        orderUpdate.error_message = isRefund ? "Pagamento estornado no PayPal" : (captureStatus || eventType);
    }

    const { error: updateError } = await admin
        .from("orders")
        .update(orderUpdate)
        .eq("id", orderId);

    if (updateError) {
        console.error("[paypal-webhook] erro ao atualizar pedido", updateError);
        return json({ ok: false, error: "order update failed" }, 500);
    }

    const amountValue = Number(order?.purchase_units?.[0]?.amount?.value ?? 0);

    if (paymentByOrder?.id) {
        await admin
            .from("payments")
            .update({
                status: internalStatus,
                paid_at: paidAt,
                error_message: internalStatus === "failed"
                    ? (isRefund ? "Pagamento estornado no PayPal" : (captureStatus || eventType))
                    : null,
            })
            .eq("id", paymentByOrder.id);
    } else {
        await admin.from("payments").insert({
            order_id: orderId,
            gateway_id: gateway.id,
            external_payment_id: paypalOrderId,
            status: internalStatus,
            amount: Number.isFinite(amountValue) ? Math.round(amountValue * 100) : 0,
            currency: String(order?.purchase_units?.[0]?.amount?.currency_code ?? "USD").toUpperCase(),
            payment_method_type: "paypal",
            raw_response: order ?? null,
            paid_at: paidAt,
        });
    }

    // -------------------------------------------------------------------------
    // Acesso ao curso
    // -------------------------------------------------------------------------
    const { data: items } = await admin
        .from("order_items")
        .select("product_id, products:product_id(course_id)")
        .eq("order_id", orderId);

    const courseIds = new Set<string>();
    for (const item of items ?? []) {
        const courseId = (item.products as any)?.course_id;
        if (courseId) courseIds.add(courseId);
    }

    if (internalStatus === "paid" && orderRow.user_id) {
        for (const courseId of courseIds) {
            const { error } = await admin.from("user_course_access").upsert(
                {
                    user_id: orderRow.user_id,
                    course_id: courseId,
                    source: "checkout",
                    granted_by: null,
                },
                { onConflict: "user_id,course_id", ignoreDuplicates: true },
            );
            if (error) {
                console.error("[paypal-webhook] erro ao liberar acesso", { courseId, error });
            }
        }
    }

    // Estorno/chargeback: revoga o acesso se não houver outra compra paga.
    if (internalStatus === "failed" && orderRow.user_id && isRefund) {
        for (const courseId of courseIds) {
            const { data: otherPaid } = await admin
                .from("order_items")
                .select("order_id, orders!inner(id, user_id, status), products!inner(course_id)")
                .eq("products.course_id", courseId)
                .eq("orders.user_id", orderRow.user_id)
                .eq("orders.status", "paid")
                .neq("order_id", orderId)
                .limit(1);

            if (!otherPaid || otherPaid.length === 0) {
                await admin
                    .from("user_course_access")
                    .delete()
                    .eq("user_id", orderRow.user_id)
                    .eq("course_id", courseId)
                    .eq("source", "checkout");
            }
        }
    }

    return json({
        ok: true,
        orderId,
        paypalStatus: String(order?.status || ""),
        captureStatus,
        status: internalStatus,
    });
});
