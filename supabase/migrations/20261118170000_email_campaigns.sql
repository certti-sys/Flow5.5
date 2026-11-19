-- E-mail marketing: campanhas em massa com segmento, pausa e rastreio.
--
-- A entrega reaproveita `_shared/email.ts` (Brevo + marca). O que é próprio da
-- campanha fica em `email_campaign_sends`: uma linha por destinatário, que é o
-- que permite pausar no meio, contar progresso e saber quem abriu.
--
-- `email_logs` não serve para isso: lá a linha é o e-mail avulso, sem vínculo
-- com campanha, e o painel de logs viraria um mar de 5.000 linhas por disparo.

-- ============================================================================
-- OPT-OUT
-- ============================================================================
-- Exigência legal (LGPD/CAN-SPAM), não opcional: todo envio de campanha leva
-- link de descadastro, e a lista é consultada antes de qualquer enfileiramento.
create table if not exists public.email_opt_outs (
    email text primary key,
    reason text,
    source text not null default 'unsubscribe',
    created_at timestamptz not null default now()
);

alter table public.email_opt_outs enable row level security;

drop policy if exists "Admins read opt outs" on public.email_opt_outs;
create policy "Admins read opt outs" on public.email_opt_outs
    for select using (public.has_role(auth.uid(), 'admin'));

-- Sem policy de INSERT de propósito: opt-out é escrito pela edge
-- `campaign-track` (service role). Se qualquer visitante pudesse inserir,
-- um POST no PostgREST descadastraria o e-mail de outra pessoa.

-- ============================================================================
-- CAMPANHAS
-- ============================================================================

create table if not exists public.email_campaigns (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    subject text not null,
    body_html text not null default '',
    -- { all_customers: bool, product_ids: uuid[], course_ids: uuid[] }
    filter_config jsonb not null default '{}'::jsonb,
    status text not null default 'draft'
        check (status in ('draft', 'sending', 'paused', 'sent', 'cancelled')),
    total_recipients integer not null default 0,
    sent_count integer not null default 0,
    failed_count integer not null default 0,
    scheduled_at timestamptz,
    sent_at timestamptz,
    paused_at timestamptz,
    last_error text,
    -- Freio depois de uma rodada 100% falha (provedor fora do ar): sem isso o
    -- cron queima 30 tentativas por minuto contra um provedor caído.
    backoff_until timestamptz,
    created_by uuid references auth.users(id) on delete set null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.email_campaign_sends (
    id uuid primary key default gen_random_uuid(),
    campaign_id uuid not null references public.email_campaigns(id) on delete cascade,
    recipient_email text not null,
    recipient_name text,
    user_id uuid,
    status text not null default 'pending'
        check (status in ('pending', 'sent', 'failed', 'skipped')),
    error text,
    sent_at timestamptz,
    opened_at timestamptz,
    clicked_at timestamptz,
    -- Token opaco do pixel/descadastro: uuid já é inadivinhável, e assim a
    -- linha não precisa carregar assinatura HMAC no link.
    token uuid not null default gen_random_uuid(),
    created_at timestamptz not null default now(),
    -- O mesmo e-mail não recebe a mesma campanha duas vezes.
    unique (campaign_id, recipient_email)
);

create index if not exists idx_campaign_sends_queue
    on public.email_campaign_sends (campaign_id, status)
    where status = 'pending';

create index if not exists idx_campaign_sends_tracking
    on public.email_campaign_sends (id);

alter table public.email_campaigns enable row level security;
alter table public.email_campaign_sends enable row level security;

drop policy if exists "Admins manage campaigns" on public.email_campaigns;
create policy "Admins manage campaigns" on public.email_campaigns
    for all using (public.has_role(auth.uid(), 'admin'))
    with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins read campaign sends" on public.email_campaign_sends;
create policy "Admins read campaign sends" on public.email_campaign_sends
    for select using (public.has_role(auth.uid(), 'admin'));

create or replace function public.touch_email_campaigns_updated_at()
returns trigger
language plpgsql
as $function$
begin
    new.updated_at := now();
    return new;
end;
$function$;

drop trigger if exists touch_email_campaigns on public.email_campaigns;
create trigger touch_email_campaigns
    before update on public.email_campaigns
    for each row execute function public.touch_email_campaigns_updated_at();

-- ============================================================================
-- SEGMENTAÇÃO
-- ============================================================================
-- Base: quem tem conta (`profiles.email`) + quem comprou sem conta
-- (`orders.customer_email`). Deduplicado por e-mail em minúsculas — e-mail é a
-- chave de envio, não o usuário.
--
-- A checagem de admin é feita pelo claim do JWT, e não por `auth.uid()`, porque
-- a edge chama esta função com service role (uid nulo, mas role
-- `service_role`). Com `auth.uid()` puro o drenador tomaria `forbidden`.
create or replace function public.campaign_recipients(
    p_filter jsonb default '{}'::jsonb,
    p_limit integer default null
)
returns table (email text, name text, user_id uuid)
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'anon');
    v_all boolean := coalesce((p_filter ->> 'all_customers')::boolean, false);
    v_products uuid[] := case
        when jsonb_typeof(p_filter -> 'product_ids') = 'array'
            then array(select (jsonb_array_elements_text(p_filter -> 'product_ids'))::uuid)
        else null end;
    v_courses uuid[] := case
        when jsonb_typeof(p_filter -> 'course_ids') = 'array'
            then array(select (jsonb_array_elements_text(p_filter -> 'course_ids'))::uuid)
        else null end;
