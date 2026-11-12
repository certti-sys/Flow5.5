-- Fase 0 do checkout: link público por slug + leitura pública e escopada do pedido.
--
-- 1) products.checkout_slug: permite /c/{slug} em vez de expor o UUID do produto.
--    O slug é gerado automaticamente pelo banco quando não informado.
-- 2) get_order_public(uuid): a página de obrigado é pública, mas as tabelas
--    orders/order_items/payments só têm policy para `authenticated`. Esta RPC
--    devolve apenas o necessário para a tela (sem e-mail/CPF/documento).

-- Normaliza texto para slug: minúsculas, sem acentos e apenas [a-z0-9-].
CREATE OR REPLACE FUNCTION public.product_slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT trim(both '-' from regexp_replace(
        lower(translate(
            coalesce(input, ''),
            'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇñÑ',
            'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUCnN'
        )),
        '[^a-z0-9]+', '-', 'g'
    ));
$$;

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS checkout_slug text;

-- Gera (ou normaliza) o slug antes de inserir/atualizar.
CREATE OR REPLACE FUNCTION public.products_set_checkout_slug()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    base text;
    candidate text;
    suffix int := 0;
BEGIN
    IF NEW.checkout_slug IS NOT NULL AND btrim(NEW.checkout_slug) <> '' THEN
        -- Slug informado pelo admin também é normalizado (sem acentos/espaços).
        NEW.checkout_slug := public.product_slugify(NEW.checkout_slug);
        IF NEW.checkout_slug <> '' THEN
            RETURN NEW;
        END IF;
    END IF;

    base := public.product_slugify(NEW.name);
    IF base IS NULL OR base = '' THEN
        base := 'produto';
    END IF;
    base := left(base, 30);

    candidate := base;
    WHILE EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.checkout_slug = candidate
          AND p.id IS DISTINCT FROM NEW.id
    ) LOOP
        suffix := suffix + 1;
        candidate := left(base, 26) || '-' || suffix::text;
    END LOOP;

    NEW.checkout_slug := candidate;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_set_checkout_slug ON public.products;
CREATE TRIGGER products_set_checkout_slug
    BEFORE INSERT OR UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.products_set_checkout_slug();

-- Backfill dos produtos existentes.
DO $$
DECLARE
    r record;
    base text;
    candidate text;
    suffix int;
BEGIN
    FOR r IN SELECT id, name FROM public.products WHERE checkout_slug IS NULL LOOP
        base := public.product_slugify(r.name);
        IF base IS NULL OR base = '' THEN
            base := 'produto';
        END IF;
        base := left(base, 30);

        candidate := base;
        suffix := 0;
        WHILE EXISTS (
            SELECT 1 FROM public.products p
            WHERE p.checkout_slug = candidate
              AND p.id <> r.id
        ) LOOP
            suffix := suffix + 1;
            candidate := left(base, 26) || '-' || suffix::text;
        END LOOP;

        UPDATE public.products SET checkout_slug = candidate WHERE id = r.id;
    END LOOP;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS products_checkout_slug_key
    ON public.products (checkout_slug)
    WHERE checkout_slug IS NOT NULL;

COMMENT ON COLUMN public.products.checkout_slug IS
    'Slug público do checkout (/c/{slug}). Gerado automaticamente a partir do nome.';

-- Leitura pública e mínima do pedido para a página de obrigado.
CREATE OR REPLACE FUNCTION public.get_order_public(p_order_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT jsonb_build_object(
        'id', o.id,
        'status', o.status,
        'total_amount', o.total_amount,
        'currency', o.currency,
        'customer_first_name', nullif(split_part(coalesce(o.customer_name, ''), ' ', 1), ''),
        'created_at', o.created_at,
        'paid_at', o.paid_at,
        'items', coalesce((
            SELECT jsonb_agg(jsonb_build_object(
                'product_id', oi.product_id,
                'name', coalesce(pr.name, 'Item'),
                'image_url', pr.image_url,
                'quantity', oi.quantity,
                'unit_amount', oi.unit_amount,
                'kind', oi.kind
            ) ORDER BY oi.created_at)
            FROM public.order_items oi
            LEFT JOIN public.products pr ON pr.id = oi.product_id
            WHERE oi.order_id = o.id
        ), '[]'::jsonb),
        'redirect_after_purchase', (
            SELECT nullif(pr.checkout_config->>'redirect_after_purchase', '')
            FROM public.order_items oi
            JOIN public.products pr ON pr.id = oi.product_id
            WHERE oi.order_id = o.id AND oi.kind = 'main'
            LIMIT 1
        ),
        'payment', (
            SELECT jsonb_build_object(
                'status', p.status,
                'method', p.payment_method_type
            )
            FROM public.payments p
            WHERE p.order_id = o.id
            ORDER BY p.created_at DESC
            LIMIT 1
        )
    )
    FROM public.orders o
    WHERE o.id = p_order_id;
$$;

REVOKE ALL ON FUNCTION public.get_order_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_order_public(uuid) TO anon, authenticated;
