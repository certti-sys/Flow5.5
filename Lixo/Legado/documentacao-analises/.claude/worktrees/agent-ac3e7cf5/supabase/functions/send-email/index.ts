import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, validateCSRF } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const EmailRequestSchema = z.object({
  to: z.string().email(),
  toName: z.string().optional(),
  type: z.enum(['welcome', 'notification', 'password_reset', 'custom', 'level_up', 'achievement_unlocked', 'streak_at_risk']),
  subject: z.string().optional(),
  html: z.string().optional(),
  variables: z.record(z.string()).optional().default({}),
});

type EmailRequest = z.infer<typeof EmailRequestSchema>;

interface EmailSettings {
  provider: string
  smtp_host: string | null
  smtp_port: number | null
  smtp_user: string | null
  smtp_password: string | null
  smtp_secure: boolean | null
  brevo_api_key: string | null
  from_email: string
  from_name: string
  welcome_subject: string | null
  welcome_template: string | null
  template_colors: Record<string, any> | null
}

async function sendViaBrevo(
  apiKey: string,
  fromEmail: string,
  fromName: string,
  to: string,
  toName: string | undefined,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to, name: toName || to }],
        subject: subject,
        htmlContent: html,
      }),
    })
    const data = await response.json()
    if (!response.ok) {
      logger.error('Error via Brevo', data);
      return { success: false, error: data.message || 'Error via Brevo' }
    }
    return { success: true, messageId: data.messageId }
  } catch (error: any) { 
    logger.error('Brevo exception', error);
    return { success: false, error: error.message } 
  }
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '')
  }
  return result
}

function getBrandedWrapper(content: string, vars: { 
  logo_url: string, 
  platform_name: string, 
  primary_color: string,
  subject: string,
  greeting: string 
}): string {
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
    .button { display: inline-block; padding: 14px 28px; background-color: ${vars.primary_color || '#fbbf24'}; color: #000000; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        ${vars.logo_url ? `<img src="${vars.logo_url}" alt="${vars.platform_name}" class="logo">` : ''}
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const bodyRaw = await req.json();
    const resultValidation = EmailRequestSchema.safeParse(bodyRaw);
    
    if (!resultValidation.success) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: corsHeaders });
    }

    const { to, toName, type, subject, html, variables } = resultValidation.data;

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(supabase, to, 'send-email', 15, 3600);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Muitas solicitações' }), { status: 429, headers: corsHeaders });
    }

    const { data: settings } = await supabase.from('email_settings').select('*').eq('is_active', true).single()
    if (!settings) {
      return new Response(JSON.stringify({ error: 'Configurações de email inativas' }), { status: 400, headers: corsHeaders })
    }

    const { data: platform } = await supabase.from('platform_settings').select('*').eq('is_active', true).single()
    const platformName = platform?.name || 'Flow Members';
    const logoUrl = platform?.logo_horizontal_url || platform?.logo_image_url || '';

    const eSettings = settings as EmailSettings
    const templateColors = eSettings.template_colors || {}
    const toggles = templateColors.notification_toggles || {}
    const templates = templateColors.email_templates || {}

    // Check if notification type is enabled
    if (type !== 'welcome' && type !== 'password_reset' && type !== 'custom') {
      if (toggles[type] === false) {
        logger.info(`Notification type ${type} is disabled by admin. Skipping.`);
        return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
      }
    }

    let fSubject = subject || ''
    let fHtml = html || ''

    if (type === 'welcome') {
      fSubject = eSettings.welcome_subject || 'Bem-vindo!'
      fHtml = replaceVariables(eSettings.welcome_template || '', { ...variables, login_url: variables.login_url || '' })
    } else if (templates[type]) {
      const template = templates[type];
      fSubject = replaceVariables(template.subject || '', variables);
      const greeting = replaceVariables(template.greeting || '', variables);
      const message = replaceVariables(template.message || '', variables);
      
      fHtml = getBrandedWrapper(message, {
        logo_url: logoUrl,
        platform_name: platformName,
        primary_color: platform?.gradient_end_color || '#fbbf24',
        subject: fSubject,
        greeting: greeting
      });
      
      fHtml = replaceVariables(fHtml, variables);
    }

    let result = await sendViaBrevo(eSettings.brevo_api_key!, eSettings.from_email, eSettings.from_name, to, toName, fSubject, fHtml)

    await supabase.from('email_logs').insert({ 
      recipient_email: to, 
      recipient_name: toName, 
      subject: fSubject, 
      email_type: type, 
      provider: eSettings.provider, 
      status: result.success ? 'sent' : 'failed', 
      error_message: result.error 
    })

    return new Response(JSON.stringify(result), { headers: corsHeaders })
  } catch (error: any) { 
    logger.error('Error in send-email', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders }) 
  }
})


