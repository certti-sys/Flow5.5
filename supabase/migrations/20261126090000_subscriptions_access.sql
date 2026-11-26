-- F1 do plano de assinaturas: schema + funções centralizadas de acesso.
--
-- Modelo HÍBRIDO (decisão 30 do AGENTS.md):
--   * vencimento BLOQUEIA, nunca apaga conta nem remove user_course_access;
--   * acesso já concedido continua legível (histórico, PDFs, progresso);
--   * conteúdo NOVO (drip) trava enquanto não renovar;
--   * granted_at NUNCA é reancorado na renovação — é a âncora do drip.

-- ============================================================
-- 1. subscriptions: status ampliado + índices de consulta
-- ============================================================
alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;

alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status = any (array[
    'trialling','active','canceled','incomplete','incomplete_expired',
    'past_due','unpaid','paused','expired','revoked'
  ]::text[]));

create index if not exists idx_subscriptions_user_status
  on public.subscriptions (user_id, status);

create index if not exists idx_subscriptions_period_end
  on public.subscriptions (current_period_end)
  where status in ('active', 'past_due');

create unique index if not exists idx_subscriptions_gateway_external
  on public.subscriptions (gateway_id, external_subscription_id)
  where external_subscription_id is not null;

-- ============================================================
-- 2. user_course_access: estado sem apagar a linha
-- ============================================================
alter table public.user_course_access
  add column if not exists expires_at timestamptz,
  add column if not exists subscription_id uuid
    references public.subscriptions(id) on delete set null,
  add column if not exists access_status text not null default 'active',
  add column if not exists blocked_at timestamptz;

alter table public.user_course_access
  drop constraint if exists user_course_access_status_check;

alter table public.user_course_access
  add constraint user_course_access_status_check
  check (access_status in ('active', 'blocked', 'revoked'));

create index if not exists idx_user_course_access_status
  on public.user_course_access (user_id, course_id, access_status);

comment on column public.user_course_access.access_status is
  'active = acesso cheio; blocked = histórico legível, conteúdo novo travado; revoked = sem acesso';

-- ============================================================
-- 3. Dedupe de avisos de assinatura (F4 vai usar)
-- ============================================================
create table if not exists public.subscription_notifications (
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  kind text not null check (kind in ('expiry_warning','renewal','renewal_confirmed')),
  sent_on date not null default current_date,
  created_at timestamptz not null default now(),
  primary key (subscription_id, kind, sent_on)
);

alter table public.subscription_notifications enable row level security;

drop policy if exists "Admins read subscription notifications" on public.subscription_notifications;
create policy "Admins read subscription notifications" on public.subscription_notifications
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

grant select on public.subscription_notifications to authenticated;

-- ============================================================
-- 4. Funções centralizadas
--
-- Duas perguntas distintas, para não confundir "pode entrar" com
-- "pode ver conteúdo novo":
--   subscription_access_active   -> histórico legível (blocked PASSA)
--   subscription_content_unlocked -> conteúdo novo (blocked NÃO passa)
-- ============================================================
create or replace function public.subscription_access_active(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
      from public.user_course_access uca
     where uca.user_id = p_user_id
       and uca.course_id = p_course_id
       and uca.access_status in ('active', 'blocked')
  );
$function$;

create or replace function public.subscription_content_unlocked(p_user_id uuid, p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $function$
  select exists (
    select 1
      from public.user_course_access uca
     where uca.user_id = p_user_id
       and uca.course_id = p_course_id
       and uca.access_status = 'active'
       and (uca.expires_at is null or uca.expires_at > now())
  );
$function$;

revoke all on function public.subscription_access_active(uuid, uuid) from public, anon;
revoke all on function public.subscription_content_unlocked(uuid, uuid) from public, anon;
grant execute on function public.subscription_access_active(uuid, uuid) to authenticated, service_role;
grant execute on function public.subscription_content_unlocked(uuid, uuid) to authenticated, service_role;

-- Admin nunca sofre bloqueio por assinatura.
comment on function public.subscription_access_active(uuid, uuid) is
  'Acesso a histórico: blocked passa, revoked não. Admin é tratado à parte pelas RPCs.';

notify pgrst, 'reload schema';
