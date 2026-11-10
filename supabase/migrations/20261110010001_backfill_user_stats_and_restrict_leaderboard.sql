-- 1) Backfill de XP histórico em user_stats.
--
-- Contexto: o XP é creditado apenas no fluxo de conclusão de aula
-- (supabase/functions/lesson-progress: 50 XP por primeira conclusão).
-- Usuários que concluíram aulas antes desse fluxo (ou após um restore do banco)
-- ficaram com user_progress preenchido e user_stats zerado/ausente.
--
-- A correção é idempotente e conservadora:
--   - usa 50 XP por aula concluída como piso;
--   - nunca reduz XP/nível já existentes (preserva XP de conquistas);
--   - cria user_stats apenas para quem tem ao menos uma aula concluída;
--   - não mexe em ofensiva (não há histórico para reconstruir).
--
-- Sem isso, o ranking global (que lê user_stats.total_xp) mostra todos com 0 XP,
-- enquanto semanal/mensal derivam das aulas concluídas no período.

WITH completed AS (
  SELECT up.user_id,
         (count(*) * 50)::integer AS lesson_xp
  FROM public.user_progress up
  WHERE up.completed = true
  GROUP BY up.user_id
)
UPDATE public.user_stats s
SET total_xp = greatest(s.total_xp, c.lesson_xp),
    level = greatest(s.level, (greatest(s.total_xp, c.lesson_xp) / 100) + 1),
    updated_at = now()
FROM completed c
WHERE s.user_id = c.user_id
  AND s.total_xp < c.lesson_xp;

WITH completed AS (
  SELECT up.user_id,
         (count(*) * 50)::integer AS lesson_xp,
         max(coalesce(up.completed_at, up.created_at)) AS last_completed_at
  FROM public.user_progress up
  WHERE up.completed = true
  GROUP BY up.user_id
)
INSERT INTO public.user_stats (
  user_id, total_xp, level, current_streak, best_streak, lessons_today, last_activity_date
)
SELECT c.user_id,
       c.lesson_xp,
       (c.lesson_xp / 100) + 1,
       0,
       0,
       0,
       c.last_completed_at::date
FROM completed c
ON CONFLICT (user_id) DO NOTHING;

-- 2) O ranking é uma área autenticada (rota /ranking é protegida). O grant
-- padrão do Supabase inclui anon; removemos para não expor nomes/avatares/XP
-- publicamente via anon key.
REVOKE EXECUTE ON FUNCTION public.get_leaderboard_v2(text) FROM anon;
