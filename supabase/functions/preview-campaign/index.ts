// Preview fiel de campanha (F1 do plano de e-mails).
// Usa a MESMA funcao withCampaignTracking do envio: rodape de descadastro,
// pixel e reescrita de links. Nunca envia nada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateCSRF } from "../_shared/cors.ts";
import { withCampaignTracking } from "../_shared/campaign-tracking.ts";

const TOKEN_EXEMPLO = "00000000-0000-0000-0000-000000000000";

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const csrf = validateCSRF(req);
  if (csrf) return csrf;

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const { data: role } = await supabase.from("user_roles")
      .select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });

    const body = await req.json().catch(() => ({}));
    const html = typeof body.html === "string" ? body.html : "";
    const base = Deno.env.get("SUPABASE_URL") ?? "";
    const finalHtml = withCampaignTracking(html, TOKEN_EXEMPLO, base);

    return new Response(JSON.stringify({ html: finalHtml }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
