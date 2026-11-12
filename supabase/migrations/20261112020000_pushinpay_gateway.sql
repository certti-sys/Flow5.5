-- Migration: gateway PushinPay
-- Data: 2026-11-12
--
-- Registra o gateway PushinPay (inativo até o admin salvar o API token).
-- PushinPay aceita apenas PIX. Ambientes:
--   test -> https://api-sandbox.pushinpay.com.br/api
--   live -> https://api.pushinpay.com.br/api
-- A escolha é feita pelo `env` da credencial, então não há coluna extra.

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('PushinPay', 'pushinpay', false, false)
ON CONFLICT (slug) DO NOTHING;
