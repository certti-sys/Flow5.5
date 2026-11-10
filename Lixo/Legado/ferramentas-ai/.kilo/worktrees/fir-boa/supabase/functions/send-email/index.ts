import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const EmailRequestSchema = z.object({
  to: z.string().email(),
  toName: z.string().optional(),
  type: z.enum(['welcome', 'notification', 'password_reset', 'custom']),
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
  template_colors: Record<string, string> | null
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

function getDefaultWelcomeTemplate(colors: Record<string, string>): string {
  return `<!DOCTYPE html><html><body style=\"background-color: ${colors.background}\"><h1>Olá, {{user_name}}!</h1><p>Sua senha é: {{temp_password}}</p><a href=\"{{login_url}}\">Acessar</a></body></html>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    logger.info(`Email request received`);

    const bodyRaw = await req.json();
    const resultValidation = EmailRequestSchema.safeParse(bodyRaw);
    
    if (!resultValidation.success) {
      logger.error('Invalid email request data', resultValidation.error.format());
      return new Response(
        JSON.stringify({ error: 'Dados inválidos', details: resultValidation.error.format() }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { to, toName, type, subject, html, variables } = resultValidation.data;

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(
      supabase,
      to, // Rate limit per recipient email
      'send-email',
      10,      // 10 emails
      60 * 60  // per hour per recipient
    );

    if (!rateLimit.allowed) {
      logger.warn(`Rate limit hit for email recipient: ${to}`);
      return new Response(
        JSON.stringify({ 
          error: 'Muitas solicitações para este e-mail.', 
          retryAfter: rateLimit.retryAfter 
        }), 
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) } 
        }
      );
    }

    const { data: settings } = await supabase.from('email_settings').select('*').eq('is_active', true).single()
    if (!settings) {
      logger.error('Active email settings not found');
      return new Response(JSON.stringify({ error: 'Settings not found' }), { status: 400, headers: corsHeaders })
    }

    const eSettings = settings as EmailSettings
    const colors = eSettings.template_colors || { primary: '#FF4136', background: '#f4f4f5' }

    let fSubject = subject || ''
    let fHtml = html || ''

    if (type === 'welcome') {
      fSubject = eSettings.welcome_subject || 'Bem-vindo!'
      fHtml = replaceVariables(eSettings.welcome_template || getDefaultWelcomeTemplate(colors), { ...variables, login_url: variables.login_url || '' })
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

    if (result.success) {
      logger.info('Email sent successfully');
    } else {
      logger.error('Failed to send email', { error: result.error });
    }

    return new Response(JSON.stringify(result), { headers: corsHeaders })
  } catch (error: any) { 
    logger.error('Error in send-email', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders }) 
  }
})

