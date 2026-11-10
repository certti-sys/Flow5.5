import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: string
  toName?: string
  type: 'welcome' | 'notification' | 'password_reset' | 'custom'
  subject?: string
  html?: string
  variables?: Record<string, string>
}

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

// Enviar email via SMTP usando API externa
async function sendViaSMTP(
  settings: EmailSettings,
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Usar serviço SMTP2GO ou similar que aceita requisições HTTP
    // Como Deno não tem nodemailer nativo, usamos uma abordagem alternativa

    // Opção 1: Usar o Deno SMTP client
    const { SMTPClient } = await import('https://deno.land/x/denomailer@1.6.0/mod.ts')

    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host!,
        port: settings.smtp_port || 587,
        tls: settings.smtp_secure ?? true,
        auth: {
          username: settings.smtp_user!,
          password: settings.smtp_password!,
        },
      },
    })

    await client.send({
      from: `${settings.from_name} <${settings.from_email}>`,
      to: to,
      subject: subject,
      content: 'auto',
      html: html,
    })

    await client.close()

    return { success: true, messageId: crypto.randomUUID() }
  } catch (error: unknown) {
    console.error('SMTP Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no SMTP'
    return { success: false, error: errorMessage }
  }
}

// Enviar email via Brevo API
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
        sender: {
          name: fromName,
          email: fromEmail,
        },
        to: [
          {
            email: to,
            name: toName || to,
          },
        ],
        subject: subject,
        htmlContent: html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Brevo Error:', data)
      return { success: false, error: data.message || 'Erro ao enviar via Brevo' }
    }

    return { success: true, messageId: data.messageId }
  } catch (error: unknown) {
    console.error('Brevo Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no Brevo'
    return { success: false, error: errorMessage }
  }
}

// Substituir variáveis no template
function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    result = result.replace(regex, value || '')
  }
  return result
}

// Template padrão de boas-vindas
function getDefaultWelcomeTemplate(colors: Record<string, string>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: ${colors.background || '#f4f4f5'};">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${colors.primary || '#FF4136'}, ${colors.secondary || '#FF851B'}); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🎉 Bem-vindo(a)!
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="background-color: ${colors.cardBackground || '#ffffff'}; padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: ${colors.text || '#18181b'}; font-size: 22px;">
                Olá, {{user_name}}!
              </h2>
              
              <p style="margin: 0 0 20px 0; color: ${colors.muted || '#71717a'}; font-size: 16px; line-height: 1.6;">
                Sua conta foi criada com sucesso na nossa plataforma de cursos. 
                Abaixo estão suas credenciais de acesso:
              </p>
              
              <!-- Credentials Box -->
              <table role="presentation" style="width: 100%; background-color: ${colors.background || '#f4f4f5'}; border-radius: 8px; margin: 20px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0 0 10px 0; color: ${colors.text || '#18181b'}; font-size: 14px;">
                      <strong>📧 Email:</strong> {{user_email}}
                    </p>
                    <p style="margin: 0; color: ${colors.text || '#18181b'}; font-size: 14px;">
                      <strong>🔑 Senha temporária:</strong> {{temp_password}}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Warning -->
              <p style="margin: 20px 0; padding: 15px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; color: #92400E; font-size: 14px; border-radius: 0 8px 8px 0;">
                ⚠️ Por segurança, recomendamos que você altere sua senha após o primeiro acesso.
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="{{login_url}}" style="display: inline-block; background: linear-gradient(135deg, ${colors.primary || '#FF4136'}, ${colors.secondary || '#FF851B'}); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Acessar Plataforma
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: ${colors.cardBackground || '#ffffff'}; padding: 20px 30px; text-align: center; border-top: 1px solid ${colors.background || '#f4f4f5'}; border-radius: 0 0 12px 12px;">
              <p style="margin: 0; color: ${colors.muted || '#71717a'}; font-size: 12px;">
                {{platform_name}} - Todos os direitos reservados
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado. Token necessário.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      console.error('Auth error in send-email:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body: EmailRequest = await req.json()
    const { to, toName, type, subject, html, variables = {} } = body

    console.log(`Sending ${type} email to ${to}`)

    // Buscar configurações de email
    const { data: settings, error: settingsError } = await supabase
      .from('email_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      console.error('Email settings not found:', settingsError)
      return new Response(
        JSON.stringify({ success: false, error: 'Configurações de email não encontradas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const emailSettings = settings as EmailSettings
    const colors = emailSettings.template_colors || {
      primary: '#FF4136',
      secondary: '#FF851B',
      text: '#18181b',
      muted: '#71717a',
      background: '#f4f4f5',
      cardBackground: '#ffffff'
    }

    // Preparar subject e html baseado no tipo
    let finalSubject = subject || ''
    let finalHtml = html || ''

    if (type === 'welcome') {
      finalSubject = emailSettings.welcome_subject || 'Bem-vindo à plataforma! 🎉'
      const template = emailSettings.welcome_template || getDefaultWelcomeTemplate(colors)

      // Substituir variáveis de cores no template
      let processedTemplate = template
      for (const [key, value] of Object.entries(colors)) {
        processedTemplate = processedTemplate.replace(new RegExp(`{{color_${key}}}`, 'g'), value)
      }

      finalHtml = replaceVariables(processedTemplate, {
        ...variables,
        platform_name: variables.platform_name || 'EduStream',
        login_url: variables.login_url || `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/login`,
      })
    } else if (type === 'custom') {
      // Para emails customizados, usar o subject e html fornecidos
      finalHtml = replaceVariables(finalHtml, variables)
    }

    // Substituir variáveis finais
    finalSubject = replaceVariables(finalSubject, variables)

    // Enviar email baseado no provider
    let result: { success: boolean; error?: string; messageId?: string }

    if (emailSettings.provider === 'brevo' && emailSettings.brevo_api_key) {
      result = await sendViaBrevo(
        emailSettings.brevo_api_key,
        emailSettings.from_email,
        emailSettings.from_name,
        to,
        toName,
        finalSubject,
        finalHtml
      )
    } else if (emailSettings.provider === 'smtp' && emailSettings.smtp_host) {
      result = await sendViaSMTP(
        emailSettings,
        to,
        finalSubject,
        finalHtml
      )
    } else {
      result = { success: false, error: 'Nenhum provedor de email configurado corretamente' }
    }

    // Registrar no log
    await supabase.from('email_logs').insert({
      recipient_email: to,
      recipient_name: toName,
      subject: finalSubject,
      email_type: type,
      provider: emailSettings.provider,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      metadata: {
        messageId: result.messageId,
        variables: variables
      }
    })

    console.log(`Email ${result.success ? 'sent' : 'failed'}: ${result.error || result.messageId}`)

    return new Response(
      JSON.stringify(result),
      {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error: unknown) {
    console.error('Send email error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
