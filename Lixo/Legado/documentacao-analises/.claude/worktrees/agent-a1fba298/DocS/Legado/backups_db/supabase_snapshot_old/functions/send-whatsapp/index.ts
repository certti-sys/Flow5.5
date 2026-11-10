import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WhatsAppRequest {
  phone: string;
  templateKey?: string;
  message?: string;
  variables?: Record<string, string>;
}

interface WhatsAppSettings {
  provider: string;
  evolution_api_url?: string;
  evolution_api_key?: string;
  evolution_instance_name?: string;
  default_country_code: string;
  send_typing_indicator: boolean;
  delay_between_messages: number;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\\\{\\\\{${key}\\\\}\\\\}`, 'g'), value || '');
  }
  return result;
}

function formatPhoneNumber(phone: string, countryCode: string): string {\n  // Remove all non-digit characters\n  let formatted = phone.replace(/\\D/g, '');\n  \n  // Add country code if not present\n  if (!formatted.startsWith(countryCode)) {\n    formatted = countryCode + formatted;\n  }\n  \n  return formatted;\n}

async function sendViaEvolution(
  settings: WhatsAppSettings,
  phone: string,
  message: string
): Promise<{ success: boolean; result?: any; error?: string }> {\n  const { evolution_api_url, evolution_api_key, evolution_instance_name, send_typing_indicator, delay_between_messages } = settings;\n\n  if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {\n    return { success: false, error: 'Evolution API credentials not configured' };\n  }\n\n  try {\n    // Send typing indicator if enabled\n    if (send_typing_indicator) {\n      await fetch(`${evolution_api_url}/chat/presence/${evolution_instance_name}`, {\n        method: 'POST',\n        headers: {\n          'Content-Type': 'application/json',\n          'apikey': evolution_api_key,\n        },\n        body: JSON.stringify({\n          number: phone,\n          delay: delay_between_messages || 1000,\n          presence: 'composing',\n        }),\n      });\n      \n      // Wait for the typing indicator duration\n      await new Promise(resolve => setTimeout(resolve, delay_between_messages || 1000));\n    }\n\n    // Send the message\n    const response = await fetch(`${evolution_api_url}/message/sendText/${evolution_instance_name}`, {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n        'apikey': evolution_api_key,\n      },\n      body: JSON.stringify({\n        number: phone,\n        text: message,\n      }),\n    });\n\n    const result = await response.json();\n\n    if (!response.ok) {\n      console.error('Evolution API error:', result);\n      return { success: false, error: result.message || 'Failed to send WhatsApp message' };\n    }\n\n    return { success: true, result };\n  } catch (error: any) {\n    console.error('Evolution API exception:', error);\n    return { success: false, error: error.message || 'Evolution API connection failed' };\n  }\n}

Deno.serve(async (req) => {\n  // Handle CORS preflight requests\n  if (req.method === 'OPTIONS') {\n    return new Response(null, { headers: corsHeaders });\n  }\n\n  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;\n  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;\n  const supabase = createClient(supabaseUrl, supabaseServiceKey);\n\n  try {\n    const { phone, templateKey, message, variables } = await req.json() as WhatsAppRequest;\n\n    if (!phone) {\n      throw new Error('Phone number is required');\n    }\n\n    // Fetch WhatsApp settings\n    const { data: settings, error: settingsError } = await supabase\n      .from('whatsapp_settings')\n      .select('*')\n      .eq('is_active', true)\n      .maybeSingle();\n\n    if (settingsError) {\n      console.error('Error fetching settings:', settingsError);\n      throw new Error('Failed to fetch WhatsApp settings');\n    }\n\n    if (!settings) {\n      throw new Error('WhatsApp settings not configured');\n    }\n\n    let finalMessage = message || '';\n    let usedTemplateKey: string | null = null;\n\n    // If templateKey provided, fetch template from database\n    if (templateKey && !message) {\n      const { data: template, error: templateError } = await supabase\n        .from('message_templates')\n        .select('message, active')\n        .eq('key', templateKey)\n        .single();\n\n      if (templateError || !template) {\n        console.error('Template not found:', templateKey);\n        throw new Error(`Template '\${templateKey}' not found`);\n      }\n\n      // If template is inactive, skip sending\n      if (!template.active) {\n        console.log('Template is inactive, skipping message');\n        \n        // Log the skipped message\n        await supabase.from('whatsapp_logs').insert({\n          phone,\n          template_key: templateKey,\n          message_preview: null,\n          provider: settings.provider,\n          status: 'skipped',\n          error_message: 'Template inactive',\n          metadata: { variables },\n        });\n\n        return new Response(\n          JSON.stringify({ success: true, skipped: true, reason: 'Template inactive' }),\n          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n        );\n      }\n\n      finalMessage = template.message;\n      usedTemplateKey = templateKey;\n    }\n\n    // Replace variables in the message\n    if (variables) {\n      finalMessage = replaceVariables(finalMessage, variables);\n    }\n\n    // Format phone number\n    const formattedPhone = formatPhoneNumber(phone, settings.default_country_code || '55');\n\n    console.log('Sending WhatsApp message to:', formattedPhone);\n    console.log('Provider:', settings.provider);\n    console.log('Message preview:', finalMessage.substring(0, 100) + (finalMessage.length > 100 ? '...' : ''));\n\n    // Send via the configured provider\n    let result: { success: boolean; result?: any; error?: string };\n\n    switch (settings.provider) {\n      case 'evolution':\n        result = await sendViaEvolution(settings, formattedPhone, finalMessage);\n        break;\n      // Future providers can be added here\n      // case 'zapi':\n      //   result = await sendViaZAPI(settings, formattedPhone, finalMessage);\n      //   break;\n      default:\n        result = { success: false, error: `Unknown provider: \${settings.provider}` };\n    }\n\n    // Log the result\n    await supabase.from('whatsapp_logs').insert({\n      phone: formattedPhone,\n      template_key: usedTemplateKey,\n      message_preview: finalMessage.substring(0, 200),\n      provider: settings.provider,\n      status: result.success ? 'sent' : 'failed',\n      error_message: result.error || null,\n      metadata: { variables, result: result.result },\n    });\n\n    if (!result.success) {\n      throw new Error(result.error || 'Failed to send message');\n    }\n\n    console.log('Message sent successfully');\n\n    return new Response(\n      JSON.stringify({ success: true, result: result.result }),\n      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n    );\n  } catch (error: any) {\n    console.error('Error sending WhatsApp:', error);\n    return new Response(\n      JSON.stringify({ error: error.message || 'Internal server error' }),\n      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n    );\n  }\n});\n
