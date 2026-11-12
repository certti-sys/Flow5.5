// Webhook do Stripe — confirma pagamentos do Payment Element
//
// Segurança:
//  - A assinatura `Stripe-Signature` é validada com HMAC-SHA256 (timing-safe)
//    antes de qualquer efeito colateral.
//  - O segredo vem de `gateway_credentials.webhook_secret` (live antes de test)
//    e, como fallback, da variável de ambiente STRIPE_WEBHOOK_SECRET. Tentamos
//    todos os segredos ativos para não quebrar quando o admin alterna entre
//    test/live.
//
// IMPORTANTE: esta função roda com `verify_jwt = false` (ver config.toml),
// pois chamadas vindas dos servidores do Stripe não carregam JWT do Supabase.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

type InternalStatus = "pending" | "paid" | "failed";

const TOLERANCE_SECONDS = 300;

const json = (body: unknown, status = 200, cors: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { ...cors, "Content-Type": "application/json" },
    });

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

/** HMAC-SHA256 em hex do payload assinado (`timestamp.body`). */
async function hmacHex(secret: string, signedPayload: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signedPayload));
    return Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * Valida o header `Stripe-Signature` (formato `t=<ts>,v1=<hash>,...`).
 * Aceita múltiplas assinaturas v1, como o Stripe faz durante rotação de segredo.
 */
async function verifySignature(
    payload: string,
    signatureHeader: string,
    secret: string,
): Promise<boolean> {
    let timestamp = "";
    const signatures: string[] = [];

    for (const part of signatureHeader.split(",")) {
        const [key, value] = part.split("=");
        const k = key?.trim();
        const v = value?.trim() ?? "";
        if (k === "t") timestamp = v;
        else if (k === "v1" && v) signatures.push(v);
    }

    if (!timestamp || signatures.length === 0) return false;

    // Proteção contra replay.
    const now = Math.floor(Date.now() / 1000);
    const ts = Number.parseInt(timestamp, 10);
    if (!Number.isFinite(ts) || Math.abs(now - ts) > TOLERANCE_SECONDS) return false;

    const expected = await hmacHex(secret, `${timestamp}.${payload}`);
    return signatures.some((sig) => timingSafeEqual(expected, sig));
}

/**
 * Segredos candidatos: credenciais do banco (live primeiro) + env var.
 * Nunca lançamos erro por credencial individual inválida — apenas ignoramos.
 */
async function loadWebhookSecrets(admin: any, gatewayId: string): Promise<string[]> {
    const secrets: string[] = [];

    const { data, error } = await admin
        .from("gateway_credentials")
        .select("env, webhook_secret, is_active")
        .eq("gateway_id", gatewayId)
        .order("env", { ascending: true }); // 'live' < 'test'

    if (error) {
        logger.warn("[stripe-webhook] falha ao ler credenciais", error);
    }
    for (const row of data ?? []) {
        const secret = (row?.webhook_secret ?? "").toString().trim();
        if (secret && !secrets.includes(secret)) secrets.push(secret);
    }

    const envSecret = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim();
    if (envSecret && !secrets.includes(envSecret)) secrets.push(envSecret);

    return secrets;
}

