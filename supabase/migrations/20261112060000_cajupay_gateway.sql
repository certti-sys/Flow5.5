-- Migration: gateway CajuPay
-- Data: 2026-11-12
--
-- Registra o gateway CajuPay (inativo até o admin salvar as chaves).
-- A CajuPay usa a mesma API (https://api.cajupay.com.br) para produção e
-- sandbox — a distinção vem do prefixo das chaves (gpk_/gsk_ x gpk_test_/gsk_test_).
-- Métodos suportados nesta integração:
--   PIX   -> POST /api/payments/pix (QR na nossa página)
--   cartão -> POST /api/sdk/v1/checkout/sessions + página hospedada (PCI)

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('CajuPay', 'cajupay', false, false)
ON CONFLICT (slug) DO NOTHING;
