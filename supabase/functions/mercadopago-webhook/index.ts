// Webhook do Mercado Pago — confirma pagamentos do checkout próprio
//
// O Mercado Pago envia notificações (IPN / Webhooks v2) para esta função.
// NUNCA confiamos no corpo da notificação: sempre reconsultamos o pagamento em
// /v1/payments/{id} com o access token da conta antes de alterar qualquer status.
//
// IMPORTANTE: esta função deve rodar com `verify_jwt = false` (ver config.toml),
// pois chamadas vindas dos servidores do Mercado Pago não carregam JWT.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyOrderPaid } from "../_shared/notify-order.ts";

type InternalStatus = "pending" | "paid" | "failed";

interface MpPayment {
  id: number | string;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  payment_type_id?: string;
  payment_method_id?: string;
  transaction_details?: {
    external_resource_url?: string;
  };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Mapeia o status do Mercado Pago para o status interno. */
function mapStatus(mpStatus: string): InternalStatus {
  switch (mpStatus) {
    case "approved":
    case "authorized":
      return "paid";
    case "rejected":
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "failed";
    case "pending":
    case "in_process":
    case "in_mediation":
    default:
      return "pending";
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Valida o header x-signature (Webhooks v2 do Mercado Pago).
 * Manifest: `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`
 */
async function validateSignature(
  headers: Headers,
  dataId: string,
  secret: string,
): Promise<boolean> {
  const xSignature = headers.get("x-signature");
  const xRequestId = headers.get("x-request-id");

  if (!xSignature || !xRequestId || !dataId) return false;

  let ts = "";
  let hash = "";
  for (const part of xSignature.split(",")) {
    const [key, value] = part.split("=");
    if (key?.trim() === "ts") ts = value?.trim() ?? "";
    if (key?.trim() === "v1") hash = value?.trim() ?? "";
  }
  if (!ts || !hash) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(manifest));
  const calculated = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return timingSafeEqual(calculated, hash);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey);

  // Corpo pode ser JSON (webhooks v2) — tolerante a corpo vazio (IPN legacy via GET).
  let body: any = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    body = {};
  }

