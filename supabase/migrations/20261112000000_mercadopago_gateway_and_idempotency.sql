-- Migration: Mercado Pago + idempotência de pagamentos
-- Data: 2026-11-12
--
-- 1) Registra o gateway Mercado Pago (inativo até o admin configurar credenciais)
-- 2) Índices únicos para idempotência de webhooks e pagamentos
-- 3) Coluna `source` em user_course_access (origem do acesso)

-- ---------------------------------------------------------------------------
-- 1) Gateway Mercado Pago
-- ---------------------------------------------------------------------------
INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('Mercado Pago', 'mercadopago', false, false)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Idempotência
-- ---------------------------------------------------------------------------
-- Um pagamento externo (id do PSP) não pode ser registrado duas vezes no mesmo gateway.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_gateway_external_unique
    ON public.payments (gateway_id, external_payment_id)
    WHERE external_payment_id IS NOT NULL;

-- Webhook da mesma transação não pode ser processado duas vezes na mesma plataforma.
CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_transactions_unique
    ON public.webhook_transactions (platform_id, external_transaction_id)
    WHERE external_transaction_id IS NOT NULL;

-- Um aluno tem no máximo um registro de acesso por curso.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_course_access_unique
    ON public.user_course_access (user_id, course_id);

-- ---------------------------------------------------------------------------
-- 3) Origem do acesso
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_course_access
    ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_course_access_source_check'
    ) THEN
        ALTER TABLE public.user_course_access
            ADD CONSTRAINT user_course_access_source_check
            CHECK (source IN ('checkout', 'manual', 'import', 'webhook'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Corrige get_gateway_public_key
-- ---------------------------------------------------------------------------
-- A versão anterior ordenava por (env = 'production'), valor impossível:
-- o CHECK da coluna só aceita 'test' e 'live'. Com isso o checkout podia
-- carregar a chave pública de teste mesmo com credenciais de produção salvas.
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
  ORDER BY (gc.env = 'live') DESC, gc.updated_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_gateway_public_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_gateway_public_key(text) TO anon, authenticated;
