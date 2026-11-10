-- Add description and is_public columns to lessons table
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN public.lessons.description IS 'Descrição detalhada da aula';
COMMENT ON COLUMN public.lessons.is_public IS 'Define se a aula é pública (visível sem login)';