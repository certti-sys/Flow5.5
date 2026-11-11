-- Tabela de certificados (P0-1 do relatório de UX/UI)
-- O módulo de certificados (Course.tsx, LessonSidebar.tsx, Profile.tsx,
-- CertificatesDashboard.tsx, CertificateView.tsx) consultava uma tabela que
-- nunca foi criada — todos os acessos retornavam 404 silencioso.
-- Schema derivado das consultas existentes no front-end:
--   insert: user_id, course_id (Course.tsx:110, LessonSidebar.tsx:50)
--   select: id, user_id, course_id, issued_at + embeds profiles/courses

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);

create index if not exists idx_certificates_user on certificates(user_id);
create index if not exists idx_certificates_course on certificates(course_id);

alter table certificates enable row level security;

-- Alunos leem apenas os próprios certificados
create policy "Users can view own certificates"
  on certificates for select to authenticated
  using (auth.uid() = user_id);

-- Alunos emitem o próprio certificado ao concluir 100% do curso
create policy "Users can create own certificates"
  on certificates for insert to authenticated
  with check (auth.uid() = user_id);

-- Admins gerenciam tudo
create policy "Admins manage certificates"
  on certificates for all to authenticated
  using (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'::app_role))
  with check (exists (select 1 from user_roles where user_id = auth.uid() and role = 'admin'::app_role));
