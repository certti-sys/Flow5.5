import { logger } from "./logger.ts";

/**
 * Renderização e entrega de e-mail transacional.
 *
 * Vive aqui, e não em `send-email`, porque agora há dois chamadores: a edge
 * `send-email` (chamada avulsa/teste) e o drenador da fila durável
 * (`email-queue.ts`). Duplicar o render faria o e-mail da fila sair sem marca,
 * sem template e sem a checagem de bloqueio do Brevo.
 */

export type EmailSettings = {
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_secure: boolean | null;
  brevo_api_key: string | null;
  from_email: string;
  from_name: string;
  welcome_subject: string | null;
  welcome_template: string | null;
  template_colors: Record<string, any> | null;
};

export type EmailType =
  | "welcome"
  | "notification"
  | "password_reset"
  | "custom"
  | "level_up"
  | "achievement_unlocked"
  | "streak_at_risk";

export async function loadEmailSettings(supabase: any): Promise<EmailSettings | null> {
  const { data } = await supabase.from("email_settings").select("*").eq("is_active", true).single();
  return (data as EmailSettings) ?? null;
}

/** Tipos marcados pelo admin como desligados não devem ser enfileirados. */
export function isTypeEnabled(settings: EmailSettings, type: EmailType): boolean {
  if (type === "welcome" || type === "password_reset" || type === "custom") return true;
  const toggles = settings.template_colors?.notification_toggles ?? {};
  return toggles[type] !== false;
}

async function sendViaBrevo(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  to: string,
  toName: string | undefined,
  subject: string,
  html: string,
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to, name: toName || to }],
        subject,
        htmlContent: html,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      logger.error("Error via Brevo", data);
      return { success: false, error: data.message || "Error via Brevo" };
    }
    return { success: true, messageId: data.messageId };
  } catch (error: any) {
    logger.error("Brevo exception", error);
    return { success: false, error: error.message };
  }
}

/**
 * O Brevo aceita o POST e bloqueia depois, na fila: sem esta checagem o painel
 * mostra "enviado" e o e-mail nunca chega. Falha de rede aqui não bloqueia o
 * envio — é diagnóstico, não pré-requisito.
 */
async function isBrevoBlocked(apiKey: string, email: string): Promise<string | null> {
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/blockedContacts?limit=100", {
      headers: { accept: "application/json", "api-key": apiKey },
    });
    if (!response.ok) return null;

    const data = await response.json().catch(() => null);
    const hit = (data?.contacts ?? []).find(
      (c: any) => String(c?.email ?? "").toLowerCase() === email.toLowerCase(),
    );
    if (!hit) return null;

    const reason = hit?.reason?.message || hit?.reason?.code || "sem motivo informado";
    return `Destinatário bloqueado no Brevo (${reason})`;
  } catch {
    return null;
  }
}

export function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value || "");
  }
  return result;
}

function getBrandedWrapper(
  content: string,
  vars: {
    logo_url: string;
    platform_name: string;
    primary_color: string;
    subject: string;
    greeting: string;
  },
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; margin: 0; padding: 0; }
    .wrapper { background-color: #f4f4f5; padding: 40px 20px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); }
    .header { background-color: #18181b; padding: 40px 20px; text-align: center; }
    .logo { height: 40px; margin-bottom: 20px; }
    .title { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em; }
    .content { padding: 40px; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: 600; color: #18181b; margin-bottom: 16px; }
    .message { font-size: 16px; color: #52525b; margin-bottom: 32px; white-space: pre-line; }
    .footer { padding: 20px; text-align: center; font-size: 12px; color: #a1a1aa; background-color: #fafafa; }
    .button { display: inline-block; padding: 14px 28px; background-color: ${vars.primary_color || "#fbbf24"}; color: #000000; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        ${vars.logo_url ? `<img src="${vars.logo_url}" alt="${vars.platform_name}" class="logo">` : ""}
        <h1 class="title">${vars.subject}</h1>
      </div>
      <div class="content">
        <div class="greeting">${vars.greeting}</div>
        <div class="message">${content}</div>
        <div style="text-align: center;">
          <a href="{{login_url}}" class="button">Acessar Plataforma</a>
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} ${vars.platform_name}. Todos os direitos reservados.
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

export type RenderedEmail = { subject: string; html: string; skipped: boolean };

/** Monta assunto e HTML a partir do template do admin; cai no texto padrão. */
export function renderEmail(
  settings: EmailSettings,
  platform: any,
  input: {
    type: EmailType;
    subject?: string;
    html?: string;
    variables?: Record<string, string>;
  },
): RenderedEmail {
  // `login_url` vazio, não ausente: o botão do wrapper usa `{{login_url}}` e um
  // `replaceVariables` sem a chave deixaria o link literal no HTML.
  const variables = { login_url: "", ...(input.variables ?? {}) };
  const platformName = platform?.name || "Flow Members";
  const logoUrl = platform?.logo_horizontal_url || platform?.logo_image_url || "";
  const templates = settings.template_colors?.email_templates ?? {};

  let fSubject = input.subject || "";
  let fHtml = input.html || "";

  if (input.type === "welcome" && settings.welcome_template) {
    fSubject = settings.welcome_subject || "Bem-vindo!";
    fHtml = replaceVariables(settings.welcome_template, {
      ...variables,
      login_url: variables.login_url || "",
    });
  } else if (templates[input.type]) {
    const template = templates[input.type];
    fSubject = replaceVariables(template.subject || settings.welcome_subject || "", variables);
    const greeting = replaceVariables(template.greeting || "", variables);
    const message = replaceVariables(template.message || "", variables);

    fHtml = getBrandedWrapper(message, {
      logo_url: logoUrl,
      platform_name: platformName,
      primary_color: platform?.gradient_end_color || "#fbbf24",
      subject: fSubject,
      greeting,
    });

    fHtml = replaceVariables(fHtml, variables);
  }

  // Sem template configurado (ex.: instalação nova) o e-mail sairia vazio.
  if (!fHtml.trim()) {
    fSubject = fSubject || settings.welcome_subject || "Bem-vindo!";
    fHtml = getBrandedWrapper(
      replaceVariables(
        "Sua conta foi criada.\n\nE-mail: {{user_email}}\nSenha temporária: {{temp_password}}\n\nRecomendamos alterar a senha no primeiro acesso.",
        variables,
      ),
      {
        logo_url: logoUrl,
        platform_name: platformName,
        primary_color: platform?.gradient_end_color || "#fbbf24",
        subject: fSubject,
        greeting: `Olá, ${variables.user_name || ""}`.trim(),
      },
    );
    fHtml = replaceVariables(fHtml, variables);
  }

  return { subject: fSubject, html: fHtml, skipped: false };
}

export type DeliveryResult = {
  success: boolean;
  /** `true` quando não adianta insistir (sem chave, destinatário bloqueado). */
  permanent?: boolean;
  error?: string;
};

/** Renderiza e entrega. Quem chama é dono de registrar o resultado na fila. */
export async function deliverEmail(
  settings: EmailSettings,
  input: { to: string; toName?: string; subject: string; html: string },
): Promise<DeliveryResult> {
  if (!settings.brevo_api_key) {
    return { success: false, permanent: true, error: "brevo_api_key não configurada em email_settings" };
  }

  const blocked = await isBrevoBlocked(settings.brevo_api_key, input.to);
  if (blocked) return { success: false, permanent: true, error: blocked };

  const result = await sendViaBrevo(
    settings.brevo_api_key,
    settings.from_email,
    settings.from_name,
    input.to,
    input.toName,
    input.subject,
    input.html,
  );

  return { success: result.success, error: result.error };
}
