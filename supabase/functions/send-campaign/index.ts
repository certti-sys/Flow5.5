import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { deliverEmail, loadEmailSettings } from "../_shared/email.ts";
import { recordOptOut } from "../_shared/email-queue.ts";
import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Envio de campanha de e-mail marketing.
 *
 *   - `prepare`: materializa o segmento em `email_campaign_sends` (pending).
 *   - `drain`  : cron. Entrega um lote de 30 pendentes da campanha em `sending`.
 *   - `test`   : manda uma cópia para um endereço, sem tocar no contador.
 *
 * O corpo é HTML do admin e sai como está, com rodapé de descadastro e pixel de
 * abertura injetados aqui — não no editor, senão o admin apagaria sem notar.
 *
 * Tudo exige admin ou service role: sem isso qualquer um dispararia e-mail em
 * massa usando a reputação do domínio.
 */

const LOTE = 30;
const CONCORRENCIA = 5;

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), campaignId: z.string().uuid() }),
  z.object({ action: z.literal("drain") }),
  z.object({
    action: z.literal("test"),
    campaignId: z.string().uuid(),
    email: z.string().email(),
  }),
]);

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

async function isAdmin(supabase: any, auth: string): Promise<boolean> {
  const token = auth.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data } = await supabase.auth.getUser(token);
  if (!data?.user) return false;
  const { data: role } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", data.user.id)
    .eq("role", "admin")
    .maybeSingle();
  return !!role;
}

