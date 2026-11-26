-- Aplica o guard de assinatura bloqueada em get_drip_releases_for_date.
-- A alteração em 20261126100000 não reexecuta em produção (migration já
-- aplicada), por isso esta migration recria a função com a cláusula extra.

create or replace function public.get_drip_releases_for_date(p_date date)
returns table (
  user_id uuid,
  email text,
  user_name text,
  kind text,
  item_id uuid,
  item_title text,
  course_id uuid,
  course_name text,
  available_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $function$
  with bounds as (
    select
      ((p_date + time '00:00') at time zone 'America/Sao_Paulo') as from_at,
      (((p_date + 1) + time '00:00') at time zone 'America/Sao_Paulo') as until_at
  ),
  acessos as (
    select uca.user_id, uca.course_id
      from public.user_course_access uca
    union
    select ucc.user_id, c.id
      from public.user_course_categories ucc
      join public.courses c on c.category = ucc.category
  ),
  elegiveis as (
    select a.user_id, a.course_id, p.email,
           coalesce(nullif(btrim(p.name), ''), 'Aluno') as user_name
      from acessos a
      join auth.users u on u.id = a.user_id
      join public.profiles p on p.id = a.user_id
      cross join bounds b
      where not public.has_role(a.user_id, 'admin'::public.app_role)
        -- Assinatura bloqueada não recebe aviso de "conteúdo liberado":
        -- conteúdo novo fica travado até a renovação (modelo híbrido).
        and public.subscription_content_unlocked(a.user_id, a.course_id)
        and not exists (
          select 1 from public.email_opt_outs eo
          where eo.email = lower(p.email)
        )
        and not exists (
          select 1 from public.drip_release_notifications drn
          where drn.user_id = a.user_id and drn.release_date = p_date
        )
  ),
  anchor as (
    select e.user_id, e.course_id, e.email, e.user_name,
      coalesce(
        (select uca.granted_at from public.user_course_access uca
          where uca.user_id = e.user_id and uca.course_id = e.course_id limit 1),
        (select min(ucc.created_at) from public.user_course_categories ucc
          join public.courses c on c.category = ucc.category
          where ucc.user_id = e.user_id and c.id = e.course_id)
      ) as start_at
    from elegiveis e
  ),
  mod as (
    select a.user_id, a.course_id, a.email, a.user_name, m.id, m.title,
      case
        when m.release_at_date is not null
          then ((m.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
        when m.release_after_days is not null
          then a.start_at + make_interval(days => m.release_after_days)
      end as scheduled_at
    from public.modules m
    join anchor a on a.course_id = m.course_id
  ),
  lesson as (
    select a.user_id, a.course_id, a.email, a.user_name, l.id, l.title,
      greatest(
        case
          when l.release_at_date is not null
            then ((l.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
          when l.release_after_days is not null
            then a.start_at + make_interval(days => l.release_after_days)
        end,
        m.scheduled_at
      ) as scheduled_at
    from public.lessons l
    join mod m on m.id = l.module_id
    join anchor a on a.user_id = m.user_id and a.course_id = m.course_id
  )
  select x.user_id, x.email, x.user_name, 'module'::text, x.id, x.title,
         x.course_id, c.title, x.scheduled_at
    from mod x join public.courses c on c.id = x.course_id
    cross join bounds b
   where x.scheduled_at >= b.from_at and x.scheduled_at < b.until_at
  union all
  select x.user_id, x.email, x.user_name, 'lesson'::text, x.id, x.title,
         x.course_id, c.title, x.scheduled_at
    from lesson x join public.courses c on c.id = x.course_id
    cross join bounds b
   where x.scheduled_at >= b.from_at and x.scheduled_at < b.until_at
  order by 1, 9, 6;
$function$;

revoke all on function public.get_drip_releases_for_date(date) from public, anon, authenticated;
grant execute on function public.get_drip_releases_for_date(date) to service_role;

notify pgrst, 'reload schema';
