-- Fase 8.1 — nome/avatar público entre alunos.
--
-- A lockdown da Fase 8 deixou `profiles` legível só pelo dono ou admin. Só que
-- a lista de comentários da aula é social: o aluno lê o comentário de outro e
-- precisa do nome/avatar de quem escreveu. Sem isso a thread aparecia sem
-- autor (embed `profiles (name, avatar_url)` vinha nulo).
--
-- Em vez de reabrir `profiles` (tem e-mail, whatsapp, status, motivo de
-- suspensão), exponho uma view somente leitura com as três colunas que a UI
-- social usa. `security_invoker = false` para ignorar a RLS da tabela base -
-- a view é o contrato, e o que ela expõe é só identidade pública.

create or replace view public.profiles_public
with (security_invoker = false) as
select p.id,
       p.name,
       p.avatar_url,
       exists (
           select 1 from public.user_roles r
            where r.user_id = p.id and r.role = 'admin'::public.app_role
       ) as is_admin
  from public.profiles p;

revoke all on public.profiles_public from anon, public;
grant select on public.profiles_public to authenticated;