serve(async (req) => {
    const corsHeaders = getCorsHeaders(req.headers.get("Origin"));

    if (req.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders });
    }

    let body = "";
    try {
        body = await req.text();
    } catch {
        return json({ ok: false, error: "invalid body" }, 400, corsHeaders);
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
        logger.error("[stripe-webhook] header Stripe-Signature ausente");
        return json({ ok: false, error: "missing signature" }, 400, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: gateway } = await admin
        .from("gateways")
        .select("id")
        .eq("slug", "stripe")
        .maybeSingle();

    if (!gateway) {
        logger.error("[stripe-webhook] gateway stripe não registrado");
        return json({ ok: false, error: "stripe gateway missing" }, 200, corsHeaders);
    }

    const secrets = await loadWebhookSecrets(admin, gateway.id);
    if (secrets.length === 0) {
        logger.error("[stripe-webhook] nenhum webhook_secret configurado");
        return json({ ok: false, error: "webhook secret not configured" }, 400, corsHeaders);
    }

    let valid = false;
    for (const secret of secrets) {
        if (await verifySignature(body, signature, secret)) {
            valid = true;
            break;
        }
    }
    if (!valid) {
        logger.error("[stripe-webhook] assinatura inválida");
        return json({ ok: false, error: "invalid signature" }, 401, corsHeaders);
    }

    let event: any;
    try {
        event = JSON.parse(body);
    } catch {
        return json({ ok: false, error: "invalid json" }, 400, corsHeaders);
    }

    logger.info(`[stripe-webhook] evento ${event.type}`, { eventId: event.id });

    try {
        switch (event.type) {
            case "payment_intent.succeeded":
                await handlePaymentSuccess(admin, gateway.id, event.data.object);
                break;

            case "payment_intent.payment_failed":
                await handlePaymentFailed(admin, gateway.id, event.data.object);
                break;

            case "payment_intent.canceled":
                await handlePaymentCanceled(admin, gateway.id, event.data.object);
                break;

            case "charge.refunded":
                await handleRefund(admin, event.data.object);
                break;

            case "payment_intent.requires_action":
                await handleRequiresAction(admin, event.data.object);
                break;

            default:
                logger.info(`[stripe-webhook] evento não tratado: ${event.type}`);
        }
    } catch (error: any) {
        // Devolver 500 faz o Stripe reenviar — útil para falhas transitórias de banco.
        logger.error("[stripe-webhook] erro ao processar evento", error);
        return json({ ok: false, error: error?.message ?? "processing error" }, 500, corsHeaders);
    }

    return json({ ok: true, received: true }, 200, corsHeaders);
});

/** Insere ou atualiza o registro em `payments` (webhook pode chegar antes do insert). */
async function upsertPayment(
    admin: any,
    gatewayId: string,
    orderId: string,
    paymentIntent: any,
    status: InternalStatus,
    paidAt: string | null,
    errorMessage: string | null,
) {
    const externalId = String(paymentIntent?.id ?? "");
    if (!externalId) return;

    const { data: existing } = await admin
        .from("payments")
        .select("id")
        .eq("order_id", orderId)
        .eq("external_payment_id", externalId)
        .maybeSingle();

    if (existing) {
        const { error } = await admin
            .from("payments")
            .update({ status, paid_at: paidAt, error_message: errorMessage })
            .eq("id", existing.id);
        if (error) logger.error("[stripe-webhook] erro ao atualizar payment", error);
        return;
    }

    const { error } = await admin.from("payments").insert({
        order_id: orderId,
        gateway_id: gatewayId,
        external_payment_id: externalId,
        status,
        amount: Number.isFinite(paymentIntent?.amount) ? paymentIntent.amount : 0,
        currency: String(paymentIntent?.currency ?? "usd").toUpperCase(),
        payment_method_type: paymentIntent?.payment_method_types?.[0] ?? "card",
        raw_response: paymentIntent ?? null,
        paid_at: paidAt,
        error_message: errorMessage,
    });
    if (error) logger.error("[stripe-webhook] erro ao inserir payment", error);
}

async function getOrder(admin: any, orderId: string) {
    const { data, error } = await admin
        .from("orders")
        .select("id, user_id, status")
        .eq("id", orderId)
        .maybeSingle();
    if (error) logger.error("[stripe-webhook] erro ao buscar pedido", error);
    return data ?? null;
}

