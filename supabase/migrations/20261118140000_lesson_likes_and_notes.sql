-- Curtidas em aula e anotação pessoal do aluno.
--
-- Espelha o sistema de referência (`MemberLessonLike` + `notes` na linha de
-- progresso), com duas escolhas diferentes:
--
-- 1. A contagem de curtidas é `count(*)` sobre `lesson_likes`, não uma coluna
--    `likes_count` na aula. Coluna denormalizada exige incremento dentro de
--    transação com lock e sai do ar em qualquer caminho que esqueça de
--    atualizar; a contagem direta tem índice e é sempre verdadeira.
-- 2. A anotação mora em `user_progress.notes` porque é exatamente o mesmo
--    escopo (aluno × aula) que já existe — criar tabela paralela só duplicaria
--    a chave e a policy.

create table if not exists public.lesson_likes (
    user_id uuid not null references auth.users(id) on delete cascade,
    lesson_id uuid not null references public.lessons(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (user_id, lesson_id)
);

-- A PK cobre "quem curtiu esta aula"; este índice cobre a contagem por aula.
create index if not exists idx_lesson_likes_lesson
    on public.lesson_likes (lesson_id);

alter table public.lesson_likes enable row level security;

-- Contagem é pública dentro da plataforma (qualquer aluno autenticado vê o
-- número), mas só o dono escreve a própria curtida.
drop policy if exists "Lesson likes are readable" on public.lesson_likes;
create policy "Lesson likes are readable" on public.lesson_likes
    for select to authenticated
    using (true);

drop policy if exists "Users manage own lesson likes" on public.lesson_likes;
create policy "Users manage own lesson likes" on public.lesson_likes
    for all to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ============================================================================
-- Anotação por aula
-- ============================================================================

alter table public.user_progress
  add column if not exists notes text;

alter table public.user_progress
  drop constraint if exists user_progress_notes_len;

alter table public.user_progress
  add constraint user_progress_notes_len
  check (notes is null or char_length(notes) <= 5000);

comment on column public.user_progress.notes is
  'Anotação pessoal do aluno nesta aula (máx 5000 caracteres).';

/** Curtir/descurtir em uma chamada. Devolve o estado final, para a UI não
 *  precisar adivinhar em caso de clique duplo ou aba aberta em dois lugares. */
create or replace function public.toggle_lesson_like(p_lesson_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_user uuid := auth.uid();
    v_liked boolean;
    v_count integer;
begin
    if v_user is null then
        raise exception 'not authenticated' using errcode = '42501';
    end if;

    delete from public.lesson_likes
     where user_id = v_user and lesson_id = p_lesson_id;

    if found then
        v_liked := false;
    else
        insert into public.lesson_likes (user_id, lesson_id)
        values (v_user, p_lesson_id)
        on conflict do nothing;
        v_liked := true;
    end if;

    select count(*) into v_count
      from public.lesson_likes
     where lesson_id = p_lesson_id;

    return jsonb_build_object('liked', v_liked, 'likes_count', v_count);
end;
$function$;

revoke execute on function public.toggle_lesson_like(uuid) from public, anon;
grant execute on function public.toggle_lesson_like(uuid) to authenticated;
