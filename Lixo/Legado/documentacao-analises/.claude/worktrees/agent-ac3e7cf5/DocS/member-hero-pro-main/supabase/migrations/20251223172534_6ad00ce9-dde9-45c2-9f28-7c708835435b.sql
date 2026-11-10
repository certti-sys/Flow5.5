
-- Configurar curso TEOLOGIA para testes de integração
UPDATE courses 
SET integration_enabled = true, 
    external_product_id = 'TESTE_PRODUTO_123', 
    integration_platform = 'hotmart'
WHERE id = 'c5a1bdd3-bc50-401b-893e-8efdefab7b7e';
