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
  } catch (error: unknown) {\n    console.error('SMTP Error:', error)\n    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no SMTP'\n    return { success: false, error: errorMessage }\n  }\n}\n\n// Enviar email via Brevo API\nasync function sendViaBrevo(\n  apiKey: string,\n  fromEmail: string,\n  fromName: string,\n  to: string,\n  toName: string | undefined,\n  subject: string,\n  html: string\n): Promise<{ success: boolean; error?: string; messageId?: string }> {\n  try {\n    const response = await fetch('https://api.brevo.com/v3/smtp/email', {\n      method: 'POST',\n      headers: {\n        'accept': 'application/json',
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

    if (!response.ok) {\n      console.error('Brevo Error:', data)\n      return { success: false, error: data.message || 'Erro ao enviar via Brevo' }\n    }

    return { success: true, messageId: data.messageId }
  } catch (error: unknown) {\n    console.error('Brevo Error:', error)\n    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido no Brevo'\n    return { success: false, error: errorMessage }\n  }\n}\n\n// Substituir variáveis no template\nfunction replaceVariables(template: string, variables: Record<string, string>): string {\n  let result = template\n  for (const [key, value] of Object.entries(variables)) {\n    const regex = new RegExp(`{{${key}}}`, 'g')\n    result = result.replace(regex, value || '')\n  }\n  return result\n}

// Template padrão de boas-vindas
function getDefaultWelcomeTemplate(colors: Record<string, string>): string {\n  return `\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n</head>\n<body style=\"margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: \${colors.background || '#f4f4f5'};\">\n  <table role=\"presentation\" style=\"width: 100%; border-collapse: collapse;\">\n    <tr>\n      <td align=\"center\" style=\"padding: 40px 0;\">\n        <table role=\"presentation\" style=\"width: 100%; max-width: 600px; border-collapse: collapse;\">\n          <!-- Header -->\n          <tr>\n            <td style=\"background: linear-gradient(135deg, \${colors.primary || '#FF4136'}, \${colors.secondary || '#FF851B'}); padding: 40px 30px; text-align: center; border-radius: 12px 12px 0 0;\">\n              <h1 style=\"margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;\">\n                🎉 Bem-vindo(a)!\n              </h1>\n            </td>\n          </tr>\n          \n          <!-- Content -->\n          <tr>\n            <td style=\"background-color: \${colors.cardBackground || '#ffffff'}; padding: 40px 30px;\">\n              <h2 style=\"margin: 0 0 20px 0; color: \${colors.text || '#18181b'}; font-size: 22px;\">\n                Olá, {{user_name}}!\n              </h2>\n              \n              <p style=\"margin: 0 0 20px 0; color: \${colors.muted || '#71717a'}; font-size: 16px; line-height: 1.6;\">\n                Sua conta foi criada com sucesso na nossa plataforma de cursos. \n                Abaixo estão suas credenciais de acesso:\n              </p>\n              \n              <!-- Credentials Box -->\n              <table role=\"presentation\" style=\"width: 100%; background-color: \${colors.background || '#f4f4f5'}; border-radius: 8px; margin: 20px 0;\">\n                <tr>\n                  <td style=\"padding: 20px;\">\n                    <p style=\"margin: 0 0 10px 0; color: \${colors.text || '#18181b'}; font-size: 14px;\">\n                      <strong>📧 Email:</strong> {{user_email}}\n                    </p>\n                    <p style=\"margin: 0; color: \${colors.text || '#18181b'}; font-size: 14px;\">\n                      <strong>🔑 Senha temporária:</strong> {{temp_password}}\n                    </p>\n                  </td>\n                </tr>\n              </table>\n              \n              <!-- Warning -->\n              <p style=\"margin: 20px 0; padding: 15px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; color: #92400E; font-size: 14px; border-radius: 0 8px 8px 0;\">\n                ⚠️ Por segurança, recomendamos que você altere sua senha após o primeiro acesso.\n              </p>\n              \n              <!-- CTA Button -->\n              <table role=\"presentation\" style=\"width: 100%; margin: 30px 0;\">\n                <tr>\n                  <td align=\"center\">\n                    <a href=\"{{login_url}}\" style=\"display: inline-block; background: linear-gradient(135deg, \${colors.primary || '#FF4136'}, \${colors.secondary || '#FF851B'}); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;\">\n                      Acessar Plataforma\n                    </a>\n                  </td>\n                </tr>\n              </table>\n            </td>\n          </tr>\n          \n          <!-- Footer -->\n          <tr>\n            <td style=\"background-color: \${colors.cardBackground || '#ffffff'}; padding: 20px 30px; text-align: center; border-top: 1px solid \${colors.background || '#f4f4f5'}; border-radius: 0 0 12px 12px;\">\n              <p style=\"margin: 0; color: \${colors.muted || '#71717a'}; font-size: 12px;\">\n                {{platform_name}} - Todos os direitos reservados\n              </p>\n            </td>\n          </tr>\n        </table>\n      </td>\n    </tr>\n  </table>\n</body>\n</html>\n  `\n}\n\nDeno.serve(async (req) => {\n  // Handle CORS preflight\n  if (req.method === 'OPTIONS') {\n    return new Response(null, { headers: corsHeaders })\n  }\n\n  try {\n    const supabaseUrl = Deno.env.get('SUPABASE_URL')!\n    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!\n    const supabase = createClient(supabaseUrl, supabaseServiceKey)\n\n    const body: EmailRequest = await req.json()\n    const { to, toName, type, subject, html, variables = {} } = body\n\n    console.log(`Sending \${type} email to \${to}`)\n\n    // Buscar configurações de email\n    const { data: settings, error: settingsError } = await supabase\n      .from('email_settings')\n      .select('*')\n      .eq('is_active', true)\n      .single()\n\n    if (settingsError || !settings) {\n      console.error('Email settings not found:', settingsError)\n      return new Response(\n        JSON.stringify({ success: false, error: 'Configurações de email não encontradas' }),\n        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n      )\n    }\n\n    const emailSettings = settings as EmailSettings\n    const colors = emailSettings.template_colors || {\n      primary: '#FF4136',\n      secondary: '#FF851B',\n      text: '#18181b',\n      muted: '#71717a',\n      background: '#f4f4f5',\n      cardBackground: '#ffffff'\n    }\n\n    // Preparar subject e html baseado no tipo\n    let finalSubject = subject || ''\n    let finalHtml = html || ''\n\n    if (type === 'welcome') {\n      finalSubject = emailSettings.welcome_subject || 'Bem-vindo à plataforma! 🎉'\n      const template = emailSettings.welcome_template || getDefaultWelcomeTemplate(colors)\n      \n      // Substituir variáveis de cores no template\n      let processedTemplate = template\n      for (const [key, value] of Object.entries(colors)) {\n        processedTemplate = processedTemplate.replace(new RegExp(`{{color_\${key}}}`, 'g'), value)\n      }\n      \n      finalHtml = replaceVariables(processedTemplate, {\n        ...variables,\n        platform_name: variables.platform_name || 'EduStream',\n        login_url: variables.login_url || `\${supabaseUrl.replace('.supabase.co', '.lovable.app')}/login`,\n      })\n    } else if (type === 'custom') {\n      // Para emails customizados, usar o subject e html fornecidos\n      finalHtml = replaceVariables(finalHtml, variables)\n    }\n\n    // Substituir variáveis finais\n    finalSubject = replaceVariables(finalSubject, variables)\n\n    // Enviar email baseado no provider\n    let result: { success: boolean; error?: string; messageId?: string }\n\n    if (emailSettings.provider === 'brevo' && emailSettings.brevo_api_key) {\n      result = await sendViaBrevo(\n        emailSettings.brevo_api_key,\n        emailSettings.from_email,\n        emailSettings.from_name,\n        to,\n        toName,\n        finalSubject,\n        finalHtml\n      )\n    } else if (emailSettings.provider === 'smtp' && emailSettings.smtp_host) {\n      result = await sendViaSMTP(\n        emailSettings,\n        to,\n        finalSubject,\n        finalHtml\n      )\n    } else {\n      result = { success: false, error: 'Nenhum provedor de email configurado corretamente' }\n    }\n\n    // Registrar no log\n    await supabase.from('email_logs').insert({\n      recipient_email: to,\n      recipient_name: toName,\n      subject: finalSubject,\n      email_type: type,\n      provider: emailSettings.provider,\n      status: result.success ? 'sent' : 'failed',\n      error_message: result.error,\n      metadata: {\n        messageId: result.messageId,\n        variables: variables\n      }\n    })\n\n    console.log(`Email \${result.success ? 'sent' : 'failed'}: \${result.error || result.messageId}`)\n\n    return new Response(\n      JSON.stringify(result),\n      { \n        status: result.success ? 200 : 500, \n        headers: { ...corsHeaders, 'Content-Type': 'application/json' } \n      }\n    )\n  } catch (error: unknown) {\n    console.error('Send email error:', error)\n    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'\n    return new Response(\n      JSON.stringify({ success: false, error: errorMessage }),\n      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n    )\n  }\n})\n
