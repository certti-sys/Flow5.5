// E-mail diário de conteúdo liberado pelo drip (item 7 das pendências).
//
// Uma chamada por dia (cron 12:00 UTC = 09:00 Brasília). A RPC devolve só o
// que foi liberado dentro do dia e ainda não teve e-mail (tabela de dedupe).
// O e-mail é enfileirado com type 'notification' — respeita opt-out e toggle
// do admin — e agrupado: UM por aluno/dia, nunca um por aula.
//
// Body: { date?: 'YYYY-MM-DD', dryRun?: boolean }
// dryRun calcula e devolve contagem/amostra sem enfileirar nem marcar dedupe.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateCSRF } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { enqueueEmail } from "../_shared/email-queue.ts";

function brasiliaDate(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  });
  return fmt.format(new Date());
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  try {
    // Só service role pode disparar (cron e testes administrativos).
    // Comparar com a env var não funciona: ela não é a JWT enviada pelo vault.
    // O claim `role` do JWT é a fonte confiável.
    const auth = req.headers.get('Authorization') ?? '';
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    let isServiceRole = false;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      isServiceRole = decoded?.role === 'service_role';
    } catch { /* token inválido */ }
    if (!isServiceRole) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const date = typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date)
      ? body.date : brasiliaDate();
    const dryRun = body.dryRun === true;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: rows, error } = await supabase.rpc('get_drip_releases_for_date', { p_date: date });
    if (error) throw error;

    const grupos = new Map<string, { email: string; name: string; itens: any[] }>();
    for (const r of rows ?? []) {
      if (!grupos.has(r.user_id)) {
        grupos.set(r.user_id, { email: r.email, name: r.user_name, itens: [] });
      }
      grupos.get(r.user_id)!.itens.push({
        kind: r.kind,
        title: r.item_title,
        course: r.course_name,
        at: r.available_at,
      });
    }

    if (dryRun) {
      return new Response(JSON.stringify({
        date, dryRun: true,
        users: grupos.size,
        items: (rows ?? []).length,
        amostra: [...grupos.values()].slice(0, 2),
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let enqueued = 0;
    for (const [userId, g] of grupos) {
      const cursos = [...new Set(g.itens.map((i) => i.course))];
      const itens = g.itens.map((i) => `${i.kind === 'module' ? 'Módulo' : 'Aula'}: ${i.title} (${i.course})`);
      const ok = await enqueueEmail(supabase, {
        to: g.email,
        toName: g.name,
        type: 'notification',
        source: 'drip-release-email',
        variables: {
          user_name: g.name,
          cursos: cursos.join(', '),
          itens: itens.join('\n'),
          login_url: '',
        },
      });
      if (!ok) continue;
      const { error: dedupeError } = await supabase
        .from('drip_release_notifications')
        .upsert({ user_id: userId, release_date: date }, { onConflict: 'user_id,release_date', ignoreDuplicates: true });
      if (!dedupeError) enqueued++;
    }

    return new Response(JSON.stringify({
      date, users: grupos.size, items: (rows ?? []).length, enqueued,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    logger.error('[drip-release-email] falha', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
