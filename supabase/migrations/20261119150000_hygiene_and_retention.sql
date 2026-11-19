-- Fase 9 — higiene: retenção agendada, opt-out em hard bounce, expurgo LGPD.
--
-- Três dívidas que só custavam manutenção manual:
--
-- 1. `retention-cron` (streak em risco) existia como edge function e nunca era
--    chamada: nenhum `cron.schedule` apontava para ela. Entra no mesmo desenho
--    dos outros drenadores (URL no vault, `trigger_*` com `net.http_post`).
--    Uma vez por dia: a função manda mensagem para todo mundo cujo streak
--    venceu ontem, então rodar de hora em hora repetiria o aviso 24 vezes.
--
-- 2. E-mail com hard bounce no Brevo continuava sendo tentado. O 13º
--    `email_logs.status='failed'` tem "This contact's email address generated
--    a hard bounce" e `email_opt_outs` seguia vazia: cada campanha gastava
--    reputação de domínio em endereço morto. O bloqueio agora vira opt-out
--    na origem (ver `_shared/email.ts`).
--
-- 3. `cart_leads` guarda nome/telefone/CPF de quem não comprou, sem prazo.
--    A nota de LGPD do plano promete 90 dias. Passado o prazo o lead vira
--    `expired` e é apagado na mesma rodada — o que interessa para métrica é a
--    contagem, não o dado pessoal.

-- ============================================================================
-- RETENÇÃO — streak em risco
-- ============================================================================

--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/retention-cron',
--     'retention_cron_dispatch_url');
create or replace function public.trigger_retention_cron()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
    v_url text;
    v_key text;
begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'retention_cron_dispatch_url' limit 1;
    select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
    if v_url is null or v_key is null then
        return;
    end if;

    perform net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_key
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 15000
    );
exception when others then
    -- Rede fora: a rodada de amanhã resolve.
    null;
end;
$function$;

-- ============================================================================
-- LGPD — expurgo do funil
-- ============================================================================

create or replace function public.purge_stale_cart_leads(p_days integer default 90)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_expired integer;
    v_cutoff timestamptz := now() - make_interval(days => greatest(coalesce(p_days, 90), 1));
begin
    update public.cart_leads
       set status = 'expired',
           updated_at = now()
     where status = 'open'
       and created_at < v_cutoff;
    get diagnostics v_expired = row_count;

    -- `open` recente fica; o que já saiu do funil some junto com o PII.
    delete from public.cart_leads
     where status <> 'open'
       and created_at < v_cutoff;

    return v_expired;
end;
$function$;

revoke execute on function public.purge_stale_cart_leads(integer) from public, anon, authenticated;

-- ============================================================================
-- LOGS INTERNOS — tabela que a área de monitoramento já anunciava
-- ============================================================================

-- `src/lib/monitoring.ts` insere em `system_logs` quando o admin liga
-- "Logs internos", e `/admin/monitoring` lê dela. A tabela nunca foi criada:
-- o insert falhava calado e o painel mostrava sempre zero.
create table if not exists public.system_logs (
    id uuid primary key default gen_random_uuid(),
    level text not null default 'info' check (level in ('info', 'warn', 'error')),
    message text not null,
    details jsonb not null default '{}'::jsonb,
    user_id uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now()
);

create index if not exists idx_system_logs_created_at on public.system_logs (created_at desc);

alter table public.system_logs enable row level security;

-- Escrita é do app; leitura é só admin. Fica em `authenticated` e não em
-- `anon` de propósito: `check (true)` para visitante seria porta aberta para
-- encher a tabela sem login. Log de boot anônimo simplesmente não persiste.
drop policy if exists "Authenticated write system logs" on public.system_logs;
create policy "Authenticated write system logs" on public.system_logs
    for insert to authenticated
    with check (length(message) <= 2000 and length(details::text) <= 20000);

drop policy if exists "Admins read system logs" on public.system_logs;
create policy "Admins read system logs" on public.system_logs
    for select to authenticated using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins delete system logs" on public.system_logs;
create policy "Admins delete system logs" on public.system_logs
    for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Retenção de 7 dias é o que o painel promete ao admin.
create or replace function public.purge_system_logs(p_days integer default 7)
returns integer
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_deleted integer;
begin
    delete from public.system_logs
     where created_at < now() - make_interval(days => greatest(coalesce(p_days, 7), 1));
    get diagnostics v_deleted = row_count;
    return v_deleted;
end;
$function$;

revoke execute on function public.purge_system_logs(integer) from public, anon, authenticated;

-- ============================================================================
-- AGENDAMENTO
-- ============================================================================

do $$
begin
    if exists (select 1 from cron.job where jobname = 'retention-cron') then
        perform cron.unschedule('retention-cron');
    end if;
    if exists (select 1 from cron.job where jobname = 'purge-cart-leads') then
        perform cron.unschedule('purge-cart-leads');
    end if;
    if exists (select 1 from cron.job where jobname = 'purge-system-logs') then
        perform cron.unschedule('purge-system-logs');
    end if;
end;
$$;

-- 21:00 UTC = fim do dia no Brasil, quando o streak de fato "vence".
select cron.schedule(
    'retention-cron',
    '0 21 * * *',
    'select public.trigger_retention_cron();'
);

select cron.schedule(
    'purge-cart-leads',
    '15 3 * * *',
    'select public.purge_stale_cart_leads();'
);

select cron.schedule(
    'purge-system-logs',
    '25 3 * * *',
    'select public.purge_system_logs();'
);

-- ============================================================================
-- SEED — CSS Moderno não tinha aula nenhuma
-- ============================================================================

-- Curso aparecia na vitrine com 1 módulo vazio: progresso 0/0, player morto.
-- Aulas com vídeos públicos conferidos (oembed) e gratuitas, coerentes com o
-- módulo "Fundamentos de CSS".
insert into public.lessons (module_id, title, duration, video_url, order_index, description, is_public)
select v.module_id::uuid, v.title, v.duration, v.video_url, v.order_index, v.description, true
  from (values
    ('550e8400-e29b-41d4-a716-446655440104', 'Como o CSS entra na página', '12min',
     'https://www.youtube.com/watch?v=yfoY53QXEnI', 0,
     'Seletores, cascata e especificidade: por que a regra que você escreveu não foi a que valeu.'),
    ('550e8400-e29b-41d4-a716-446655440104', 'Box model na prática', '20min',
     'https://www.youtube.com/watch?v=1PnVor36_40', 1,
     'Margin, border, padding e content. O que ocupa espaço e o que não ocupa.'),
    ('550e8400-e29b-41d4-a716-446655440104', 'Flexbox e Grid', '15min',
     'https://www.youtube.com/watch?v=Z4pCqK-V_Wo', 2,
     'Quando usar cada um e como alinhar sem `margin: auto` na base do desespero.'),
    ('550e8400-e29b-41d4-a716-446655440104', 'Layout responsivo completo', '60min',
     'https://www.youtube.com/watch?v=1Rs2ND1ryYc', 3,
     'Do mobile ao desktop: media queries, unidades relativas e o layout inteiro montado.')
  ) as v(module_id, title, duration, video_url, order_index, description)
 where exists (select 1 from public.modules m where m.id = v.module_id::uuid)
   and not exists (
       select 1 from public.lessons l
        where l.module_id = v.module_id::uuid and l.title = v.title
   );
