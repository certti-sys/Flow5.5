-- Fila durável de e-mail transacional.
--
-- Antes: cada chamador (`payment-ops`, `create-user`, webhooks de gateway,
-- `check-achievements`, `retention-cron`) fazia `fetch` direto em `send-email`.
-- Se o Brevo estivesse fora, o e-mail — inclusive o de boas-vindas com a senha
-- temporária — se perdia sem deixar rastro: a linha em `email_logs` só era
-- criada *depois* do envio, dentro da própria função que falhou.
--
-- Agora o chamador grava a intenção (`status='queued'`) e o cron
-- `dispatch-notifications` drena com backoff. O CHECK de `status` já previa
-- `queued` desde a criação da tabela — faltavam as colunas de controle.

alter table public.email_logs
  add column if not exists attempts integer not null default 0;

alter table public.email_logs
  add column if not exists next_attempt_at timestamptz not null default now();

alter table public.email_logs
  add column if not exists sent_at timestamptz;

create index if not exists idx_email_logs_queue
  on public.email_logs (next_attempt_at)
  where status = 'queued';

comment on column public.email_logs.attempts is
  'Tentativas de envio; 5 falhas transitórias viram status=failed.';

-- A policy antiga era `ALL` com `using (true)` para authenticated: qualquer
-- aluno logado lia (e apagava) o histórico inteiro de e-mails da plataforma,
-- incluindo endereços de todos os compradores. Passa a ser só admin.
drop policy if exists "Authenticated all access" on public.email_logs;

drop policy if exists "Admins read email logs" on public.email_logs;
create policy "Admins read email logs" on public.email_logs
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
