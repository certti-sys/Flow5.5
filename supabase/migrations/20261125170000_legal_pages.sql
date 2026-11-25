-- Páginas legais editáveis (Termos, Privacidade e LGPD).
--
-- Texto puro: o conteúdo é exibido com whitespace-pre-wrap, nunca com
-- dangerouslySetInnerHTML. Mesma regra das páginas pós-compra (decisão 4).
--
-- RLS: leitura pública (qualquer visitante precisa ler os termos antes de
-- pagar); escrita restrita a admin por has_role(), sem acesso direto a
-- user_roles no front.

create table if not exists public.legal_pages (
  slug text primary key check (slug in ('terms', 'privacy', 'lgpd')),
  title text not null,
  content text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.legal_pages enable row level security;

drop policy if exists "Public read legal_pages" on public.legal_pages;
create policy "Public read legal_pages"
  on public.legal_pages for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins manage legal_pages" on public.legal_pages;
create policy "Admins manage legal_pages"
  on public.legal_pages for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

grant select on public.legal_pages to anon, authenticated;
grant insert, update, delete on public.legal_pages to authenticated;

-- Um registro por slug já é garantido pela PK. Seeds com texto mínimo para
-- que as rotas não apareçam vazias antes do admin editar.
insert into public.legal_pages (slug, title, content) values
  ('terms', 'Termos de Uso', 'Documento em elaboração. Entre em contato com o suporte para esclarecimentos.'),
  ('privacy', 'Política de Privacidade', 'Documento em elaboração. Entre em contato com o suporte para esclarecimentos.'),
  ('lgpd', 'Privacidade e LGPD', 'Documento em elaboração. Entre em contato com o suporte para esclarecimentos.')
on conflict (slug) do nothing;

-- has_role é SECURITY DEFINER; garantir EXECUTE para authenticated.
do $$
begin
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'has_role'
  ) then
    raise exception 'public.has_role não encontrada — não aplicar policy de legal_pages';
  end if;
end $$;
