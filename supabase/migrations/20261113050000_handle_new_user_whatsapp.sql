-- `handle_new_user` gravava só nome/e-mail; o WhatsApp digitado no cadastro
-- ficava apenas em `raw_user_meta_data` e nunca chegava em `profiles.whatsapp`,
-- então o canal WhatsApp das notificações não tinha para onde enviar.
--
-- Não é `not null` em `profiles.whatsapp` de propósito: a compra como visitante
-- e o `admin.createUser` sem telefone criam a linha antes de qualquer
-- preenchimento, e um NOT NULL quebraria a confirmação de pagamento.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $function$
begin
  insert into public.profiles (id, name, email, avatar_url, status, whatsapp)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'active',
    nullif(btrim(coalesce(new.raw_user_meta_data->>'whatsapp', '')), '')
  )
  on conflict (id) do update
    set whatsapp = coalesce(public.profiles.whatsapp, excluded.whatsapp);

  insert into public.user_roles (user_id, role)
  values (new.id, 'user'::app_role)
  on conflict do nothing;

  return new;
end;
$function$;
