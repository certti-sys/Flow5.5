-- user_progress nunca teve as colunas que a edge function `lesson-progress`
-- e o `types.ts` do front já usam (`progress_percent`, `last_watched_at`).
--
-- Resultado em produção: toda chamada `action: 'get'` da função estourava 500
-- ("column user_progress.progress_percent does not exist"), o player não sabia
-- o progresso da aula e `mark_completed`/`update` também falhavam.
--
-- O schema canônico é este (a função grava progresso parcial em %), então a
-- correção é trazer o banco de volta ao contrato — sem mexer no código.

alter table public.user_progress
  add column if not exists progress_percent integer not null default 0,
  add column if not exists last_watched_at timestamptz default now();

-- Mesma faixa que o front valida (0–100), sem quebrar se já existir.
do $$
begin
  alter table public.user_progress
    add constraint user_progress_progress_percent_range
    check (progress_percent >= 0 and progress_percent <= 100);
exception
  when duplicate_object then null;
end $$;

-- Quem já concluiu a aula passa a aparecer com 100% (o dado nunca existiu).
update public.user_progress
   set progress_percent = 100
 where completed = true
   and progress_percent <> 100;

-- Sem histórico de "última vez assistida", usa o que já está gravado.
update public.user_progress
   set last_watched_at = coalesce(last_watched_at, completed_at, created_at, now())
 where last_watched_at is null;

comment on column public.user_progress.progress_percent is
  'Progresso da aula em % (0-100). Gravado pela edge function lesson-progress.';
comment on column public.user_progress.last_watched_at is
  'Último momento em que o aluno assistiu a esta aula.';
