-- RLS residual: lesson_materials com leitura ampla para qualquer logado.
--
-- Antes:
--   create policy "Authenticated read lesson_materials" ... using (true)
--
-- Agora: aluno lê metadados de material somente do curso que tem acesso
-- (direto em user_course_access OU por categoria), e admin continua lendo
-- tudo pela policy "Admins manage lesson_materials" (for all).
--
-- POR QUE HELPER SECURITY DEFINER:
-- user_course_categories é admin-only desde o lockdown (20261119130000),
-- então um exists direto nela dentro da policy do aluno não encontra a
-- própria linha. O helper lê com os privilégios do dono da função; auth.uid()
-- continua sendo o claim do JWT. get_course_release_map já usa o mesmo padrão.
--
-- SEM RECURSÃO: o helper toca só user_course_access / courses /
-- user_course_categories. Nenhuma policy dessas tabelas consulta
-- lesson_materials, então não fecha ciclo.
--
-- NÃO mexe em drip: RLS = acesso ao curso; liberação por data é RPC + edges
-- (lesson-file-url, lesson-progress). Aula travada por drip continua com
-- metadados no cache, mas renderização bloqueada na página.

create or replace function public.auth_has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
       exists (
           select 1
             from public.user_course_access uca
            where uca.user_id = auth.uid()
              and uca.course_id = p_course_id
       )
    or exists (
           select 1
             from public.courses c
             join public.user_course_categories ucc
               on ucc.category = c.category
            where c.id = p_course_id
              and ucc.user_id = auth.uid()
       );
$$;

revoke all on function public.auth_has_course_access(uuid) from public, anon;
grant execute on function public.auth_has_course_access(uuid) to authenticated;

drop policy if exists "Authenticated read lesson_materials" on public.lesson_materials;
drop policy if exists "Enrolled or admin read lesson_materials" on public.lesson_materials;

create policy "Enrolled or admin read lesson_materials" on public.lesson_materials
    for select to authenticated
    using (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        or exists (
            select 1
              from public.lessons l
              join public.modules m
                on m.id = l.module_id
             where l.id = lesson_materials.lesson_id
               and public.auth_has_course_access(m.course_id)
        )
    );
