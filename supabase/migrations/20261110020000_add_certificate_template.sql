-- Adiciona a coluna certificate_template usada por src/hooks/usePlatformSettings.tsx.
-- A coluna existia no código, mas não no schema remoto, causando erro 42703
-- (column "certificate_template" of relation "platform_settings" does not exist)
-- ao salvar/inserir configurações da plataforma.
--
-- Idempotente: seguro para rodar em bancos onde a coluna já foi adicionada manualmente.

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS certificate_template text DEFAULT 'dark-premium';

-- Garante valor válido nos registros existentes.
UPDATE public.platform_settings
SET certificate_template = 'dark-premium'
WHERE certificate_template IS NULL;