async function grantCourseAccess(admin: any, orderId: string, userId: string) {
    const { data: items } = await admin
        .from("order_items")
        .select("product_id, products:product_id(course_id)")
        .eq("order_id", orderId);

    const courseIds = new Set<string>();
    for (const item of items ?? []) {
        const courseId = (item.products as any)?.course_id;
        if (courseId) courseIds.add(courseId);
    }

    for (const courseId of courseIds) {
        const { error } = await admin.from("user_course_access").upsert(
            {
                user_id: userId,
                course_id: courseId,
                source: "checkout",
                granted_by: null,
            },
            { onConflict: "user_id,course_id", ignoreDuplicates: true },
        );
        if (error) {
            logger.error(`[stripe-webhook] erro ao liberar curso ${courseId}`, error);
        }
    }
}

async function revokeCourseAccess(admin: any, orderId: string, userId: string) {
    const { data: items } = await admin
        .from("order_items")
        .select("product_id, products:product_id(course_id)")
        .eq("order_id", orderId);

    const courseIds = new Set<string>();
    for (const item of items ?? []) {
        const courseId = (item.products as any)?.course_id;
        if (courseId) courseIds.add(courseId);
    }

    for (const courseId of courseIds) {
        // Mantém o acesso se houver outra compra paga do mesmo curso.
        const { data: otherPaid } = await admin
            .from("order_items")
            .select("order_id, orders!inner(id, user_id, status), products!inner(course_id)")
            .eq("products.course_id", courseId)
            .eq("orders.user_id", userId)
            .eq("orders.status", "paid")
            .neq("order_id", orderId)
            .limit(1);

        if (!otherPaid || otherPaid.length === 0) {
            const { error } = await admin
                .from("user_course_access")
                .delete()
                .eq("user_id", userId)
                .eq("course_id", courseId)
                .eq("source", "checkout");
            if (error) {
                logger.error(`[stripe-webhook] erro ao revogar curso ${courseId}`, error);
            }
        }
    }
}

/** payment_intent.succeeded */
async function handlePaymentSuccess(admin: any, gatewayId: string, paymentIntent: any) {
    const orderId = paymentIntent?.metadata?.order_id;
    if (!orderId) {
        logger.warn("[stripe-webhook] payment intent sem metadata.order_id", {
            paymentIntentId: paymentIntent?.id,
        });
        return;
    }

    const paidAt = new Date().toISOString();
    const order = await getOrder(admin, orderId);

    if (!order) {
        logger.error("[stripe-webhook] pedido não encontrado", { orderId });
        return;
    }

    if (order.status === "paid") {
        // Idempotente: garante o registro de pagamento, mas não reexecuta efeitos.
        await upsertPayment(admin, gatewayId, orderId, paymentIntent, "paid", paidAt, null);
        logger.info(`[stripe-webhook] pedido ${orderId} já estava pago`);
        return;
    }

    const { error } = await admin
        .from("orders")
        .update({
            status: "paid",
            external_id: paymentIntent.id,
            paid_at: paidAt,
            error_message: null,
        })
        .eq("id", orderId);

    if (error) {
        logger.error(`[stripe-webhook] erro ao atualizar pedido ${orderId}`, error);
        throw error;
    }

    await upsertPayment(admin, gatewayId, orderId, paymentIntent, "paid", paidAt, null);

    if (order.user_id) {
        await grantCourseAccess(admin, orderId, order.user_id);
    }
}

/** payment_intent.payment_failed */
async function handlePaymentFailed(admin: any, gatewayId: string, paymentIntent: any) {
    const orderId = paymentIntent?.metadata?.order_id;
    if (!orderId) return;

    const order = await getOrder(admin, orderId);
    if (!order) return;

    // Nunca rebaixa pedido pago: pode ser uma tentativa anterior do mesmo fluxo.
    if (order.status === "paid" || order.status === "canceled") {
        logger.info(`[stripe-webhook] falha ignorada para pedido ${order.status} ${orderId}`);
        return;
    }

    const errorMessage = paymentIntent?.last_payment_error?.message || "Payment failed";

    const { error } = await admin
        .from("orders")
        .update({ status: "failed", error_message: errorMessage })
        .eq("id", orderId);

    if (error) {
        logger.error(`[stripe-webhook] erro ao marcar pedido ${orderId} como failed`, error);
        return;
    }

    await upsertPayment(admin, gatewayId, orderId, paymentIntent, "failed", null, errorMessage);
}

