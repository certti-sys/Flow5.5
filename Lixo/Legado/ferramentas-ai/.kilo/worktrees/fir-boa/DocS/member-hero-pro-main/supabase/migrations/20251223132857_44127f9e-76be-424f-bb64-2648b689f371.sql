-- Fase A: Adicionar campos de mapeamento de integração na tabela courses
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS integration_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS integration_platform text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_product_id text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS external_product_name text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS integration_notes text DEFAULT NULL;

-- Migrar dados existentes de tag_integracao para integration_platform (se aplicável)
UPDATE public.courses 
SET 
  integration_platform = LOWER(tag_integracao),
  integration_enabled = true
WHERE tag_integracao IS NOT NULL AND tag_integracao != '';

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.courses.integration_enabled IS 'Indica se o curso está vinculado a uma plataforma externa de pagamento';
COMMENT ON COLUMN public.courses.integration_platform IS 'Plataforma de integração: hotmart, kiwify, cakto, outro';
COMMENT ON COLUMN public.courses.external_product_id IS 'ID do produto na plataforma externa';
COMMENT ON COLUMN public.courses.external_product_name IS 'Nome do produto na plataforma externa (opcional)';
COMMENT ON COLUMN public.courses.integration_notes IS 'Notas adicionais sobre a integração (opcional)';