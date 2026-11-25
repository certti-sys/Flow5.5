-- Drip content: liberação de módulos e aulas por tempo.
--
-- Duas colunas em cada tabela, exclusivas entre si:
--   release_after_days -> N dias depois de o aluno receber acesso ao curso
--   release_at_date    -> data absoluta (meia-noite de Brasília)
--
-- Âncora do relativo é `user_course_access.granted_at` (o Flow registra a data
-- de concessão; o Getfy usa o pivô `product_user.created_at`). Acesso por
-- categoria não tem `granted_at`, então cai no `user_course_categories.created_at`.
--
-- O cálculo fica em UMA função (`get_course_release_map`) usada pela UI e pela
-- edge `lesson-progress`. Duplicar a regra em TS nos dois lados é o jeito mais
-- rápido de elas divergirem — e aqui divergir significa aluno bloqueado sem ver
-- player, ou pior, assistindo aula paga antes da hora.
--
-- Regras:
--   * aula travada = max(liberação da aula, liberação do módulo)
--   * admin nunca vê nada travado
--   * nenhuma das duas colunas preenchida = liberado
--
-- `is_public` NÃO isenta do drip de propósito: "pública" aqui significa "visível
-- sem login" para quem já entrou no curso, não "amostra grátis". Quem quiser
-- liberar uma aula antes usa `release_after_days` menor, e a regra fica visível
-- no formulário em vez de escondida numa exceção do SQL.
--
-- A função devolve só o que ainda está travado: o cliente não precisa comparar
-- datas com o relógio local (que pode estar errado) nem confiar no próprio
-- `now()`.

alter table public.modules
  add column if not exists release_after_days integer,
  add column if not exists release_at_date date;

alter table public.lessons
  add column if not exists release_after_days integer,
  add column if not exists release_at_date date;

do $$
begin
  alter table public.modules
    add constraint modules_release_after_days_range
    check (release_after_days is null or (release_after_days > 0 and release_after_days <= 3650));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.lessons
    add constraint lessons_release_after_days_range
    check (release_after_days is null or (release_after_days > 0 and release_after_days <= 3650));
exception when duplicate_object then null;
end $$;

-- Uma regra só: ou dias, ou data. As duas preenchidas é erro de formulário que
-- ninguém consegue depurar depois olhando a linha.
do $$
begin
  alter table public.modules
    add constraint modules_release_one_mode
    check (release_after_days is null or release_at_date is null);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.lessons
    add constraint lessons_release_one_mode
    check (release_after_days is null or release_at_date is null);
exception when duplicate_object then null;
end $$;

create or replace function public.get_course_release_map(p_course_id uuid)
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
        where uca.user_id = auth.uid()
          and uca.course_id = p_course_id
        limit 1),
      (select min(ucc.created_at)
         from public.user_course_categories ucc
         join public.courses c on c.category = ucc.category
        where ucc.user_id = auth.uid()
          and c.id = p_course_id)
    ) as start_at
  ),
  mod as (
    select m.id,
           case
             -- ponytail: fuso fixo em Brasília. Plataforma é só BR; se um dia
             -- atender outro país, o certo é uma coluna de timezone no curso.
             when m.release_at_date is not null
               then ((m.release_at_date + time '00:00') at time zone 'America/Sao_Paulo')
             -- Sem âncora (aluno sem `user_course_access` nem acesso por
             -- categoria) o relativo não tem de onde contar. `now()` aqui faria
             -- a aula ficar sempre N dias à frente e nunca abrir; sem âncora,
             -- não bloqueia.
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
     and not public.has_role(auth.uid(), 'admin'::app_role)
  union all
  select 'lesson'::text, lesson.id, lesson.scheduled_at
    from lesson
   where lesson.scheduled_at > now()
     and not public.has_role(auth.uid(), 'admin'::app_role);
$$;

revoke all on function public.get_course_release_map(uuid) from public, anon;
grant execute on function public.get_course_release_map(uuid) to authenticated;

comment on function public.get_course_release_map(uuid) is
  'Drip content: módulos/aulas ainda travados para o usuário logado.';
