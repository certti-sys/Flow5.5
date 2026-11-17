-- Tema visual (cor primária) precisa ser legível ANTES do login.
--
-- A política de SELECT em `theme_settings` era só para `authenticated`, então
-- a chave anon recebia `[]` no carregamento inicial (tela de login e SPA antes
-- de a sessão ser restaurada). O app interpretava "sem tema" e voltava para a
-- cor padrão; só depois de um reload com sessão a cor configurada aparecia.
--
-- Além disso, qualquer usuário autenticado podia INSERT/UPDATE/DELETE o tema
-- (políticas com qual=true). Passa a ser exclusivo de admin, e a gravação fica
-- atômica via `save_active_theme`, para nunca deixar a plataforma sem tema
-- ativo caso o insert falhe.

-- ---------- leitura pública (marca não é segredo) ----------
drop policy if exists "Authenticated users can view theme_settings" on public.theme_settings;
drop policy if exists "Anyone can read theme settings" on public.theme_settings;
create policy "Anyone can read theme settings"
  on public.theme_settings
  for select
  to anon, authenticated
  using (true);

-- ---------- escrita só para admin ----------
drop policy if exists "Authenticated users can insert theme_settings" on public.theme_settings;
drop policy if exists "Admins can insert theme settings" on public.theme_settings;
create policy "Admins can insert theme settings"
  on public.theme_settings
  for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated users can update theme_settings" on public.theme_settings;
drop policy if exists "Admins can update theme settings" on public.theme_settings;
create policy "Admins can update theme settings"
  on public.theme_settings
  for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "Authenticated users can delete theme_settings" on public.theme_settings;
drop policy if exists "Admins can delete theme settings" on public.theme_settings;
create policy "Admins can delete theme settings"
  on public.theme_settings
  for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- anon tinha grant de escrita (sem policy, então não escrevia), mas não deve
-- nem poder tentar.
revoke insert, update, delete on public.theme_settings from anon;

-- ---------- gravação atômica ----------
create or replace function public.save_active_theme(
  p_primary_color text,
  p_color_palette jsonb
)
returns public.theme_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.theme_settings;
begin
  if not public.has_role(auth.uid(), 'admin'::public.app_role) then
    raise exception 'Apenas administradores podem alterar o tema' using errcode = '42501';
  end if;

  if p_primary_color is null or p_primary_color !~* '^#[0-9a-f]{6}$' then
    raise exception 'Cor primária inválida: %', p_primary_color using errcode = '22023';
  end if;

  -- Uma única transação: se o insert falhar, a atualização de is_active é
  -- desfeita e o tema antigo continua ativo.
  update public.theme_settings
     set is_active = false,
         updated_at = now()
   where is_active;

  insert into public.theme_settings (primary_color, color_palette, is_active)
  values (p_primary_color, p_color_palette, true)
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.save_active_theme(text, jsonb) from public;
revoke all on function public.save_active_theme(text, jsonb) from anon;
grant execute on function public.save_active_theme(text, jsonb) to authenticated;
