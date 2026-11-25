-- Fase 2 das pendências restantes:
--   (4) webhooks de saída — autenticação alternativa bearer_token
--   (5) opt-out do ranking (LGPD)

-- ============================================================
-- 4. bearer_token por endpoint de webhook
-- ============================================================
alter table public.webhook_endpoints
  add column if not exists bearer_token text;

comment on column public.webhook_endpoints.bearer_token is
  'Token opcional enviado como Authorization: Bearer <token> além da assinatura HMAC X-Flow-Signature';

-- Catálogo: os 3 eventos que faltavam (os 4 subscription.* entram com assinaturas).
-- OUTBOUND_EVENTS no front já contém order.expired e cart.abandoned; aqui só
-- registramos os eventos que o dispatcher precisa saber emitir.
-- (nenhuma alteração de payload: build_order_webhook_payload já cobre pedido)

-- ============================================================
-- 5. Opt-out do ranking
-- ============================================================
alter table public.profiles
  add column if not exists leaderboard_opt_out boolean not null default false;

comment on column public.profiles.leaderboard_opt_out is
  'Quando true, o membro não aparece em get_leaderboard_v2 (LGPD)';

-- A RPC é SECURITY DEFINER com search_path=''; precisa ser recriada com o filtro.
create or replace function public.get_leaderboard_v2(period_type text default 'global')
returns table (
  user_id uuid,
  user_name text,
  avatar_url text,
  total_xp integer,
  level integer,
  current_streak integer
)
language sql
stable
security definer
set search_path = ''
as $$
  with bounds as (
    select case lower(coalesce(period_type, 'global'))
             when 'weekly'  then date_trunc('week', now())
             when 'monthly' then date_trunc('month', now())
             else null
           end as start_at
  ),
  ranked as (
    select
      p.id as user_id,
      coalesce(nullif(btrim(p.name), ''), 'Membro Oculto') as user_name,
      p.avatar_url,
      coalesce(s.level, 1) as level,
      coalesce(s.current_streak, 0) as current_streak,
      case
        when b.start_at is null then coalesce(s.total_xp, 0)
        else coalesce((
          select count(*) * 50
          from public.user_progress up
          where up.user_id = p.id
            and up.completed = true
            and coalesce(up.completed_at, up.created_at) >= b.start_at
        ), 0)
      end::integer as total_xp
    from public.profiles p
    left join public.user_stats s on s.user_id = p.id
    cross join bounds b
    where coalesce(p.status, 'active') = 'active'
      and coalesce(p.leaderboard_opt_out, false) = false
  )
  select r.user_id, r.user_name, r.avatar_url, r.total_xp, r.level, r.current_streak
  from ranked r
  order by r.total_xp desc, r.level desc, r.user_name asc
  limit 100;
$$;

revoke all on function public.get_leaderboard_v2(text) from public;
grant execute on function public.get_leaderboard_v2(text) to authenticated;

notify pgrst, 'reload schema';
