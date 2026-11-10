-- ============================================
-- SCRIPT DE TESTE: CUPOM E PRODUTO
-- ============================================
-- 1. Execute no SQL Editor do Supabase para criar um cupom de teste

-- Inserir cupom de teste: 15% de desconto
INSERT INTO coupons (code, discount_type, discount_value, max_uses, min_purchase_amount, is_active)
VALUES ('TESTE15', 'percent', 15, 100, 50, true)
ON CONFLICT (code) DO NOTHING;

-- Verifique o UUID gerado
SELECT * FROM coupons WHERE code = 'TESTE15';
