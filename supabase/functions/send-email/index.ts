import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, validateCSRF } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'
import {
  deliverEmail,
  isTypeEnabled,
  loadEmailSettings,
  renderEmail,
  type EmailType,
} from '../_shared/email.ts'
import { recordOptOut } from '../_shared/email-queue.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const EmailRequestSchema = z.object({
  to: z.string().email(),
  toName: z.string().optional(),
  type: z.enum(['welcome', 'notification', 'password_reset', 'custom', 'level_up', 'achievement_unlocked', 'streak_at_risk']),
  subject: z.string().optional(),
  html: z.string().optional(),
  variables: z.record(z.string()).optional().default({}),
  // Apelido legado: payment-ops e webhook-payment enviavam `data`.
  data: z.record(z.string()).optional(),
});

/**
 * Envio avulso e síncrono (teste de conexão, e-mail manual do admin).
 *
 * Chamadores de fluxo — pedido pago, boas-vindas, conquistas — não passam mais
 * por aqui: enfileiram em `email_logs` (`_shared/email-queue.ts`) para não
 * perder o e-mail quando o provedor cair.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const bodyRaw = await req.json();
    const resultValidation = EmailRequestSchema.safeParse(bodyRaw);

    if (!resultValidation.success) {
      return new Response(JSON.stringify({ error: 'Dados inválidos' }), { status: 400, headers: corsHeaders });
    }

    const { to, toName, type, subject, html, data } = resultValidation.data;
    const variables = { ...resultValidation.data.variables, ...(data ?? {}) };

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(supabase, to, 'send-email', 15, 3600);
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Muitas solicitações' }), { status: 429, headers: corsHeaders });
    }

    const settings = await loadEmailSettings(supabase);
    if (!settings) {
      return new Response(JSON.stringify({ error: 'Configurações de email inativas' }), { status: 400, headers: corsHeaders });
    }

    if (!isTypeEnabled(settings, type as EmailType)) {
      logger.info(`Notification type ${type} is disabled by admin. Skipping.`);
      return new Response(JSON.stringify({ success: true, skipped: true }), { headers: corsHeaders });
    }

    const { data: platform } = await supabase.from('platform_settings').select('*').eq('is_active', true).single();

    const rendered = renderEmail(settings, platform, {
      type: type as EmailType,
      subject,
      html,
      variables,
    });

    const result = await deliverEmail(settings, {
      to,
      toName,
      subject: rendered.subject,
      html: rendered.html,
    });

    // Chave ausente é erro de configuração, não tentativa do destinatário:
    // registra como antes (nenhuma linha) e devolve 503 para o painel instruir.
    if (!result.success && result.permanent && result.error?.includes('brevo_api_key')) {
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 503, headers: corsHeaders });
    }

    await supabase.from('email_logs').insert({
      recipient_email: to,
      recipient_name: toName,
      subject: rendered.subject,
      email_type: type,
      provider: settings.provider,
      status: result.success ? 'sent' : 'failed',
      error_message: result.error,
      sent_at: result.success ? new Date().toISOString() : null,
    });

    if (!result.success && result.permanent) {
      // Endereço morto/descadastrado no provedor: registra na lista para que
      // campanhas e fila não voltem a tentar.
      if (result.optOut) {
        await recordOptOut(supabase, to, result.error ?? 'hard bounce');
      }
      return new Response(JSON.stringify({ success: false, error: result.error }), { status: 422, headers: corsHeaders });
    }

    return new Response(JSON.stringify(result), { headers: corsHeaders });
  } catch (error: any) {
    logger.error('Error in send-email', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
})
