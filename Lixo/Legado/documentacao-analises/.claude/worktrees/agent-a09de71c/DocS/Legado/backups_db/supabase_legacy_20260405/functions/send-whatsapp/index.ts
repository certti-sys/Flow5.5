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
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
  }
  return result;
}

function formatPhoneNumber(phone: string, countryCode: string): string {
  // Remove all non-digit characters
  let formatted = phone.replace(/\D/g, '');

  // Add country code if not present
  if (!formatted.startsWith(countryCode)) {
    formatted = countryCode + formatted;
  }

  return formatted;
}

async function sendViaEvolution(
  settings: WhatsAppSettings,
  phone: string,
  message: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  const { evolution_api_url, evolution_api_key, evolution_instance_name, send_typing_indicator, delay_between_messages } = settings;

  if (!evolution_api_url || !evolution_api_key || !evolution_instance_name) {
    return { success: false, error: 'Evolution API credentials not configured' };
  }

  try {
    // Send typing indicator if enabled
    if (send_typing_indicator) {
      await fetch(`${evolution_api_url}/chat/presence/${evolution_instance_name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolution_api_key,
        },
        body: JSON.stringify({
          number: phone,
          delay: delay_between_messages || 1000,
          presence: 'composing',
        }),
      });

      // Wait for the typing indicator duration
      await new Promise(resolve => setTimeout(resolve, delay_between_messages || 1000));
    }

    // Send the message
    const response = await fetch(`${evolution_api_url}/message/sendText/${evolution_instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolution_api_key,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Evolution API error:', result);
      return { success: false, error: result.message || 'Failed to send WhatsApp message' };
    }

    return { success: true, result };
  } catch (error: any) {
    console.error('Evolution API exception:', error);
    return { success: false, error: error.message || 'Evolution API connection failed' };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado. Token necessário.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) {
      console.error('Auth error in send-whatsapp:', authError)
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido ou expirado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { phone, templateKey, message, variables } = await req.json() as WhatsAppRequest;

    if (!phone) {
      throw new Error('Phone number is required');
    }

    // Fetch WhatsApp settings
    const { data: settings, error: settingsError } = await supabase
      .from('whatsapp_settings')
      .select('*')
      .eq('is_active', true)
      .maybeSingle();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw new Error('Failed to fetch WhatsApp settings');
    }

    if (!settings) {
      throw new Error('WhatsApp settings not configured');
    }

    let finalMessage = message || '';
    let usedTemplateKey: string | null = null;

    // If templateKey provided, fetch template from database
    if (templateKey && !message) {
      const { data: template, error: templateError } = await supabase
        .from('message_templates')
        .select('message, active')
        .eq('key', templateKey)
        .single();

      if (templateError || !template) {
        console.error('Template not found:', templateKey);
        throw new Error(`Template '${templateKey}' not found`);
      }

      // If template is inactive, skip sending
      if (!template.active) {
        console.log('Template is inactive, skipping message');

        // Log the skipped message
        await supabase.from('whatsapp_logs').insert({
          phone,
          template_key: templateKey,
          message_preview: null,
          provider: settings.provider,
          status: 'skipped',
          error_message: 'Template inactive',
          metadata: { variables },
        });

        return new Response(
          JSON.stringify({ success: true, skipped: true, reason: 'Template inactive' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      finalMessage = template.message;
      usedTemplateKey = templateKey;
    }

    // Replace variables in the message
    if (variables) {
      finalMessage = replaceVariables(finalMessage, variables);
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phone, settings.default_country_code || '55');

    console.log('Sending WhatsApp message to:', formattedPhone);
    console.log('Provider:', settings.provider);
    console.log('Message preview:', finalMessage.substring(0, 100) + (finalMessage.length > 100 ? '...' : ''));

    // Send via the configured provider
    let result: { success: boolean; result?: any; error?: string };

    switch (settings.provider) {
      case 'evolution':
        result = await sendViaEvolution(settings, formattedPhone, finalMessage);
        break;
      // Future providers can be added here
      // case 'zapi':
      //   result = await sendViaZAPI(settings, formattedPhone, finalMessage);
      //   break;
      default:
        result = { success: false, error: `Unknown provider: ${settings.provider}` };
    }

    // Log the result
    await supabase.from('whatsapp_logs').insert({
      phone: formattedPhone,
      template_key: usedTemplateKey,
      message_preview: finalMessage.substring(0, 200),
      provider: settings.provider,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error || null,
      metadata: { variables, result: result.result },
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send message');
    }

    console.log('Message sent successfully');

    return new Response(
      JSON.stringify({ success: true, result: result.result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending WhatsApp:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
