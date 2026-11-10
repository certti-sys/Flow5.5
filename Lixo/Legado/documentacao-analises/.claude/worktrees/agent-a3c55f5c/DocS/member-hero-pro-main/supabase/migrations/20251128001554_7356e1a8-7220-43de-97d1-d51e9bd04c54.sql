-- Criar tabela para comentários das aulas
CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lesson_comments_lesson_id ON public.lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_user_id ON public.lesson_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_comments_created_at ON public.lesson_comments(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Qualquer usuário autenticado pode ler comentários
CREATE POLICY "Authenticated users can view comments"
  ON public.lesson_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Usuários podem criar seus próprios comentários
CREATE POLICY "Users can create own comments"
  ON public.lesson_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Usuários podem editar seus próprios comentários
CREATE POLICY "Users can update own comments"
  ON public.lesson_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Usuários podem deletar seus próprios comentários
CREATE POLICY "Users can delete own comments"
  ON public.lesson_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem gerenciar todos os comentários
CREATE POLICY "Admins can manage all comments"
  ON public.lesson_comments
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_lesson_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lesson_comments_updated_at
  BEFORE UPDATE ON public.lesson_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_comments_updated_at();