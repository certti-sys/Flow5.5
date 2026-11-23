-- Presets de tema globais (admin, área de membros, aulas).
--
-- Aditiva: `preset` é nullable e `save_active_theme` ganha parâmetro com
-- default, então chamadas antigas (2 argumentos) continuam válidas.
-- Preset nulo = comportamento anterior (paleta gerada de `primary_color`).

alter table public.theme_settings
  add column if not exists preset text;

create or replace function public.save_active_theme(
  p_primary_color text,
  p_color_palette jsonb,
  p_preset text default null
)
returns public.theme_settings
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  insert into public.theme_settings (primary_color, color_palette, is_active, preset)
  values (p_primary_color, p_color_palette, true, p_preset)
  returning * into v_row;

  return v_row;
end;
$function$;
