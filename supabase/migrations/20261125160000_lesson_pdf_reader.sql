-- Leitor de PDF: bucket privado, tipo de material e metadados do arquivo.
--
-- O `platform-assets` é público: um PDF de curso pago lá fica baixável por
-- qualquer um que receba o link. PDF de aula é conteúdo pago, então vai para um
-- bucket privado (`lesson-files`) e o aluno recebe URL assinada, curta, emitida
-- pela edge `lesson-file-url` — que valida acesso ao curso antes de assinar.
--
-- Só `service_role` escreve aqui. Não existe policy de INSERT/UPDATE para
-- `authenticated`: upload é feito pelo nome do admin (mesma checagem de role das
-- outras edges) e o arquivo nunca fica exposto por caminho adivinhável.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-files',
  'lesson-files',
  false,
  52428800,  -- 50 MB: slide deck com imagens passa fácil dos 10 MB do platform-assets
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Leitura pelo dono só através da URL assinada (service_role assina). Sem policy
-- de SELECT para `authenticated`, um `storage.from('lesson-files').download()`
-- direto do cliente falha — que é o comportamento desejado.
drop policy if exists "Admins can read lesson files" on storage.objects;
create policy "Admins can read lesson files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'lesson-files'
    and public.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "Admins can upload lesson files" on storage.objects;
create policy "Admins can upload lesson files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'lesson-files'
    and public.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "Admins can update lesson files" on storage.objects;
create policy "Admins can update lesson files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'lesson-files'
    and public.has_role(auth.uid(), 'admin'::app_role)
  );

drop policy if exists "Admins can delete lesson files" on storage.objects;
create policy "Admins can delete lesson files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'lesson-files'
    and public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Novo tipo de material: o PDF é exibido no leitor embutido, não é link.
alter table public.lesson_materials
  drop constraint if exists lesson_materials_type_check;

alter table public.lesson_materials
  add constraint lesson_materials_type_check
  check (type = any (array['link'::text, 'text'::text, 'download'::text, 'embed'::text, 'pdf'::text]));

-- Para `type = 'pdf'`, `content` guarda o caminho dentro do bucket (não a URL):
-- caminho é estável, a URL assinada expira. `file_meta` guarda o que o leitor
-- precisa antes de carregar o arquivo (tamanho e nome para o download).
alter table public.lesson_materials
  add column if not exists file_meta jsonb;

comment on column public.lesson_materials.file_meta is
  'Metadados de material type=pdf: {size, name}. content = caminho no bucket lesson-files.';
