import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';

function discoverFields(obj: any, prefix: string = ''): any[] {
  const fields: any[] = [];
  if (!obj) return fields;
  if (Array.isArray(obj)) {
    if (obj.length > 0) fields.push(...discoverFields(obj[0], `${prefix}[0]`));
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof value === 'object') fields.push(...discoverFields(value, path));
      else fields.push({ path, type: typeof value, example: value });
    }
  }
  return fields;
}

function getValueByPath(obj: any, path: string): any {
  if (!path) return obj;
  const parts = path.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  let current = obj;
  for (const part of parts) {
    if (!current) return undefined;
    current = current[part];
  }
  return current;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const url = new URL(req.url);
    const token = url.pathname.split('/')[2] || url.searchParams.get('token');
    const body = await req.json();
    logger.info(`Webhook ingest received`, { token, mode: token ? 'processing' : 'discovery' });

    if (token) {
      const { data: receiver } = await supabase
        .from('webhook_event_receivers')
        .select('*, webhook_platforms(*)')
        .eq('webhook_token', token)
        .single();

      if (!receiver) {
        return new Response(
          JSON.stringify({ error: 'Invalid token' }),
          { status: 404, headers: corsHeaders }
        );
      }

      let email = '', prodId = '', txId = '';
      for (const m of receiver.field_mappings) {
        const val = getValueByPath(body, m.source_path);
        if (m.internal_field === 'customer_email') email = val;
        if (m.internal_field === 'external_product_id') prodId = String(val);
        if (m.internal_field === 'external_transaction_id') txId = String(val);
      }

      const { data: mapping } = await supabase
        .from('product_mappings')
        .select('course_id')
        .eq('platform_id', receiver.platform_id)
        .eq('external_product_id', prodId)
        .single();

      if (mapping) {
        const { data: user } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (user) {
          await supabase
            .from('user_course_access')
            .upsert({ user_id: user.id, course_id: mapping.course_id });
        }
      }

      await supabase.from('webhook_transactions').insert({
        platform_id: receiver.platform_id,
        external_transaction_id: txId,
        customer_email: email,
        status: 'processed',
        raw_payload: body,
      });

      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ success: true, mode: 'discovery' }),
      { headers: corsHeaders }
    );

  } catch (error: any) {
    logger.error(`Error in webhooks-ingest`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
});
