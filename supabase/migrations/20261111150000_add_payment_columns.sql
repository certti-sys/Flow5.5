-- Migration: Adicionar colunas de rastreamento de pagamento em orders e payments
-- Data: 2026-11-11

ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS external_id text,
    ADD COLUMN IF NOT EXISTS paid_at timestamptz,
    ADD COLUMN IF NOT EXISTS error_message text;

CREATE INDEX IF NOT EXISTS idx_orders_external_id
    ON public.orders (external_id)
    WHERE external_id IS NOT NULL;

ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS error_message text;
