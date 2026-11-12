-- Gateways visíveis no checkout público.
--
-- O comprador é anônimo e as tabelas `gateways`/`gateway_credentials` só têm
-- policy para `authenticated`, então o checkout não conseguia listar nada.
-- Esta função expõe apenas o necessário para o seletor: slug, nome, padrão e
-- métodos liberados. Nunca devolve chaves.
CREATE OR REPLACE FUNCTION public.get_checkout_gateways()
RETURNS TABLE(slug text, name text, is_default boolean, allowed_methods text[])
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (g.slug)
         g.slug,
         g.name,
         g.is_default,
         gc.allowed_methods
  FROM gateways g
  JOIN gateway_credentials gc ON gc.gateway_id = g.id
  WHERE g.is_active
    AND gc.is_active
  ORDER BY g.slug, (gc.env = 'live') DESC, gc.updated_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.get_checkout_gateways() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
