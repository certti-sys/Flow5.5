-- Criar tabela lesson_progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID NOT NULL,
  course_id UUID NOT NULL,
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  completed BOOLEAN DEFAULT FALSE,
  last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Habilitar RLS
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_course ON public.lesson_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_completed ON public.lesson_progress(completed) WHERE completed = true;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_lesson_progress_updated_at
BEFORE UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas RLS
CREATE POLICY "Users can view own lesson progress"
ON public.lesson_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress"
ON public.lesson_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress"
ON public.lesson_progress FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lesson progress"
ON public.lesson_progress FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all lesson progress"
ON public.lesson_progress FOR ALL
USING (has_role(auth.uid(), 'admin'));