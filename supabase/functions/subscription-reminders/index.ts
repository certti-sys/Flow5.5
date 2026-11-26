// Notificações de assinatura (F4 do plano de assinaturas):
//   expiry_warning     -> D-notify_days_before antes do vencimento
//   renewal            -> D0, com link de renovação via renewal_token
//   renewal_confirmed  -> D+1, após pagamento confirmado
//
// Um aviso por (assinatura, tipo, dia) — tabela subscription_notifications.
// E-mail pela fila durável (type 'notification' respeita opt-out), WhatsApp
// por message_templates. dryRun calcula e devolve contagem sem enviar nada.
//
// Body: { date?: 'YYYY-MM-DD', dryRun?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { enqueueEmail } from "../_shared/email-queue.ts";

function brasiliaDate(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

const TEMPLATES = {
  expiry_warning: 'subscription_expiry_warning',
  renewal: 'subscription_renewal',
  renewal_confirmed: 'subscription_renewal_confirmed',
} as const;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  let isServiceRole = false;
  try {
    const decoded = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    isServiceRole = decoded?.role === 'service_role';
  } catch { /* token inválido */ }
  if (!isServiceRole) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }

  try {
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date : brasiliaDate();
    const dryRun = body.dryRun === true;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error } = await supabase.rpc('get_subscription_reminders', { p_date: date });
    if (error) throw error;

    const porTipo: Record<string, number> = {};
    const amostra: any[] = [];
    let enviados = 0;

    for (const r of rows ?? []) {
      const kind = r.kind as keyof typeof TEMPLATES;
      porTipo[kind] = (porTipo[kind] ?? 0) + 1;
      if (amostra.length < 3) amostra.push({ kind, email: r.email, product: r.product_name });

      if (dryRun) continue;

      const ok = await enqueueEmail(supabase, {
        to: r.email,
        toName: r.user_name,
        type: 'notification',
        source: 'subscription-reminders',
        variables: {
          user_name: r.user_name,
          product_name: r.product_name,
          renewal_date: r.renewal_date,
          days_left: String(r.days_left),
          renewal_url: r.renewal_url,
          login_url: '',
        },
      });
      if (ok) {
        const { error: dedupeError } = await supabase
          .from('subscription_notifications')
          .upsert(
            { subscription_id: r.subscription_id, kind, sent_on: date },
            { onConflict: 'subscription_id,kind,sent_on', ignoreDuplicates: true },
          );
        if (!dedupeError) enviados++;
      }

      if (r.whatsapp) {
        const base = Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '');
        await fetch(`${base}/functions/v1/send-whatsapp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({
            phone: r.whatsapp,
            templateKey: TEMPLATES[kind],
            variables: {
              user_name: r.user_name,
              product_name: r.product_name,
              renewal_date: r.renewal_date,
              days_left: String(r.days_left),
              renewal_url: r.renewal_url,
            },
          }),
        }).catch((e) => logger.warn('[subscription-reminders] WhatsApp falhou', e));
      }
    }

    return new Response(JSON.stringify({
      date, dryRun, total: (rows ?? []).length, porTipo, enviados, amostra,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('[subscription-reminders] falha', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