begin
    if v_role <> 'service_role' and not public.has_role(auth.uid(), 'admin') then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    -- Sem nenhum filtro o resultado é vazio: "todos" precisa ser explícito,
    -- senão um filtro mal montado dispararia para a base inteira.
    if not v_all and v_products is null and v_courses is null then
        return;
    end if;

    return query
    with base as (
        select lower(p.email) as email, max(p.name) as name, (array_agg(p.id))[1] as user_id
        from public.profiles p
        where p.email is not null and length(trim(p.email)) > 3
        group by lower(p.email)
        union all
        select lower(o.customer_email), max(o.customer_name), (array_agg(o.user_id))[1]
        from public.orders o
        where o.customer_email is not null and o.status = 'paid'
        group by lower(o.customer_email)
    ),
    merged as (
        select b.email, max(b.name) as name, (array_agg(b.user_id))[1] as user_id
        from base b
        group by b.email
    )
    select m.email, m.name, m.user_id
    from merged m
    where not exists (select 1 from public.email_opt_outs eo where eo.email = m.email)
      and (
        v_products is null
        or exists (
            select 1
            from public.orders o
            join public.order_items oi on oi.order_id = o.id
            where o.status = 'paid'
              and lower(o.customer_email) = m.email
              and oi.product_id = any (v_products)
        )
      )
      and (
        v_courses is null
        or (m.user_id is not null and exists (
            select 1 from public.user_course_access uca
            where uca.user_id = m.user_id and uca.course_id = any (v_courses)
        ))
      )
    order by m.email
    limit p_limit;
end;
$function$;

create or replace function public.campaign_recipient_count(p_filter jsonb default '{}'::jsonb)
returns integer
language sql
security definer
set search_path = public
as $function$
    select count(*)::int from public.campaign_recipients(p_filter, null);
$function$;

revoke all on function public.campaign_recipients(jsonb, integer) from public, anon;
revoke all on function public.campaign_recipient_count(jsonb) from public, anon;
grant execute on function public.campaign_recipients(jsonb, integer) to authenticated, service_role;
grant execute on function public.campaign_recipient_count(jsonb) to authenticated, service_role;

-- ============================================================================
-- CONTADORES
-- ============================================================================
-- `sent_count = sent_count + n` num UPDATE só: se um segundo drenador rodar em
-- paralelo (cron sobreposto por lentidão do provedor), nenhum sobrescreve o
-- número do outro lendo-e-gravando.
create or replace function public.bump_campaign_counts(
    p_campaign_id uuid,
    p_sent integer,
    p_failed integer
)
returns void
language sql
security definer
set search_path = public
as $function$
    update public.email_campaigns
       set sent_count = sent_count + greatest(p_sent, 0),
           failed_count = failed_count + greatest(p_failed, 0)
     where id = p_campaign_id;
$function$;

revoke all on function public.bump_campaign_counts(uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.bump_campaign_counts(uuid, integer, integer) to service_role;

-- ============================================================================
-- CRON
-- ============================================================================
-- Mesmo desenho dos outros drenadores: o job só existe de verdade depois de
--   select vault.create_secret(
--     'https://<ref>.supabase.co/functions/v1/send-campaign',
--     'campaign_dispatch_url');
create or replace function public.trigger_campaign_dispatch()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $function$
declare
    v_url text;
    v_key text;
begin
    select decrypted_secret into v_url from vault.decrypted_secrets where name = 'campaign_dispatch_url' limit 1;
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
        body := '{"action":"drain"}'::jsonb,
        timeout_milliseconds := 30000
    );
exception when others then
    null;
end;
$function$;

do $$
begin
    if exists (select 1 from cron.job where jobname = 'dispatch-campaigns') then
        perform cron.unschedule('dispatch-campaigns');
    end if;
end
$$;

select cron.schedule(
    'dispatch-campaigns',
    '* * * * *',
    'select public.trigger_campaign_dispatch();'
);
