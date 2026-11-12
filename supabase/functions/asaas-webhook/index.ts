// Webhook do Asaas — confirma pagamentos do checkout próprio
//
// O Asaas envia POSTs com o header `asaas-access-token`, que deve ser igual ao
// token configurado no painel (Webhooks → Token de acesso). NUNCA confiamos no
// corpo: reconsultamos GET /v3/payments/{id} antes de alterar qualquer status.
//
// IMPORTANTE: esta função roda com `verify_jwt = false` (ver config.toml), pois
// as chamadas vêm dos servidores do Asaas e não carregam JWT do Supabase.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type InternalStatus = "pending" | "paid" | "failed";

interface AsaasPayment {
  id: string;
  status?: string;
  externalReference?: string | null;
  value?: number;
  billingType?: string;
  bankSlipUrl?: string;
  invoiceUrl?: string;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** Status do Asaas que significam dinheiro recebido/confirmado. */
const PAID_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

/** Status de devolução/estorno — exigem revogação de acesso. */
const REFUNDED_STATUSES = new Set([
  "REFUNDED",
  "REFUND_REQUESTED",
  "REFUND_IN_PROGRESS",
  "CHARGEBACK_REQUESTED",
  "CHARGEBACK_DISPUTE",
  "AWAITING_CHARGEBACK_REVERSAL",
]);

/** Status que encerram a cobrança sem pagamento. */
const FAILED_STATUSES = new Set(["REFUSED", "DECLINED", "CANCELLED", "DELETED"]);

function mapStatus(asaasStatus: string): InternalStatus {
  const s = (asaasStatus || "").toUpperCase();
  if (PAID_STATUSES.has(s)) return "paid";
  if (REFUNDED_STATUSES.has(s) || FAILED_STATUSES.has(s)) return "failed";
  // PENDING, OVERDUE, AWAITING_RISK_ANALYSIS, DUNNING_* ainda podem ser pagos.
  return "pending";
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
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
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const paymentId = (body?.payment?.id ?? "").toString();
  const eventType = (body?.event ?? "").toString().toUpperCase();

  if (!paymentId) {
    // Eventos que não são de pagamento (ex.: transferências) são ignorados.
    return json({ ok: true, ignored: "no payment id" });
  }

  const { data: gateway } = await admin
    .from("gateways")
    .select("id")
    .eq("slug", "asaas")
    .maybeSingle();

  if (!gateway) {
    console.error("[asaas-webhook] gateway asaas não registrado");
    return json({ ok: false, error: "asaas gateway missing" });
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
  const apiKey: string | undefined = cred?.secret_key ?? undefined;

  if (credError || !apiKey) {
    console.error("[asaas-webhook] credenciais ausentes/erro", credError);
    return json({ ok: false, error: "asaas credentials not configured" });
  }

  // Autenticação pelo token compartilhado do webhook.
  const expectedToken = cred?.webhook_secret || Deno.env.get("ASAAS_WEBHOOK_TOKEN") || "";
  if (expectedToken) {
    const received = req.headers.get("asaas-access-token") ?? "";
    if (!timingSafeEqual(received, expectedToken)) {
      console.error("[asaas-webhook] token inválido", { paymentId });
      return json({ ok: false, error: "invalid token" }, 401);
    }
  } else {
    console.warn("[asaas-webhook] webhook_secret não configurado — token não validado");
  }

  // Reconsulta autoritativa.
  const baseUrl = cred?.env === "test"
    ? "https://api-sandbox.asaas.com/v3"
    : "https://api.asaas.com/v3";

  let payment: AsaasPayment;
  try {
    const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
      headers: {
        access_token: apiKey,
        "User-Agent": "Flow55-Webhook/1.0",
      },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[asaas-webhook] falha ao consultar pagamento", {
        paymentId,
        status: res.status,
        body: text.slice(0, 500),
      });
      return json({ ok: false, error: "payment lookup failed" });
    }
    payment = await res.json();
  } catch (err) {
    console.error("[asaas-webhook] erro de rede ao consultar pagamento", err);
    return json({ ok: false, error: "payment lookup error" });
  }

  const asaasStatus = (payment.status ?? "").toUpperCase();
  const internalStatus = mapStatus(asaasStatus);
  const externalPaymentId = String(payment.id ?? paymentId);
  const orderId = payment.externalReference;

  if (!orderId) {
    console.error("[asaas-webhook] pagamento sem externalReference", { paymentId });
    return json({ ok: true, ignored: "no external reference" });
  }

  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError || !order) {
    console.error("[asaas-webhook] pedido não encontrado", { orderId, orderError });
    return json({ ok: true, ignored: "order not found" });
  }

  // Idempotência: webhook repetido não deve reexecutar efeitos colaterais.
  if (order.status === "paid" && internalStatus === "paid") {
    return json({ ok: true, ignored: "already paid" });
  }
  if (order.status === "failed" && internalStatus === "failed") {
    return json({ ok: true, ignored: "already failed" });
  }

  // Nunca rebaixa um pedido já pago: eventos tardios (vencimento, dunning)
  // chegam como pendentes e não podem desfazer a compra.
  if (order.status === "paid" && internalStatus === "pending") {
    return json({ ok: true, ignored: "paid order, pending event" });
  }
  if (order.status === "paid" && internalStatus === "failed" && !REFUNDED_STATUSES.has(asaasStatus)) {
    return json({ ok: true, ignored: "paid order, non-refund failure event" });
  }

  const paidAt = internalStatus === "paid" ? new Date().toISOString() : null;
  const orderUpdate: Record<string, any> = {
    status: internalStatus,
    external_id: externalPaymentId,
  };
  if (paidAt) orderUpdate.paid_at = paidAt;
  if (internalStatus === "failed") {
    orderUpdate.error_message = asaasStatus || eventType;
  }

  const { error: updateError } = await admin
    .from("orders")
    .update(orderUpdate)
    .eq("id", order.id);

  if (updateError) {
    console.error("[asaas-webhook] erro ao atualizar pedido", updateError);
    return json({ ok: false, error: "order update failed" }, 500);
  }

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
        error_message: internalStatus === "failed" ? asaasStatus : null,
      })
      .eq("id", existingPayment.id);
  } else {
    await admin.from("payments").insert({
      order_id: order.id,
      gateway_id: gateway.id,
      external_payment_id: externalPaymentId,
      status: internalStatus,
      amount: Math.round((payment.value ?? 0) * 100),
      currency: "BRL",
      payment_method_type: (payment.billingType ?? "unknown").toLowerCase(),
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
        console.error("[asaas-webhook] erro ao liberar acesso", { courseId, error });
      }
    }
  }

  // Estorno/chargeback: revoga o acesso apenas se não houver outra compra paga.
  if (internalStatus === "failed" && order.user_id && REFUNDED_STATUSES.has(asaasStatus)) {
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
    asaasStatus,
    status: internalStatus,
  });
});
