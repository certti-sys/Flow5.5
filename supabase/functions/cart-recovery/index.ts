import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { enqueueEmail } from "../_shared/email-queue.ts";
import { sendIntegraxSms } from "../_shared/integrations.ts";
import { z } from "https://esm.sh/zod@3.22.4";

/**
 * Carrinho abandonado — marcação de abandono e recuperação.
 *
 *   - `sweep`   : cron. Marca abandono passado o grace, emite
 *                 `cart.abandoned` e envia os estágios vencidos.
 *   - `stage`   : envia um estágio específico (botão do painel / teste).
 *   - `manual`  : contato avulso do admin (WhatsApp ou e-mail), fora do funil.
 *
 * A captura do lead não passa por aqui: o checkout chama a RPC
 * `capture_cart_lead` direto pelo PostgREST — um hop a menos, mesma validação.
 *
 * Tudo aqui exige service role ou admin: sem isso qualquer visitante
 * dispararia mensagem para qualquer lead.
 */

const BodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("sweep") }),
  z.object({
    action: z.literal("stage"),
    leadId: z.string().uuid(),
    stage: z.number().int().min(1).max(10),
  }),
  z.object({
    action: z.literal("manual"),
    leadId: z.string().uuid(),
    channel: z.enum(["email", "whatsapp", "sms"]),
    message: z.string().trim().min(1).max(2000).optional(),
    subject: z.string().trim().max(200).optional(),
  }),
]);

type Channel = "email" | "whatsapp" | "sms";
type StageVars = { nome: string; produto: string; preco: string; link: string };

function money(cents: number | null | undefined): string {
  return `R$ ${((cents ?? 0) / 100).toFixed(2).replace(".", ",")}`;
}

function stageMessage(stage: number, v: StageVars): string {
  const oi = v.nome ? `Oi, ${v.nome}!` : "Oi!";
  if (stage === 1) {
    return `${oi} Vi que você começou a comprar *${v.produto}* (${v.preco}) e não terminou.\n\nSeu checkout continua aberto:\n${v.link}\n\nSe ficou alguma dúvida, é só responder aqui.`;
  }
  if (stage === 2) {
    return `${oi} Seu acesso a *${v.produto}* ainda está esperando por você.\n\nFinalize em 1 minuto:\n${v.link}`;
  }
  return `${oi} Última mensagem sobre *${v.produto}* — depois dessa não volto a insistir.\n\n${v.link}`;
}

/**
 * Mesmo texto sem `*negrito*`: o asterisco é sintaxe do WhatsApp e no e-mail
 * sairia literal. Um texto por estágio, dois formatos.
 */
function stageEmailMessage(stage: number, v: StageVars): string {
  return stageMessage(stage, v).replace(/\*/g, "");
}

/** `{nome}` etc. no texto salvo pelo admin; o mesmo vocabulário do preview. */
function renderTemplate(template: string, v: StageVars): string {
  return template
    .split("{nome}").join(v.nome)
    .split("{produto}").join(v.produto)
    .split("{preco}").join(v.preco)
    .split("{link}").join(v.link);
}

function stageSubject(stage: number, produto: string): string {
  if (stage === 1) return `Você esqueceu algo em ${produto}`;
  if (stage === 2) return `Seu acesso a ${produto} está reservado`;
  return `Última chance: ${produto}`;
}

/**
 * SMS padrão do funil. Limite de 160 caracteres da IntegraX — os textos ficam
 * curtos de propósito; o link sozinho já consome boa parte.
 */
function smsStageDefault(stage: number, v: StageVars): string {
  const oi = v.nome ? `Oi, ${v.nome.split(" ")[0]}! ` : "";
  if (stage === 1) return `${oi}Retome ${v.produto}: ${v.link}`;
  if (stage === 2) return `${oi}Ainda dá tempo: ${v.link}`;
  return `${oi}Último lembrete ${v.produto}: ${v.link}`;
}

type StageTemplates = {
  email?: Array<{ subject?: string; body?: string }>;
  whatsapp?: Array<{ body?: string }>;
  sms?: Array<{ body?: string }>;
};

/**
 * Texto de um estágio. `stage` é 1-based; campo vazio no banco cai no padrão,
 * então quem nunca abriu a tela mantém o texto de antes da configuração.
 */
function stageContent(
  stage: number,
  v: StageVars,
  templates: StageTemplates | null | undefined,
) {
  const i = Math.max(0, stage - 1);
  const email = templates?.email?.[i];
  const whatsapp = templates?.whatsapp?.[i];
  const sms = templates?.sms?.[i];
  const fallback = stageEmailMessage(stage, v);

  return {
    subject: email?.subject?.trim()
      ? renderTemplate(email.subject.trim(), v)
      : stageSubject(stage, v.produto),
    emailBody: email?.body?.trim() ? renderTemplate(email.body.trim(), v) : fallback,
    whatsappBody: whatsapp?.body?.trim() ? renderTemplate(whatsapp.body.trim(), v) : stageMessage(stage, v),
    smsBody: sms?.body?.trim() ? renderTemplate(sms.body.trim(), v) : smsStageDefault(stage, v),
  };
}

