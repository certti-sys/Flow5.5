-- F3 do plano de assinaturas: drip respeita assinatura bloqueada.
--
-- Regras:
--   * admin nunca bloqueia (inalterado);
--   * com assinatura ATIVA -> comportamento atual (só release_after_days/future);
--   * com acesso BLOQUEADO -> TODOS os módulos/aulas aparecem como travados,
--     inclusive os que não têm data de liberação. Nada é apagado.
--
-- As expressões de data seguem literalmente 20261125120000 (âncora granted_at,
-- fuso America/Sao_Paulo, greatest(aula, módulo)).

-- ------------------------------------------------------------
-- RPC do aluno (auth.uid())
-- ------------------------------------------------------------
create or replace function public.get_course_release_map(p_course_id uuid)
returns table (kind text, id uuid, available_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with anchor as (
    select coalesce(
      (select uca.granted_at from public.user_course_access uca
        where uca.user_id = auth.uid()
          and uca.course_id = p_course_id
        limit 1),
      (select min(ucc.created_at) from public.user_course_categories ucc
        join public.courses c on c.category = ucc.category
        where ucc.user_id = auth.uid() and c.id = p_course_id)
    ) as start_at
  ),
  bloqueado as (
    select not public.subscription_content_unlocked(auth.uid(), p_course_id) as sim
  ),
  mod as (
    select m.id,
      case
        when m.release_at_date is not null
          then ((m.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
        when m.release_after_days is not null
          then (select a.start_at from anchor a) + make_interval(days => m.release_after_days)
      end as scheduled_at
    from public.modules m where m.course_id = p_course_id
  ),
  lesson as (
    select l.id,
      greatest(
        case
          when l.release_at_date is not null
            then ((l.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
          when l.release_after_days is not null
            then (select a.start_at from anchor a) + make_interval(days => l.release_after_days)
        end,
        mod.scheduled_at
      ) as scheduled_at
    from public.lessons l join mod on mod.id = l.module_id
  )
  select 'module'::text, mod.id,
         case when b.sim then now() + interval '1 day' else mod.scheduled_at end
    from mod cross join bloqueado b
   where (b.sim or mod.scheduled_at > now())
     and not public.has_role(auth.uid(), 'admin'::public.app_role)
  union all
  select 'lesson'::text, lesson.id,
         case when b.sim then now() + interval '1 day' else lesson.scheduled_at end
    from lesson cross join bloqueado b
   where (b.sim or lesson.scheduled_at > now())
     and not public.has_role(auth.uid(), 'admin'::public.app_role);
$$;

revoke all on function public.get_course_release_map(uuid) from public, anon;
grant execute on function public.get_course_release_map(uuid) to authenticated;

-- ------------------------------------------------------------
-- RPC da service role (p_user_id explícito)
-- ------------------------------------------------------------
create or replace function public.get_course_release_map_for(p_user_id uuid, p_course_id uuid)
returns table (kind text, id uuid, available_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with anchor as (
    select coalesce(
      (select uca.granted_at from public.user_course_access uca
        where uca.user_id = p_user_id
          and uca.course_id = p_course_id
        limit 1),
      (select min(ucc.created_at) from public.user_course_categories ucc
        join public.courses c on c.category = ucc.category
        where ucc.user_id = p_user_id and c.id = p_course_id)
    ) as start_at
  ),
  bloqueado as (
    select not public.subscription_content_unlocked(p_user_id, p_course_id) as sim
  ),
  mod as (
    select m.id,
      case
        when m.release_at_date is not null
          then ((m.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
        when m.release_after_days is not null
          then (select a.start_at from anchor a) + make_interval(days => m.release_after_days)
      end as scheduled_at
    from public.modules m where m.course_id = p_course_id
  ),
  lesson as (
    select l.id,
      greatest(
        case
          when l.release_at_date is not null
            then ((l.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
          when l.release_after_days is not null
            then (select a.start_at from anchor a) + make_interval(days => l.release_after_days)
        end,
        mod.scheduled_at
      ) as scheduled_at
    from public.lessons l join mod on mod.id = l.module_id
  )
  select 'module'::text, mod.id,
         case when b.sim then now() + interval '1 day' else mod.scheduled_at end
    from mod cross join bloqueado b
   where (b.sim or mod.scheduled_at > now())
     and not public.has_role(p_user_id, 'admin'::public.app_role)
  union all
  select 'lesson'::text, lesson.id,
         case when b.sim then now() + interval '1 day' else lesson.scheduled_at end
    from lesson cross join bloqueado b
   where (b.sim or lesson.scheduled_at > now())
     and not public.has_role(p_user_id, 'admin'::public.app_role);
$$;

revoke all on function public.get_course_release_map_for(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_course_release_map_for(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
