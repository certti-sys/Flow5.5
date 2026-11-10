-- Remove trigger incorreto da lesson_progress
DROP TRIGGER IF EXISTS trigger_update_stats_on_lesson_complete ON public.lesson_progress;

-- Cria trigger correto na user_progress
CREATE OR REPLACE FUNCTION public.update_user_stats_on_progress_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
  v_user_stats RECORD;
  v_new_streak INTEGER;
  v_new_lessons_today INTEGER;
BEGIN
  -- Só processa se a aula foi marcada como completa
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    
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
      total_xp = total_xp + 10,
      level = FLOOR((total_xp + 10) / 100) + 1,
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

-- Cria trigger na tabela correta (user_progress)
CREATE TRIGGER trigger_update_stats_on_progress_complete
AFTER INSERT OR UPDATE ON public.user_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats_on_progress_complete();