-- Migration: gateway Efí (antiga Gerencianet)
-- Data: 2026-11-12
--
-- Registra o gateway Efí (inativo até o admin salvar as credenciais).
-- Mapeamento das credenciais:
--   public_key  -> Client ID
--   secret_key  -> Client Secret
--   webhook_secret -> HMAC opcional do webhook (?hmac=)
--   extra_config:
--     certificate_p12      -> conteúdo do .p12 em base64 (obrigatório para PIX)
--     certificate_password -> senha do .p12
--     pix_key              -> chave PIX usada nas cobranças
-- Ambientes:
--   test: PIX https://pix-h.api.efipay.com.br        | Cobranças https://cobrancas-h.api.efipay.com.br
--   live: PIX https://pix.api.efipay.com.br          | Cobranças https://cobrancas.api.efipay.com.br
-- PIX exige mTLS com o certificado; boleto e link de cartão usam a API Cobranças (sem mTLS).

INSERT INTO public.gateways (name, slug, is_active, is_default)
VALUES ('Efí', 'efi', false, false)
ON CONFLICT (slug) DO NOTHING;
