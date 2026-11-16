-- Google Tag Manager como integração de navegador.
--
-- O GTM é um `kind` próprio (não um pixel): o contêiner carrega as tags de
-- conversão e recebe o funil pelo `dataLayer`, então não tem credencial nem
-- disparo server-side. Só precisa entrar na lista que o checkout público lê.
alter table public.integrations drop constraint integrations_kind_check;
alter table public.integrations
  add constraint integrations_kind_check check (kind in (
    'utmify', 'spedy', 'integrax', 'pixel_meta', 'pixel_x',
    'pixel_tiktok', 'pixel_google_ads', 'pixel_ga4', 'pixel_gtm', 'pixel_script'
  ));

create or replace function public.get_public_integrations(p_product_id uuid default null)
returns table (kind text, config jsonb)
language sql
stable
security definer
set search_path = public
as $function$
    select i.kind, i.config
      from public.integrations i
     where i.is_active
       and i.kind in ('pixel_tiktok', 'pixel_google_ads', 'pixel_ga4', 'pixel_gtm', 'pixel_script')
       and p_product_id is not null
       and p_product_id = any (i.product_ids)
     order by i.created_at;
$function$;

revoke execute on function public.get_public_integrations(uuid) from public;
grant execute on function public.get_public_integrations(uuid) to anon, authenticated;
