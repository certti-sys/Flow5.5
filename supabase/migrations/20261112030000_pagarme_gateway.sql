-- Migration: gateway Pagar.me
-- Data: 2026-11-12
--
-- Registra o gateway Pagar.me v5 (inativo até o admin salvar a secret key).
-- Ambientes:
--   test -> https://sdx-api.pagar.me/core/v5
--   live -> https://api.pagar.me/core/v5
-- A escolha é feita pelo `env` da credencial, então não há coluna extra.

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('Pagar.me', 'pagarme', false, false)
ON CONFLICT (slug) DO NOTHING;
