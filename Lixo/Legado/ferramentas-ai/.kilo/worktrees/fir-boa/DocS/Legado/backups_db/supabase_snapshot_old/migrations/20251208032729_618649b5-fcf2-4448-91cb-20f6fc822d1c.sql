-- Adicionar coluna parent_id para sistema de threads/respostas
ALTER TABLE public.comments
ADD COLUMN parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;

-- Índice para performance em queries de threads
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);