  const eventType = (body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic") ?? "")
    .toString()
    .toLowerCase();
  const paymentId = (
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    body?.data?.id ??
    ""
  ).toString();

  // Só processamos eventos de pagamento. Notificações de merchant_order são ignoradas
  // (o evento de payment correspondente chega separadamente).
  if (!paymentId) {
    return json({ ok: true, ignored: "missing payment id" });
  }
  if (eventType && eventType !== "payment") {
    return json({ ok: true, ignored: `event type ${eventType}` });
  }

  // Credenciais ativas do Mercado Pago — produção (live) tem prioridade sobre teste.
  const { data: mpGateway } = await admin
    .from("gateways")
    .select("id")
    .eq("slug", "mercadopago")
    .maybeSingle();

  if (!mpGateway) {
    console.error("[mercadopago-webhook] gateway mercadopago não registrado");
    return json({ ok: false, error: "mercadopago gateway missing" });
  }

  const { data: credentials, error: credError } = await admin
    .from("gateway_credentials")
    .select("id, env, secret_key, webhook_secret, is_active")
    .eq("gateway_id", mpGateway.id)
    .eq("is_active", true)
    .order("env", { ascending: true }) // 'live' < 'test'
    .limit(1);

  const cred = credentials?.[0];
  const accessToken: string | undefined = cred?.secret_key ?? undefined;

  if (credError || !accessToken) {
    console.error("[mercadopago-webhook] credenciais ausentes/erro", credError);
    // 200 para o MP não ficar reenviando — o problema é de configuração, não do evento.
    return json({ ok: false, error: "mercadopago credentials not configured" });
  }

  // Validação de assinatura (obrigatória se o segredo estiver configurado).
  const signatureSecret = cred?.webhook_secret || Deno.env.get("MP_WEBHOOK_SECRET") || "";
  if (signatureSecret) {
    const valid = await validateSignature(req.headers, paymentId, signatureSecret);
    if (!valid) {
      console.error("[mercadopago-webhook] assinatura inválida", { paymentId });
      return json({ ok: false, error: "invalid signature" }, 401);
    }
  } else {
    console.warn(
      "[mercadopago-webhook] webhook_secret não configurado — assinatura não validada",
    );
  }

  // Reconsulta autoritativa no Mercado Pago.
  let payment: MpPayment;
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[mercadopago-webhook] falha ao consultar pagamento", {
        paymentId,
        status: res.status,
        body: text.slice(0, 500),
      });
      return json({ ok: false, error: "payment lookup failed" });
    }
    payment = await res.json();
  } catch (err) {
    console.error("[mercadopago-webhook] erro de rede ao consultar pagamento", err);
    return json({ ok: false, error: "payment lookup error" });
  }

  const mpStatus = (payment.status ?? "").toString().toLowerCase();
  const internalStatus = mapStatus(mpStatus);
  const orderId = payment.external_reference;
  const externalPaymentId = String(payment.id);

  if (!orderId) {
    console.error("[mercadopago-webhook] pagamento sem external_reference", { paymentId });
    return json({ ok: true, ignored: "no external_reference" });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    console.error("[mercadopago-webhook] pedido não encontrado", { orderId, orderError });
    return json({ ok: true, ignored: "order not found" });
  }

  // Idempotência: nada mudou em relação ao que já está gravado.
  const alreadyPaid = order.status === "paid" && internalStatus === "paid";
  const alreadyFailed = order.status === "failed" && internalStatus === "failed";
  if (alreadyPaid || alreadyFailed) {
    return json({ ok: true, ignored: "already processed" });
  }

  // Nunca rebaixa um pedido já pago com eventos tardios (pendente/recusado).
  const isRefund = mpStatus === "refunded" || mpStatus === "charged_back";
  if (order.status === "paid" && internalStatus === "pending") {
    return json({ ok: true, ignored: "paid order, pending event" });
  }
  if (order.status === "paid" && internalStatus === "failed" && !isRefund) {
    return json({ ok: true, ignored: "paid order, non-refund failure event" });
  }

  const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
  const orderUpdate: Record<string, any> = {
    status: internalStatus === "paid" ? "paid" : internalStatus === "failed" ? "failed" : "pending",
    external_id: externalPaymentId,
  };
  if (paidAt) orderUpdate.paid_at = paidAt;
  if (internalStatus === "failed") {
    orderUpdate.error_message = payment.status_detail ?? mpStatus;
  }

  const { error: updateError } = await admin
    .from("orders")
    .update(orderUpdate)
    .eq("id", order.id);

  if (updateError) {
    console.error("[mercadopago-webhook] erro ao atualizar pedido", updateError);
    return json({ ok: false, error: "order update failed" }, 500);
  }

  if (internalStatus === "paid") {
    await notifyOrderPaid(admin, order.id);
  }

  // Atualiza (ou cria) o registro em payments — webhook pode chegar antes do insert.
  const { data: existingPayment } = await admin
    .from("payments")
    .select("id")
    .eq("order_id", order.id)
    .eq("external_payment_id", externalPaymentId)
    .maybeSingle();

  if (existingPayment) {
    await admin
      .from("payments")
      .update({
        status: internalStatus,
        paid_at: paidAt,
        error_message: internalStatus === "failed" ? (payment.status_detail ?? mpStatus) : null,
      })
      .eq("id", existingPayment.id);
  } else {
    await admin.from("payments").insert({
      order_id: order.id,
      gateway_id: mpGateway.id,
      external_payment_id: externalPaymentId,
      status: internalStatus,
      amount: Math.round((payment.transaction_amount ?? 0) * 100),
      currency: "BRL",
      payment_method_type: payment.payment_type_id ?? payment.payment_method_id ?? "mercadopago",
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
        console.error("[mercadopago-webhook] erro ao liberar acesso", {
          courseId,
          error,
        });
      }
    }
  }

  // Estorno/chargeback: remove o acesso apenas se o usuário não tiver outra compra paga
  // do mesmo curso.
  if (internalStatus === "failed" && order.user_id && (mpStatus === "refunded" || mpStatus === "charged_back")) {
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
    mpStatus,
    status: internalStatus,
  });
});
