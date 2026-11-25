-- Drip content: variante da liberação para uso server-side.
--
-- A edge `lesson-progress` fala com o banco usando a service role, e nesse
-- contexto `auth.uid()` é null — a função original responderia "nada travado"
-- para qualquer aluno, deixando a guarda inútil. Esta versão recebe o user
-- explícito e é executável **só** pela service role: um usuário autenticado não
-- consegue passar o id de outra pessoa e ler a agenda dela.

create or replace function public.get_course_release_map_for(
  p_user_id uuid,
  p_course_id uuid
)
returns table (kind text, id uuid, available_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  with anchor as (
    select coalesce(
      (select uca.granted_at
         from public.user_course_access uca
        where uca.user_id = p_user_id
          and uca.course_id = p_course_id
        limit 1),
      (select min(ucc.created_at)
         from public.user_course_categories ucc
         join public.courses c on c.category = ucc.category
        where ucc.user_id = p_user_id
          and c.id = p_course_id)
    ) as start_at
  ),
  mod as (
    select m.id,
           case
             when m.release_at_date is not null
               then ((m.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
             when m.release_after_days is not null
               then (select a.start_at from anchor a)
                    + make_interval(days => m.release_after_days)
           end as scheduled_at
      from public.modules m
     where m.course_id = p_course_id
  ),
  lesson as (
    select l.id,
           greatest(
             case
               when l.release_at_date is not null
                 then ((l.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
               when l.release_after_days is not null
                 then (select a.start_at from anchor a)
                      + make_interval(days => l.release_after_days)
             end,
             mod.scheduled_at
           ) as scheduled_at
      from public.lessons l
      join mod on mod.id = l.module_id
  )
  select 'module'::text, mod.id, mod.scheduled_at
    from mod
   where mod.scheduled_at > now()
     and not public.has_role(p_user_id, 'admin'::app_role)
  union all
  select 'lesson'::text, lesson.id, lesson.scheduled_at
    from lesson
   where lesson.scheduled_at > now()
     and not public.has_role(p_user_id, 'admin'::app_role);
$$;

revoke all on function public.get_course_release_map_for(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_course_release_map_for(uuid, uuid) to service_role;

comment on function public.get_course_release_map_for(uuid, uuid) is
  'Drip content server-side (service role): módulos/aulas ainda travados para o usuário informado.';