/** Rodapé obrigatório: sem link de descadastro a campanha vira spam. */
function withTracking(html: string, token: string): string {
  // A edge responde em `*.supabase.co`, não no domínio da plataforma.
  const base = Deno.env.get("SUPABASE_URL")!.replace(/\/$/, "");
  const link = `${base}/functions/v1/campaign-track?t=${token}`;

  // Só no envio: reescreve links absolutos para passar pelo tracker. O HTML
  // salvo no editor continua intacto — links relativos nunca são tocados.
  // O destino é codificado na URL e validado pela edge (allowlist http/https).
  html = html.replace(
    /href=(["'])(\s*https?:\/\/[^"']+)\1/gi,
    (_m, quote: string, target: string) => {
      const trimmed = target.trim();
      const tracked = `${link}&a=click&u=${encodeURIComponent(trimmed)}`;
      return `href=${quote}${tracked}${quote}`;
    },
  );

  const pixel = `<img src="${link}&a=open" width="1" height="1" alt="" style="display:block;border:0;outline:none;" />`;
  const footer = `
<div style="margin-top:32px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:12px;color:#a1a1aa;text-align:center;font-family:Arial,sans-serif;">
  Você recebeu este e-mail porque tem conta ou já comprou na plataforma.<br>
  <a href="${link}&a=unsubscribe" style="color:#a1a1aa;">Não quero mais receber estes e-mails</a>
</div>`;
  return `${html}${footer}${pixel}`;
}

/** Uma campanha por rodada: o lote inteiro pertence a ela. */
async function pickCampaign(supabase: any) {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("email_campaigns")
    .select("id, subject, body_html, total_recipients, sent_count, failed_count, backoff_until")
    .eq("status", "sending")
    .order("created_at", { ascending: true })
    .limit(5);

  const ready = (data ?? []).find((c: any) => !c.backoff_until || c.backoff_until <= now);
  return ready ?? null;
}

async function drain(supabase: any): Promise<{ sent: number; failed: number; skipped: number; campaignId?: string }> {
  const campaign = await pickCampaign(supabase);
  if (!campaign) return { sent: 0, failed: 0, skipped: 0 };

  const { data: rows } = await supabase
    .from("email_campaign_sends")
    .select("id, token, recipient_email, recipient_name, status")
    .eq("campaign_id", campaign.id)
    .eq("status", "pending")
    .limit(LOTE);

  if (!rows || rows.length === 0) {
    await supabase
      .from("email_campaigns")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", campaign.id);
    return { sent: 0, failed: 0, skipped: 0, campaignId: campaign.id };
  }

  const settings = await loadEmailSettings(supabase);
  if (!settings) {
    logger.warn("[send-campaign] email_settings inativo; campanha parada");
    return { sent: 0, failed: 0, skipped: 0, campaignId: campaign.id };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += CONCORRENCIA) {
    const batch = rows.slice(i, i + CONCORRENCIA);

    await Promise.all(batch.map(async (row: any) => {
      // Descadastro pode ter chegado depois do `prepare`.
      const { data: optOut } = await supabase
        .from("email_opt_outs")
        .select("email")
        .eq("email", row.recipient_email)
        .maybeSingle();

      if (optOut) {
        skipped++;
        await supabase
          .from("email_campaign_sends")
          .update({ status: "skipped", error: "descadastrado" })
          .eq("id", row.id);
        return;
      }

      const result = await deliverEmail(settings, {
        to: row.recipient_email,
        toName: row.recipient_name ?? undefined,
        subject: campaign.subject,
        html: withTracking(campaign.body_html, row.token),
      });

      if (result.success) {
        sent++;
        await supabase
          .from("email_campaign_sends")
          .update({ status: "sent", sent_at: new Date().toISOString(), error: null })
          .eq("id", row.id);
        return;
      }

      failed++;
      await supabase
        .from("email_campaign_sends")
        .update({ status: "failed", error: result.error ?? "falha no envio" })
        .eq("id", row.id);
      // Endereço morto ou descadastrado no provedor: registra para as próximas
      // campanhas já pularem o destinatário no `prepare`.
      if (result.optOut) {
        await recordOptOut(supabase, row.recipient_email, result.error ?? "hard bounce");
      }
    }));
  }

  await supabase.rpc("bump_campaign_counts", {
    p_campaign_id: campaign.id,
    p_sent: sent,
    p_failed: failed,
  });

  // Rodada 100% falha com lote cheio = provedor fora do ar. Freia 5 min em vez
  // de queimar 30 tentativas por minuto.
  if (sent === 0 && failed === rows.length && rows.length >= LOTE) {
    await supabase
      .from("email_campaigns")
      .update({
        backoff_until: new Date(Date.now() + 5 * 60_000).toISOString(),
        last_error: "lote inteiro falhou; nova tentativa em 5 minutos",
      })
      .eq("id", campaign.id);
  } else if (failed > 0) {
    await supabase
      .from("email_campaigns")
      .update({ last_error: `${failed} falha(s) no último lote` })
      .eq("id", campaign.id);
  } else {
    await supabase.from("email_campaigns").update({ last_error: null }).eq("id", campaign.id);
  }

  return { sent, failed, skipped, campaignId: campaign.id };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const auth = req.headers.get("Authorization") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, serviceKey);

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Dados inválidos", details: parsed.error.issues }, 400);
    const body = parsed.data;

    const allowed = isServiceRole(auth, serviceKey) || (await isAdmin(supabase, auth));
    if (!allowed) return json({ error: "forbidden" }, 403);

    if (body.action === "drain") {
      const out = await drain(supabase);
      return json({ ok: true, ...out });
    }

    const { data: campaign } = await supabase
      .from("email_campaigns")
      .select("*")
      .eq("id", body.campaignId)
      .maybeSingle();
    if (!campaign) return json({ error: "campanha não encontrada" }, 404);

    if (body.action === "test") {
      const settings = await loadEmailSettings(supabase);
      if (!settings) return json({ error: "e-mail não configurado" }, 422);

      const result = await deliverEmail(settings, {
        to: body.email,
        subject: `[TESTE] ${campaign.subject}`,
        html: campaign.body_html,
      });
      if (!result.success) return json({ error: result.error ?? "falha no envio" }, 422);
      return json({ ok: true });
    }

    // --- prepare ---
    if (campaign.status === "sending") {
      return json({ error: "campanha já está sendo enviada" }, 409);
    }
    if (campaign.status === "sent") {
      return json({ error: "campanha já foi enviada" }, 409);
    }

    const { data: recipients, error } = await supabase.rpc("campaign_recipients", {
      p_filter: campaign.filter_config ?? {},
      p_limit: null,
    });
    if (error) {
      logger.error("[send-campaign] segmento falhou", error);
      return json({ error: error.message }, 400);
    }

    const list = (recipients ?? []) as Array<{ email: string; name: string | null; user_id: string | null }>;
    if (list.length === 0) {
      return json({ error: "o segmento não tem destinatários" }, 422);
    }

    // Reexecutar o prepare não pode duplicar envio: `on conflict do nothing`
    // mantém quem já saiu e só acrescenta quem entrou no segmento depois.
    for (let i = 0; i < list.length; i += 500) {
      const chunk = list.slice(i, i + 500).map((r) => ({
        campaign_id: campaign.id,
        recipient_email: r.email,
        recipient_name: r.name,
        user_id: r.user_id,
      }));
      const { error: insertError } = await supabase
        .from("email_campaign_sends")
        .upsert(chunk, { onConflict: "campaign_id,recipient_email", ignoreDuplicates: true });
      if (insertError) {
        logger.error("[send-campaign] falha ao gravar destinatários", insertError);
        return json({ error: insertError.message }, 400);
      }
    }

    await supabase
      .from("email_campaigns")
      .update({
        status: "sending",
        total_recipients: list.length,
        sent_count: 0,
        failed_count: 0,
        scheduled_at: campaign.scheduled_at ?? new Date().toISOString(),
        backoff_until: null,
        last_error: null,
      })
      .eq("id", campaign.id);

    return json({ ok: true, recipients: list.length });
  } catch (error: any) {
    logger.error("[send-campaign] erro", error);
    return json({ error: error?.message ?? "Internal error" }, 500);
  }
});