/** `verify_jwt = false`; a credencial é conferida aqui. */
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

async function loadLead(supabase: any, leadId: string) {
  const { data: lead } = await supabase
    .from("cart_leads")
    .select("id, email, name, phone, product_id, status, stage, metadata")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return null;

  const { data: product } = await supabase
    .from("products")
    .select("name, price, checkout_slug")
    .eq("id", lead.product_id)
    .maybeSingle();

  const siteUrl = (Deno.env.get("SITE_URL") || "https://v5.flowmembers.app").replace(/\/$/, "");
  const link = product?.checkout_slug ? `${siteUrl}/c/${product.checkout_slug}` : siteUrl;

  return {
    lead,
    vars: {
      nome: lead.name ?? "",
      produto: product?.name ?? "seu curso",
      preco: money(product?.price),
      link,
    } satisfies StageVars,
  };
}

async function sendWhatsApp(phone: string, message: string): Promise<boolean> {
  try {
    const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-whatsapp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) logger.warn(`[cart-recovery] whatsapp HTTP ${res.status}`);
    return res.ok;
  } catch (error) {
    logger.warn("[cart-recovery] whatsapp falhou", error);
    return false;
  }
}

async function deliver(
  supabase: any,
  lead: any,
  vars: StageVars,
  channels: { email: boolean; whatsapp: boolean; sms: boolean },
  content: { subject: string; emailBody: string; whatsappBody: string; smsBody: string },
  source: string,
): Promise<{ email: boolean; whatsapp: boolean; sms: boolean }> {
  let email = false;
  let whatsapp = false;
  let sms = false;

  if (channels.email) {
    email = await enqueueEmail(supabase, {
      to: lead.email,
      toName: lead.name ?? undefined,
      type: "custom",
      subject: content.subject,
      // Texto do admin vai como digitado; só o padrão precisa perder o
      // `*negrito*` do WhatsApp.
      html: `<p>${content.emailBody.replace(/\n/g, "<br>")}</p>`,
      variables: {
        user_name: vars.nome,
        produto: vars.produto,
        preco: vars.preco,
        link_checkout: vars.link,
      },
      source,
    });
  }

  if (channels.whatsapp && lead.phone) {
    whatsapp = await sendWhatsApp(lead.phone, content.whatsappBody);
  }

  if (channels.sms && lead.phone) {
    sms = await sendCartSms(supabase, lead.phone, content.smsBody);
  }

  return { email, whatsapp, sms };
}

/**
 * SMS do funil. Usa a integração IntegraX já cadastrada no painel — o mesmo
 * token dos SMS de PIX e de acesso; sem ela o canal simplesmente não envia.
 */
async function sendCartSms(supabase: any, phone: string, message: string): Promise<boolean> {
  if (!message.trim()) return false;

  const { data: integration } = await supabase
    .from("integrations")
    .select("id, kind, config, secret")
    .eq("kind", "integrax")
    .eq("is_active", true)
    .maybeSingle();

  if (!integration?.secret) {
    logger.warn("[cart-recovery] SMS ligado no funil, mas IntegraX não está configurada");
    return false;
  }

  const result = await sendIntegraxSms(integration, phone, message);
  if (result.outcome !== "ok") {
    logger.warn(`[cart-recovery] SMS não enviado: ${result.error ?? result.outcome}`);
  }
  return result.outcome === "ok";
}

