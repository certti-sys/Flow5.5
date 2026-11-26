-- Ajuste final do aviso renewal_confirmed.
-- Comparar updated_at com current_period_end não funciona: na renovação o
-- período já é o novo. Aqui "renovação" = atualização real no dia consultado
-- (updated_at > created_at + 1 min) com status ativo.

create or replace function public.get_subscription_reminders(p_date date)
returns table (
  subscription_id uuid,
  user_id uuid,
  email text,
  user_name text,
  whatsapp text,
  product_name text,
  kind text,
  renewal_date text,
  days_left integer,
  renewal_url text
)
language sql
stable
security definer
set search_path = public
as $function$
  with dia as (
    select
      ((p_date + time '00:00') at time zone 'America/Sao_Paulo') as from_at,
      (((p_date + 1) + time '00:00') at time zone 'America/Sao_Paulo') as until_at
  ),
  base as (
    select s.id as subscription_id, s.user_id, s.status,
           s.current_period_end, s.created_at, s.updated_at, s.metadata,
           u.email, coalesce(nullif(btrim(p.name), ''), 'Aluno') as user_name,
           p.name as product_name, pr.whatsapp,
           coalesce((s.metadata->>'notify_days_before')::int, 3) as notify_days
      from public.subscriptions s
      join auth.users u on u.id = s.user_id
      join public.profiles pr on pr.id = s.user_id
      left join public.products p on p.id = s.product_id
      where s.status in ('active', 'past_due', 'trialling')
  ),
  candidatos as (
    select b.*, 'expiry_warning'::text as kind,
           (b.current_period_end at time zone 'America/Sao_Paulo')::date::text as renewal_date,
           b.notify_days as days_left
      from base b cross join dia d
     where b.current_period_end >= d.from_at + make_interval(days => b.notify_days)
       and b.current_period_end <  d.until_at + make_interval(days => b.notify_days)
    union all
    select b.*, 'renewal'::text as kind,
           (b.current_period_end at time zone 'America/Sao_Paulo')::date::text as renewal_date,
           0 as days_left
      from base b cross join dia d
     where b.current_period_end >= d.from_at
       and b.current_period_end <  d.until_at
    union all
    select b.*, 'renewal_confirmed'::text as kind,
           (b.current_period_end at time zone 'America/Sao_Paulo')::date::text as renewal_date,
           1 as days_left
      from base b cross join dia d
     where b.status = 'active'
       and b.updated_at >= d.from_at
       and b.updated_at <  d.until_at
       and b.updated_at >  b.created_at + interval '1 minute'
  )
  select c.subscription_id, c.user_id, c.email, c.user_name, c.whatsapp,
         c.product_name, c.kind, c.renewal_date, c.days_left,
         coalesce(c.metadata->>'renewal_url', '') as renewal_url
    from candidatos c
   where not exists (
     select 1 from public.email_opt_outs eo
     where eo.email = lower(c.email)
   )
   and not exists (
     select 1 from public.subscription_notifications sn
     where sn.subscription_id = c.subscription_id
       and sn.kind = c.kind and sn.sent_on = p_date
   )
   and not public.has_role(c.user_id, 'admin'::public.app_role)
   order by c.kind, c.email;
$function$;

revoke all on function public.get_subscription_reminders(date) from public, anon, authenticated;
grant execute on function public.get_subscription_reminders(date) to service_role;

notify pgrst, 'reload schema';
