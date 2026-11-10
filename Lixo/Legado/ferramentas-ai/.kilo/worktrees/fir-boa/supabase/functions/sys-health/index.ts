import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const status: Record<string, any> = {
    timestamp: new Date().toISOString(),
    services: {
      database: 'down',
      email: 'unconfigured',
      whatsapp: 'unconfigured'
    },
    version: '1.0.0'
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check Database & Profiles
    const { count, error: dbError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .limit(1);
    
    if (!dbError) {
      status.services.database = 'up';
    } else {
      status.services.database = 'error';
      status.services.database_detail = dbError.message;
    }

    // 2. Check Email Settings
    const { data: emailSettings, error: emailError } = await supabase
      .from('email_settings')
      .select('is_active, provider')
      .eq('is_active', true)
      .maybeSingle();

    if (emailSettings) {
      status.services.email = 'ready';
      status.services.email_provider = emailSettings.provider;
    } else if (emailError) {
      status.services.email = 'error';
    }

    // 3. Check WhatsApp Settings
    const { data: waSettings, error: waError } = await supabase
      .from('whatsapp_settings')
      .select('is_active, provider')
      .eq('is_active', true)
      .maybeSingle();

    if (waSettings) {
      status.services.whatsapp = 'ready';
      status.services.whatsapp_provider = waSettings.provider;
    } else if (waError) {
      status.services.whatsapp = 'error';
    }

    logger.info('System health check performed');
    
    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    logger.error('Health check failed', error);
    return new Response(JSON.stringify({ 
      status: 'critical_error', 
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
