import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

/**
 * Receptor de eventos de plataformas externas (Hotmart, Kiwify, WooCommerce,
 * checkouts próprios).
 *
 * Fluxo: token na URL identifica o receptor; `field_mappings` extrai email,
 * produto e transação do payload da plataforma; `product_mappings` traduz
 * produto externo em curso; o acesso é concedido via trigger de banco.
 *
 * Endurecimentos em relação à versão anterior:
 *   - exige `is_active` no receptor **e** na plataforma;
 *   - assinatura HMAC opcional (`X-Flow-Signature: t=,v1=`), falha fechada
 *     quando o receptor tem `signing_secret`;
 *   - rate limit por receptor;
 *   - idempotência por `(platform_id, external_transaction_id)`;
 *   - tudo auditado em `webhook_receiver_events`.
 */

const MAX_BODY_BYTES = 256 * 1024;

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Aceita `t=<unix>,v1=<hex>` ou apenas o hex. Janela de 5 minutos. */
async function verifySignature(
  secret: string,
  header: string,
  rawBody: string,
): Promise<boolean> {
  const parts = header.split(',').map((p) => p.trim());
  let timestamp = '';
  let provided = '';

  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = v ?? '';
    if (k === 'v1') provided = (v ?? '').toLowerCase();
  }

  if (!provided && /^[a-f0-9]{64}$/i.test(header.trim())) {
    provided = header.trim().toLowerCase();
  }
  if (!provided) return false;

  if (timestamp) {
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const payload = timestamp ? `${timestamp}.${rawBody}` : rawBody;
  const digest = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));

  return safeEqual(toHex(digest), provided);
}

function discoverFields(obj: unknown, prefix = ''): unknown[] {
  const fields: unknown[] = [];
  if (!obj) return fields;
  if (Array.isArray(obj)) {
    if (obj.length > 0) fields.push(...discoverFields(obj[0], `${prefix}[0]`));
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (value !== null && typeof value === 'object') fields.push(...discoverFields(value, path));
      else fields.push({ path, type: typeof value, example: value });
    }
  }
  return fields;
}

function getValueByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.replace(/\[/g, '.').replace(/\]/g, '').split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const url = new URL(req.url);
  const token = url.pathname.split('/')[2] || url.searchParams.get('token') || '';

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'payload too large' }, 413);

  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return json({ error: 'invalid json' }, 400);
  }

  // Sem token = modo descoberta: devolve o mapa de campos do payload para o
  // assistente do painel. Não escreve nada, então não precisa de auth além
  // do próprio painel já autenticado.
  if (!token) {
    logger.info('[webhooks-ingest] discovery', { bytes: raw.length });
    return json({ success: true, mode: 'discovery', fields: discoverFields(body) });
  }

  const { data: receiver, error: receiverError } = await supabase
    .from('webhook_event_receivers')
    .select('*, webhook_platforms(*)')
    .eq('webhook_token', token)
    .maybeSingle();

  if (receiverError) {
    logger.error('[webhooks-ingest] falha ao buscar receptor', receiverError);
    return json({ error: 'receiver lookup failed' }, 500);
  }
  if (!receiver) return json({ error: 'invalid token' }, 404);
  if (!receiver.is_active) return json({ error: 'receiver inactive' }, 403);

  const platform = receiver.webhook_platforms;
  if (!platform || !platform.is_active) {
    return json({ error: 'platform inactive' }, 403);
  }

  // Assinatura: obrigatória quando o receptor tem secret.
  const signingSecret: string = receiver.signing_secret || platform.webhook_secret || '';
  if (signingSecret) {
    const header = req.headers.get('x-flow-signature') || req.headers.get('x-webhook-signature') || '';
    if (!header) {
      await audit(supabase, receiver.id, body, 'rejected', 'missing signature');
      return json({ error: 'missing signature' }, 401);
    }
    const valid = await verifySignature(signingSecret, header, raw);
    if (!valid) {
      await audit(supabase, receiver.id, body, 'rejected', 'invalid signature');
      logger.warn('[webhooks-ingest] assinatura inválida', { receiverId: receiver.id });
      return json({ error: 'invalid signature' }, 401);
    }
  }

  const limit = await checkRateLimit(supabase, receiver.id, 'webhooks-ingest', 120, 60);
  if (!limit.allowed) {
    return json({ error: 'too many requests', retryAfter: limit.retryAfter }, 429);
  }

  const mappings: Array<{ source_path: string; internal_field: string }> =
    Array.isArray(receiver.field_mappings) ? receiver.field_mappings : [];

  const pick = (field: string): string => {
    const mapping = mappings.find((m) => m.internal_field === field);
    if (!mapping) return '';
    const value = getValueByPath(body, mapping.source_path);
    return value === undefined || value === null ? '' : String(value).trim();
  };

  const email = pick('customer_email');
  const externalProductId = pick('external_product_id');
  const externalTransactionId = pick('external_transaction_id');

  if (!email) {
    await audit(supabase, receiver.id, body, 'rejected', 'missing customer_email');
    return json({ error: 'missing customer_email mapping or value' }, 422);
  }

  // Idempotência: mesma transação não libera acesso duas vezes.
  if (externalTransactionId) {
    const { data: existing } = await supabase
      .from('webhook_transactions')
      .select('id, status')
      .eq('platform_id', receiver.platform_id)
      .eq('external_transaction_id', externalTransactionId)
      .maybeSingle();

    if (existing) {
      await audit(supabase, receiver.id, body, 'duplicate', null, externalTransactionId);
      return json({ success: true, duplicate: true });
    }
  }

  // Curso: fixo no receptor, ou via product_mappings.
  let courseId: string | null = receiver.fixed_course_id ?? null;
  if (!courseId && externalProductId) {
    const { data: mapping } = await supabase
      .from('product_mappings')
      .select('course_id, is_active')
      .eq('platform_id', receiver.platform_id)
      .eq('external_product_id', externalProductId)
      .maybeSingle();

    if (mapping?.is_active) courseId = mapping.course_id;
  }

  if (!courseId) {
    await audit(supabase, receiver.id, body, 'rejected', 'no course mapped', externalTransactionId);
    return json({ error: 'no course mapped for this product' }, 422);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle();

  if (!profile) {
    await audit(supabase, receiver.id, body, 'rejected', 'unknown customer', externalTransactionId);
    return json({ error: 'customer not found' }, 404);
  }

  const { error: grantError } = await supabase
    .from('user_course_access')
    .upsert(
      { user_id: profile.id, course_id: courseId, source: 'webhook', granted_by: null },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true },
    );

  if (grantError) {
    logger.error('[webhooks-ingest] falha ao conceder acesso', grantError);
    await audit(supabase, receiver.id, body, 'error', grantError.message, externalTransactionId);
    return json({ error: 'grant failed' }, 500);
  }

  await supabase.from('webhook_transactions').insert({
    platform_id: receiver.platform_id,
    external_transaction_id: externalTransactionId || null,
    external_product_id: externalProductId || null,
    customer_email: email,
    status: 'processed',
    event_type: 'purchase',
    raw_payload: body,
    user_id: profile.id,
    course_id: courseId,
    processed_at: new Date().toISOString(),
    processing_result: { granted: true },
  });

  await audit(supabase, receiver.id, body, 'granted', null, externalTransactionId);

  return json({ success: true, granted: true });
});

async function audit(
  supabase: any,
  receiverId: string,
  body: any,
  outcome: string,
  reason: string | null = null,
  externalTransactionId: string | null = null,
): Promise<void> {
  try {
    await supabase.from('webhook_receiver_events').insert({
      receiver_id: receiverId,
      external_transaction_id: externalTransactionId,
      outcome,
      reason,
      actor_email: typeof body?.email === 'string' ? body.email.slice(0, 320) : null,
    });
    await supabase.rpc('bump_webhook_receiver_count', { p_receiver_id: receiverId });
  } catch (err) {
    logger.warn('[webhooks-ingest] falha ao auditar', err);
  }
}
