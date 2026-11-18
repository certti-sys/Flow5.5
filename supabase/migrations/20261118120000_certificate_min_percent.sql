-- Percentual mínimo de conclusão para o certificado, por curso.
--
-- Antes o resgate só aparecia em 100%. O Getfy permite configurar (ex.: 80%),
-- que é o caso real de cursos com aulas de bônus que não deveriam travar a
-- entrega. O padrão 100 mantém o comportamento atual para quem não mexer.

alter table public.courses
  add column if not exists certificate_min_percent integer not null default 100;

alter table public.courses
  drop constraint if exists courses_certificate_min_percent_check;

alter table public.courses
  add constraint courses_certificate_min_percent_check
  check (certificate_min_percent between 1 and 100);

comment on column public.courses.certificate_min_percent is
  'Percentual de conclusão exigido para emitir/resgatar o certificado (1-100).';

/**
 * Percentual de conclusão do aluno no curso.
 *
 * Conta aulas concluídas sobre o total de aulas do curso — mesma base que a
 * sidebar usa, para o número do painel e do botão nunca divergirem.
 * Curso sem aula nenhuma devolve 0 (não pode liberar certificado por acidente).
 */
create or replace function public.course_completion_percent(p_user_id uuid, p_course_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $function$
  select case
    when count(l.id) = 0 then 0
    else round(
      100.0 * count(*) filter (where coalesce(up.completed, false)) / count(l.id)
    )::integer
  end
  from public.modules m
  join public.lessons l on l.module_id = m.id
  left join public.user_progress up
    on up.lesson_id = l.id and up.user_id = p_user_id
  where m.course_id = p_course_id;
$function$;

comment on function public.course_completion_percent(uuid, uuid) is
  'Percentual de aulas concluídas do aluno no curso (0-100). Mesma regra da sidebar.';

/**
 * Estende a checagem de emissão: além das flags ligadas, exige o percentual.
 *
 * O admin (emissão manual) passa direto: ele já vê o curso na lista por ter a
 * flag ligada, e pode emitir para aluno que concluiu por fora da plataforma.
 * O aluno (RLS "Users can create own certificates") precisa do percentual.
 */
create or replace function public.enforce_certificate_enabled()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_global boolean;
  v_course boolean;
  v_min_percent integer;
  v_is_admin boolean;
  v_percent integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  select exists (
    select 1 from public.user_roles
     where user_id = auth.uid() and role = 'admin'::app_role
  ) into v_is_admin;

  begin
    select certificates_enabled into v_global
      from public.platform_settings
     where is_active
     order by created_at
     limit 1;

    select certificates_enabled, certificate_min_percent
      into v_course, v_min_percent
      from public.courses
     where id = new.course_id;
  exception when others then
    raise warning 'enforce_certificate_enabled não conseguiu ler as flags do curso %: %', new.course_id, sqlerrm;
    return new;
  end;

  if coalesce(v_global, false) is false or coalesce(v_course, false) is false then
    raise exception 'Certificado desativado para este curso.'
      using errcode = '42501';
  end if;

  if v_is_admin then
    return new;
  end if;

  -- Aluno resgatando: precisa do percentual configurado no curso.
  v_percent := public.course_completion_percent(new.user_id, new.course_id);
  if v_percent < coalesce(v_min_percent, 100) then
    raise exception 'Conclusão insuficiente para o certificado (% de % exigidos).',
      v_percent, coalesce(v_min_percent, 100)
      using errcode = '42501';
  end if;

  return new;
end;
$function$;