async function sendStage(
  supabase: any,
  leadId: string,
  stage: number,
  settings: any,
): Promise<{ email: boolean; whatsapp: boolean; sms: boolean; skipped?: string }> {
  const loaded = await loadLead(supabase, leadId);
  if (!loaded) return { email: false, whatsapp: false, sms: false, skipped: "lead não encontrado" };

  const { lead, vars } = loaded;
  if (lead.status !== "open") {
    return { email: false, whatsapp: false, sms: false, skipped: `lead ${lead.status}` };
  }

  const content = stageContent(stage, vars, settings?.templates);

  const out = await deliver(
    supabase,
    lead,
    vars,
    {
      email: settings?.channel_email !== false,
      whatsapp: settings?.channel_whatsapp === true,
      sms: settings?.channel_sms === true,
    },
    content,
    `cart-recovery:stage-${stage}`,
  );

  await supabase
    .from("cart_leads")
    .update({ stage, stage_started_at: new Date().toISOString() })
    .eq("id", leadId);

  return out;
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
    if (!parsed.success) {
      return json({ error: "Dados inválidos", details: parsed.error.issues }, 400);
    }
    const body = parsed.data;

    const allowed = isServiceRole(auth, serviceKey) || (await isAdmin(supabase, auth));
    if (!allowed) return json({ error: "forbidden" }, 403);

    const { data: settings } = await supabase
      .from("cart_recovery_settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    // --- Contato avulso do admin ---
    if (body.action === "manual") {
      const loaded = await loadLead(supabase, body.leadId);
      if (!loaded) return json({ error: "lead não encontrado" }, 404);

      const { lead, vars } = loaded;
      const channel: Channel = body.channel;
      const fallback = channel === "sms"
        ? smsStageDefault(1, vars)
        : stageMessage(1, vars);
      const text = body.message || fallback;

      const out = await deliver(
        supabase,
        lead,
        vars,
        {
          email: channel === "email",
          whatsapp: channel === "whatsapp",
          sms: channel === "sms",
        },
        {
          subject: body.subject || `Sobre ${vars.produto}`,
          emailBody: text,
          whatsappBody: text,
          smsBody: text,
        },
        "cart-recovery:manual",
      );

      // Contato manual também reinicia a contagem do próximo estágio: quem
      // acabou de receber mensagem não deve levar outra do robô no minuto
      // seguinte.
      await supabase
        .from("cart_leads")
        .update({ stage_started_at: new Date().toISOString() })
        .eq("id", lead.id);

      if (channel === "email" && !out.email) {
        return json({ error: "e-mail não enfileirado (configuração inativa)" }, 422);
      }
      if (channel === "whatsapp" && !out.whatsapp) {
        return json({ error: lead.phone ? "falha no envio do WhatsApp" : "lead sem telefone" }, 422);
      }
      if (channel === "sms" && !out.sms) {
        return json({
          error: lead.phone
            ? "SMS não enviado (IntegraX inativa ou mensagem acima de 160 caracteres)"
            : "lead sem telefone",
        }, 422);
      }
      return json({ ok: true, ...out });
    }

    // --- Estágio específico ---
    if (body.action === "stage") {
      const out = await sendStage(supabase, body.leadId, body.stage, settings);
      if (out.skipped) return json({ ok: false, skipped: out.skipped }, 422);
      return json({ ok: true, ...out });
    }

    // --- SWEEP (cron) ---
    const stageMinutes: number[] = settings?.stage_minutes ?? [10, 300, 1440];
    const now = Date.now();
    let abandoned = 0;
    let sent = 0;

    // 1. Passou do grace sem pagar: vira abandono e emite o webhook.
    const { data: fresh } = await supabase
      .from("cart_leads")
      .select("id")
      .eq("status", "open")
      .is("abandoned_at", null)
      .lt("last_activity_at", new Date(now - (stageMinutes[0] ?? 10) * 60_000).toISOString())
      .limit(100);

    for (const lead of fresh ?? []) {
      await supabase
        .from("cart_leads")
        .update({ abandoned_at: new Date().toISOString() })
        .eq("id", lead.id);
      await supabase.rpc("enqueue_cart_abandoned_webhook", { p_lead_id: lead.id });
      abandoned++;
    }

    if (!settings?.enabled) {
      return json({ ok: true, abandoned, sent, paused: true });
    }

    // 2. Estágios vencidos. `stage` é o índice em `stage_minutes` do contato
    //    já enviado, então o próximo atraso é `stageMinutes[stage]`.
    const { data: due } = await supabase
      .from("cart_leads")
      .select("id, stage, stage_started_at")
      .eq("status", "open")
      .not("abandoned_at", "is", null)
      .lt("stage", stageMinutes.length)
      .limit(100);

    for (const lead of due ?? []) {
      const elapsed = (now - new Date(lead.stage_started_at).getTime()) / 60_000;
      const delay = stageMinutes[lead.stage] ?? stageMinutes[stageMinutes.length - 1];
      if (elapsed < delay) continue;
      await sendStage(supabase, lead.id, lead.stage + 1, settings);
      sent++;
    }

    // 3. Parado há mais de 7 dias depois do último estágio: sai do funil.
    const lastMinutes = stageMinutes[stageMinutes.length - 1] ?? 1440;
    await supabase
      .from("cart_leads")
      .update({ status: "expired" })
      .eq("status", "open")
      .gte("stage", stageMinutes.length)
      .lt("stage_started_at", new Date(now - (lastMinutes + 7 * 1440) * 60_000).toISOString());

    return json({ ok: true, abandoned, sent });
  } catch (error: any) {
    logger.error("[cart-recovery] erro", error);
    return json({ error: error?.message ?? "Internal error" }, 500);
  }
});
