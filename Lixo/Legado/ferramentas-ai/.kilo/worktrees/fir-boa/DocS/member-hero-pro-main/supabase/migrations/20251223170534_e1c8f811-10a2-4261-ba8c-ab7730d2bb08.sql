-- Fase B: Adicionar colunas para contrato canônico de webhooks
ALTER TABLE webhook_logs
ADD COLUMN IF NOT EXISTS external_product_id text,
ADD COLUMN IF NOT EXISTS buyer_email text,
ADD COLUMN IF NOT EXISTS buyer_name text,
ADD COLUMN IF NOT EXISTS transaction_id text,
ADD COLUMN IF NOT EXISTS course_matched boolean DEFAULT false;

-- Garantir que curso_id seja nullable (pode não existir match)
ALTER TABLE webhook_logs 
ALTER COLUMN curso_id DROP NOT NULL;