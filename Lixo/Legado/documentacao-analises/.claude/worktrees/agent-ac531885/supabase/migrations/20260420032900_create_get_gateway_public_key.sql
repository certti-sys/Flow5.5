-- Create RPC function to get gateway public key and configuration
CREATE OR REPLACE FUNCTION public.get_gateway_public_key(slug_input text)
RETURNS TABLE (
    gateway_id uuid,
    public_key text,
    allowed_methods text[],
    max_installments integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        g.id as gateway_id,
        gc.public_key,
        gc.allowed_methods,
        gc.max_installments
    FROM gateways g
    INNER JOIN gateway_credentials gc ON gc.gateway_id = g.id
    WHERE g.slug = slug_input
      AND g.is_active = true
      AND gc.is_active = true
    ORDER BY gc.env DESC -- prefer 'test' over 'live' in alphabetical order
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.get_gateway_public_key IS 'Returns public key and configuration for active gateway by slug';
