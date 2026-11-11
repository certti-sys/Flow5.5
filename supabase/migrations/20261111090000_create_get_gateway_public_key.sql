-- RPC pública consumida pelo checkout anônimo.
--
-- O front (src/pages/checkout/Checkout.tsx:150) chama
-- supabase.rpc('get_gateway_public_key', { slug_input }) e espera uma lista com
-- gateway_id, public_key e allowed_methods. A função nunca existiu no banco:
-- o checkout recebia 404 e nenhuma chave pública era carregada.
--
-- Não é possível ler gateway_credentials direto: a RLS libera só `authenticated`
-- e o checkout roda antes do login. Expomos exclusivamente a public_key
-- (nunca secret_key/webhook_secret) e a lista de métodos, via SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.get_gateway_public_key(slug_input text)
RETURNS TABLE (
  gateway_id uuid,
  public_key text,
  allowed_methods text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.id AS gateway_id,
         gc.public_key,
         gc.allowed_methods
  FROM gateways g
  JOIN gateway_credentials gc ON gc.gateway_id = g.id
  WHERE g.slug = slug_input
    AND g.is_active
    AND gc.is_active
  ORDER BY (gc.env = 'production') DESC, gc.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_gateway_public_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gateway_public_key(text) TO anon, authenticated;
