-- Adicionar campo tipo na tabela courses usando o enum lesson_type existente
ALTER TABLE public.courses 
ADD COLUMN tipo public.lesson_type DEFAULT 'video';