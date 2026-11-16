-- Integrações de navegador (pixels) para o checkout.
--
-- O checkout é público: quem compra não tem sessão, então não pode ler
-- `integrations` direto (a RLS é só de admin). Esta função devolve apenas os
-- `kind` de navegador e só a configuração; credencial de servidor nunca sai
-- daqui porque nem entra na lista de kinds.
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
       and i.kind in ('pixel_tiktok', 'pixel_google_ads', 'pixel_ga4', 'pixel_script')
       and (
           p_product_id is null
           or cardinality(i.product_ids) = 0
           or p_product_id = any (i.product_ids)
       )
     order by i.created_at;
$function$;

revoke execute on function public.get_public_integrations(uuid) from public;
grant execute on function public.get_public_integrations(uuid) to anon, authenticated;
