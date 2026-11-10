-- =====================================================
-- GAMIFICATION SYSTEM: Tables, Triggers, and Seed Data
-- =====================================================

-- Table: achievements (definições das conquistas)
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- emoji ou nome do ícone
  criteria_type TEXT NOT NULL, -- 'lessons_completed', 'courses_completed', 'streak_days', 'daily_lessons'
  criteria_value INTEGER NOT NULL, -- valor necessário para desbloquear
  xp_reward INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table: user_achievements (conquistas desbloqueadas por usuários)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Table: user_stats (estatísticas de gamificação do usuário)
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  lessons_today INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies: achievements (todos podem visualizar)
CREATE POLICY "Anyone can view achievements"
ON public.achievements
FOR SELECT
USING (true);

CREATE POLICY "Admins manage achievements"
ON public.achievements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: user_achievements (usuários veem próprias conquistas)
CREATE POLICY "Users can view own achievements"
ON public.user_achievements
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
ON public.user_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all user achievements"
ON public.user_achievements
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies: user_stats (usuários veem próprias estatísticas)
CREATE POLICY "Users can view own stats"
ON public.user_stats
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
ON public.user_stats
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user stats"
ON public.user_stats
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all user stats"
ON public.user_stats
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: atualizar user_stats.updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_updated_at();

-- Trigger: atualizar user_stats quando lesson é completada
CREATE OR REPLACE FUNCTION public.update_user_stats_on_lesson_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_user_stats RECORD;
  v_new_streak INTEGER;
  v_new_lessons_today INTEGER;
BEGIN
  -- Só processa se a aula foi marcada como completa
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    
    -- Busca ou cria user_stats
    SELECT * INTO v_user_stats 
    FROM public.user_stats 
    WHERE user_id = NEW.user_id;
    
    IF NOT FOUND THEN
      -- Cria registro inicial
      INSERT INTO public.user_stats (user_id, total_xp, level, current_streak, best_streak, last_activity_date, lessons_today)
      VALUES (NEW.user_id, 10, 1, 1, 1, v_today, 1);
      RETURN NEW;
    END IF;
    
    -- Calcula novo streak
    IF v_user_stats.last_activity_date = v_today THEN
      -- Mesmo dia: mantém streak, incrementa lessons_today
      v_new_streak := v_user_stats.current_streak;
      v_new_lessons_today := v_user_stats.lessons_today + 1;
    ELSIF v_user_stats.last_activity_date = v_yesterday THEN
      -- Dia consecutivo: incrementa streak, reseta lessons_today
      v_new_streak := v_user_stats.current_streak + 1;
      v_new_lessons_today := 1;
    ELSE
      -- Quebrou streak: reseta para 1
      v_new_streak := 1;
      v_new_lessons_today := 1;
    END IF;
    
    -- Atualiza user_stats
    UPDATE public.user_stats
    SET 
      total_xp = total_xp + 10, -- 10 XP por aula completada
      level = FLOOR((total_xp + 10) / 100) + 1, -- Nível baseado em XP (100 XP por nível)
      current_streak = v_new_streak,
      best_streak = GREATEST(best_streak, v_new_streak),
      last_activity_date = v_today,
      lessons_today = v_new_lessons_today,
      updated_at = now()
    WHERE user_id = NEW.user_id;
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_stats_on_lesson_complete
AFTER INSERT OR UPDATE ON public.lesson_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_on_lesson_complete();

-- Seed Data: Conquistas Iniciais
INSERT INTO public.achievements (title, description, icon, criteria_type, criteria_value, xp_reward, order_index)
VALUES
  ('Primeiro Passo', 'Complete sua primeira aula', '🎯', 'lessons_completed', 1, 50, 1),
  ('Estudante Dedicado', 'Complete 10 aulas', '📚', 'lessons_completed', 10, 100, 2),
  ('Maratonista', 'Complete 50 aulas', '🏃', 'lessons_completed', 50, 300, 3),
  ('Mestre do Conhecimento', 'Complete 100 aulas', '🎓', 'lessons_completed', 100, 500, 4),
  ('Em Chamas', 'Mantenha um streak de 3 dias consecutivos', '🔥', 'streak_days', 3, 100, 5),
  ('Imparável', 'Mantenha um streak de 7 dias consecutivos', '⚡', 'streak_days', 7, 200, 6),
  ('Lenda', 'Mantenha um streak de 30 dias consecutivos', '👑', 'streak_days', 30, 500, 7),
  ('Primeiro Curso', 'Complete seu primeiro curso', '🏆', 'courses_completed', 1, 200, 8),
  ('Colecionador', 'Complete 5 cursos', '💎', 'courses_completed', 5, 500, 9),
  ('Foco Total', 'Complete 5 aulas em um único dia', '🎯', 'daily_lessons', 5, 150, 10)
ON CONFLICT DO NOTHING;