/** payment_intent.canceled */
async function handlePaymentCanceled(admin: any, gatewayId: string, paymentIntent: any) {
    const orderId = paymentIntent?.metadata?.order_id;
    if (!orderId) return;

    const order = await getOrder(admin, orderId);
    if (!order) return;

    if (order.status === "paid") {
        logger.info(`[stripe-webhook] cancelamento ignorado: pedido ${orderId} já pago`);
        return;
    }
    if (order.status === "canceled") {
        return;
    }

    const { error } = await admin
        .from("orders")
        .update({ status: "canceled", error_message: "Payment canceled" })
        .eq("id", orderId);

    if (error) {
        logger.error(`[stripe-webhook] erro ao cancelar pedido ${orderId}`, error);
        return;
    }

    await upsertPayment(admin, gatewayId, orderId, paymentIntent, "failed", null, "Payment canceled");
}

/**
 * charge.refunded
 * Reembolso total -> pedido vira `failed` (o enum de orders não aceita
 * "refunded") e o acesso é revogado. Reembolso parcial apenas registra o
 * estorno em `payments` e mantém o acesso.
 */
async function handleRefund(admin: any, charge: any) {
    const paymentIntentId = typeof charge?.payment_intent === "string"
        ? charge.payment_intent
        : charge?.payment_intent?.id;

    if (!paymentIntentId) {
        logger.warn("[stripe-webhook] charge.refunded sem payment_intent", { chargeId: charge?.id });
        return;
    }

    let { data: payment } = await admin
        .from("payments")
        .select("id, order_id")
        .eq("external_payment_id", paymentIntentId)
        .maybeSingle();

    let orderId: string | undefined = payment?.order_id ?? undefined;

    // Fallback: em pedidos antigos `orders.external_id` guarda o PaymentIntent.
    if (!orderId) {
        const { data: order } = await admin
            .from("orders")
            .select("id")
            .eq("external_id", paymentIntentId)
            .maybeSingle();
        orderId = order?.id ?? undefined;
    }

    if (!orderId) {
        logger.warn("[stripe-webhook] reembolso sem pedido correspondente", { paymentIntentId });
        return;
    }

    const amountRefunded = Number(charge?.amount_refunded ?? 0);
    const amount = Number(charge?.amount ?? 0);
    const isFullRefund = charge?.refunded === true || (amount > 0 && amountRefunded >= amount);

    await admin
        .from("payments")
        .update({
            status: "refunded",
            error_message: isFullRefund
                ? "Pagamento reembolsado"
                : `Reembolso parcial de ${amountRefunded} de ${amount}`,
        })
        .eq("external_payment_id", paymentIntentId);

    if (!isFullRefund) {
        logger.info(`[stripe-webhook] reembolso parcial no pedido ${orderId} — acesso mantido`);
        return;
    }

    const order = await getOrder(admin, orderId);
    if (!order) return;

    await admin
        .from("orders")
        .update({ status: "failed", error_message: "Pagamento reembolsado" })
        .eq("id", orderId);

    if (order.user_id) {
        await revokeCourseAccess(admin, orderId, order.user_id);
    }
}

/** payment_intent.requires_action — mantém pendente, nunca rebaixa pedido pago. */
async function handleRequiresAction(admin: any, paymentIntent: any) {
    const orderId = paymentIntent?.metadata?.order_id;
    if (!orderId) return;

    const order = await getOrder(admin, orderId);
    if (!order) return;

    if (order.status === "paid" || order.status === "canceled") {
        return;
    }

    await admin.from("orders").update({ status: "pending" }).eq("id", orderId);
}
