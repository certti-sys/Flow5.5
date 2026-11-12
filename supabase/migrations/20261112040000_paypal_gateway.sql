-- Migration: gateway PayPal
-- Data: 2026-11-12
--
-- Registra o gateway PayPal (Orders API v2, inativo até o admin salvar as
-- credenciais). Mapeamento das credenciais:
--   public_key      -> Client ID
--   secret_key      -> Client Secret
--   webhook_secret  -> Webhook ID (usado na verificação de assinatura)
-- Ambientes:
--   test -> https://api-m.sandbox.paypal.com
--   live -> https://api-m.paypal.com
-- Observação: o PayPal não opera em BRL; as cobranças são criadas em USD.

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('PayPal', 'paypal', false, false)
ON CONFLICT (slug) DO NOTHING;
