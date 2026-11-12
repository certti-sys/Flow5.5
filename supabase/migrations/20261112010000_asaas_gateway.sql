-- Migration: gateway Asaas
-- Data: 2026-11-12
--
-- Registra o gateway Asaas (inativo até o admin salvar a API key).
-- O Asaas usa dois ambientes distintos:
--   test -> https://api-sandbox.asaas.com/v3
--   live -> https://api.asaas.com/v3
-- A escolha é feita pelo `env` da credencial, então não há coluna extra.

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('Asaas', 'asaas', false, false)
ON CONFLICT (slug) DO NOTHING;
