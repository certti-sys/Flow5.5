-- Adicionar valor padrão para secret_key na tabela webhook_configs
ALTER TABLE webhook_configs 
ALTER COLUMN secret_key SET DEFAULT gen_random_uuid()::text;