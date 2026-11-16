import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { dispatchPendingIntegrations } from "../_shared/integration-dispatch.ts";
import { sendIntegraxSms, sendPixelX } from "../_shared/integrations.ts";

/**
 * Drena a fila de integrações de marketing (`integration_deliveries`).
 *
 * Dois modos:
 *   - painel/admin: drena e devolve o resultado.
 *   - agendador (pg_cron via pg_net): manda o service role no header.
 *
 * Idempotente por natureza: cada entrega só é marcada depois do POST, e o
 * backoff está em `next_attempt_at`.
 */

/** `verify_jwt = false`, então a credencial é conferida aqui. */
function isServiceRole(auth: string, serviceKey: string): boolean {
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  if (token === serviceKey) return true;
  try {
    const segment = (token.split(".")[1] || "").replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(segment))?.role === "service_role";
  } catch {
    return false;
  }
}

/** Só o service role lê `secret`. */
async function loadIntegration(supabase: any, id: string) {
  const { data } = await supabase
    .from("integrations")
    .select("id, kind, config, secret")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/**
 * Botões de teste do painel. Só dois envios têm efeito real: o SMS da IntegraX
 * (mensagem de exemplo) e o postback da Pixel X (payload de exemplo).
 */
async function runTest(
  supabase: any,
  action: string,
  body: Record<string, string>,
): Promise<{ status: number; body: unknown }> {
  if (!body.integration_id) return { status: 400, body: { error: "integration_id obrigatório" } };

  const integration = await loadIntegration(supabase, body.integration_id);
  if (!integration) return { status: 404, body: { error: "integração não encontrada" } };

  if (action === "test_integrax") {
    const result = await sendIntegraxSms(integration, body.phone ?? "", body.message ?? "Teste Flow5.5");
    const ok = result.outcome === "ok";
    return {
      status: ok ? 200 : 400,
      body: { success: ok, message: ok ? "SMS enviado." : result.error ?? "falha no envio" },
    };
  }

  if (action === "test_pixel_x") {
    // Payload de exemplo com o mesmo formato do envio real.
    const now = new Date().toISOString();
    const result = await sendPixelX(integration, {
      order_id: "00000000-0000-0000-0000-000000000000",
      status: "paid",
      currency: "BRL",
      amount: 10000,
      paid_at: now,
      external_id: "teste",
      created_at: now,
      payment_method: "pix",
      tracking: {},
      device: { ip: "127.0.0.1", user_agent: "Flow55-Test/1.0" },
      customer: { name: "Cliente Teste", email: "teste@exemplo.com", phone: "11999999999", document: "" },
      items: [{ product_id: "teste", product_name: "Produto Teste", course_id: null, kind: "main", amount: 10000 }],
    }, "order.paid");

    const ok = result.outcome === "ok";
    return {
      status: ok ? 200 : 400,
      body: {
        success: ok,
        message: ok
          ? `Evento aceito (HTTP ${result.status}).`
          : result.error ?? `falha no envio (HTTP ${result.status})`,
      },
    };
  }

  return { status: 400, body: { error: `ação ${action} desconhecida` } };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isServiceCall = isServiceRole(auth, serviceKey);

  if (!isServiceCall) {
    // Sem service role, exige admin autenticado.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const userClient = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: role } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50) || 50, 200);

    // Botão "Testar" do painel. Sem service role para não deixar o token de
    // SMS como endpoint público de disparo.
    const action = url.searchParams.get("action");
    if (action) {
      if (isServiceCall) {
        return new Response(JSON.stringify({ error: "teste exige admin autenticado" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const body = await req.json().catch(() => ({}));
      const result = await runTest(supabase, action, body as Record<string, string>);
      return new Response(JSON.stringify(result.body), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await dispatchPendingIntegrations(supabase, limit);
    logger.info("[dispatch-integrations] rodada concluída", result);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("[dispatch-integrations] erro", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
