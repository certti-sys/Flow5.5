import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { dispatchPendingNotifications } from "../_shared/notification-dispatch.ts";
import { dispatchPendingEmails } from "../_shared/email-queue.ts";

/**
 * Drena as filas de saída: notificações (`notification_deliveries`) e e-mail
 * transacional (`email_logs` com `status='queued'`).
 *
 * As duas no mesmo cron porque ambas são "o que o minuto anterior deixou
 * pendente": separar exigiria um segundo job por minuto sem ganho.
 *
 * Dois modos, iguais ao `dispatch-webhooks`:
 *   - painel/admin: drena e devolve o resultado.
 *   - agendador (pg_cron via pg_net): manda o service role no header.
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isServiceCall = isServiceRole(auth, serviceKey);

  if (!isServiceCall) {
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
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 25) || 25, 100);

    const notifications = await dispatchPendingNotifications(supabase, limit);
    const emails = await dispatchPendingEmails(supabase, limit);
    const result = { notifications, emails };

    logger.info("[dispatch-notifications] rodada concluída", result);

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("[dispatch-notifications] erro", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
