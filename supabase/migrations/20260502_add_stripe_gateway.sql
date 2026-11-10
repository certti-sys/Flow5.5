-- Script para adicionar Gateway Stripe e Credenciais de Teste
-- Data: 2026-05-02
-- Objetivo: Configurar Stripe como segundo gateway de pagamento

-- ============================================
-- 1. INSERIR GATEWAY STRIPE
-- ============================================

-- Inserir gateway Stripe (se não existir)
INSERT INTO gateways (name, slug, is_active, is_default)
VALUES ('Stripe', 'stripe', true, false)
ON CONFLICT (slug) DO UPDATE
SET is_active = true;

-- ============================================
-- 2. OBTER ID DO GATEWAY STRIPE
-- ============================================

-- Verificar se o gateway foi criado
SELECT id, name, slug, is_active, is_default
FROM gateways
WHERE slug = 'stripe';

-- ============================================
-- 3. INSERIR CREDENCIAIS DE TESTE
-- ============================================

-- IMPORTANTE: Substitua os valores abaixo pelas suas chaves reais do Stripe
-- Obtenha em: https://dashboard.stripe.com/test/apikeys

-- Obter o gateway_id do Stripe
DO $$
DECLARE
    stripe_gateway_id UUID;
BEGIN
    -- Buscar ID do gateway Stripe
    SELECT id INTO stripe_gateway_id
    FROM gateways
    WHERE slug = 'stripe';

    -- Inserir credenciais de teste
    INSERT INTO gateway_credentials (
        gateway_id,
        env,
        public_key,
        secret_key,
        webhook_secret,
        is_active,
        allowed_methods
    )
    VALUES (
        stripe_gateway_id,
        'test',
        'pk_test_SUBSTITUA_PELA_SUA_CHAVE_PUBLICA',  -- Sua chave pública de teste
        'sk_test_SUBSTITUA_PELA_SUA_CHAVE_SECRETA',  -- Sua chave secreta de teste
        'whsec_SUBSTITUA_PELO_SEU_WEBHOOK_SECRET',   -- Seu webhook secret (configurar depois)
        true,
        ARRAY['card']::text[]
    )
    ON CONFLICT (gateway_id, env) DO UPDATE
    SET
        public_key = EXCLUDED.public_key,
        secret_key = EXCLUDED.secret_key,
        webhook_secret = EXCLUDED.webhook_secret,
        is_active = EXCLUDED.is_active,
        allowed_methods = EXCLUDED.allowed_methods,
        updated_at = NOW();

    RAISE NOTICE 'Credenciais Stripe inseridas/atualizadas com sucesso!';
END $$;

-- ============================================
-- 4. VERIFICAR CONFIGURAÇÃO
-- ============================================

-- Verificar credenciais inseridas
SELECT
    gc.id,
    g.name as gateway_name,
    g.slug,
    gc.env,
    LEFT(gc.public_key, 20) || '...' as public_key_preview,
    LEFT(gc.secret_key, 20) || '...' as secret_key_preview,
    gc.is_active,
    gc.allowed_methods,
    gc.created_at
FROM gateway_credentials gc
JOIN gateways g ON g.id = gc.gateway_id
WHERE g.slug = 'stripe'
ORDER BY gc.env DESC;

-- ============================================
-- 5. INSTRUÇÕES PARA OBTER CHAVES STRIPE
-- ============================================

/*
COMO OBTER SUAS CHAVES STRIPE:

1. Acesse: https://dashboard.stripe.com/register
   - Crie uma conta Stripe (gratuito)
   - Ative o modo de teste

2. Obter Chaves API:
   - Vá para: Dashboard → Developers → API keys
   - Copie a "Publishable key" (começa com pk_test_...)
   - Copie a "Secret key" (começa com sk_test_...)
   - Clique em "Reveal test key" se necessário

3. Configurar Webhook (depois):
   - Vá para: Dashboard → Developers → Webhooks
   - Clique em "Add endpoint"
   - URL: https://seu-projeto.supabase.co/functions/v1/stripe-webhook
   - Selecione eventos:
     * payment_intent.succeeded
     * payment_intent.payment_failed
     * charge.refunded
   - Copie o "Signing secret" (começa com whsec_...)

4. Atualizar este script:
   - Substitua 'pk_test_SUBSTITUA...' pela sua chave pública
   - Substitua 'sk_test_SUBSTITUA...' pela sua chave secreta
   - Substitua 'whsec_SUBSTITUA...' pelo seu webhook secret

5. Executar este script no Supabase SQL Editor
*/

-- ============================================
-- 6. EXEMPLO DE UPDATE MANUAL (SE NECESSÁRIO)
-- ============================================

/*
-- Se precisar atualizar as credenciais manualmente:

UPDATE gateway_credentials
SET
    public_key = 'pk_test_SUA_CHAVE_PUBLICA_AQUI',
    secret_key = 'sk_test_SUA_CHAVE_SECRETA_AQUI',
    webhook_secret = 'whsec_SEU_WEBHOOK_SECRET_AQUI',
    updated_at = NOW()
WHERE gateway_id = (SELECT id FROM gateways WHERE slug = 'stripe')
AND env = 'test';
*/

-- ============================================
-- 7. VERIFICAÇÃO FINAL
-- ============================================

-- Listar todos os gateways ativos
SELECT
    g.id,
    g.name,
    g.slug,
    g.is_active,
    g.is_default,
    COUNT(gc.id) as credentials_count
FROM gateways g
LEFT JOIN gateway_credentials gc ON gc.gateway_id = g.id AND gc.is_active = true
WHERE g.is_active = true
GROUP BY g.id, g.name, g.slug, g.is_active, g.is_default
ORDER BY g.is_default DESC, g.name;

-- ============================================
-- 8. CARTÕES DE TESTE STRIPE
-- ============================================

/*
CARTÕES DE TESTE PARA USAR NO CHECKOUT:

Sucesso:
  Número: 4242 4242 4242 4242
  CVC: Qualquer 3 dígitos
  Data: Qualquer data futura

3D Secure (requer autenticação):
  Número: 4000 0025 0000 3155
  CVC: Qualquer 3 dígitos
  Data: Qualquer data futura

Recusado:
  Número: 4000 0000 0000 0002
  CVC: Qualquer 3 dígitos
  Data: Qualquer data futura

Fundos Insuficientes:
  Número: 4000 0000 0000 9995
  CVC: Qualquer 3 dígitos
  Data: Qualquer data futura

Mais cartões de teste: https://stripe.com/docs/testing
*/

-- ============================================
-- FIM DO SCRIPT
-- ============================================

-- Mensagem final
DO $$
BEGIN
    RAISE NOTICE '✅ Script executado com sucesso!';
    RAISE NOTICE '📝 Próximos passos:';
    RAISE NOTICE '   1. Obter chaves Stripe em https://dashboard.stripe.com/test/apikeys';
    RAISE NOTICE '   2. Atualizar as credenciais neste script';
    RAISE NOTICE '   3. Executar novamente para salvar as chaves reais';
    RAISE NOTICE '   4. Testar no checkout com cartão 4242 4242 4242 4242';
END $$;
