-- Recria a RPC usada pela página de Ranking (/ranking).
--
-- A função era referenciada apenas pelo frontend (src/pages/Leaderboard.tsx) e
-- nunca foi versionada neste repositório. No banco de produção ela não existe,
-- então o PostgREST responde PGRST202 ("Could not find the function
-- public.get_leaderboard_v2(period_type) in the schema cache").
--
-- Como a policy de SELECT em public.profiles permite apenas o próprio usuário
-- (ou admin), o ranking precisa de uma função SECURITY DEFINER para expor
-- somente os campos públicos necessários (nome, avatar, XP, nível, ofensiva).
--
-- Semanal/mensal: não existe extrato de XP no banco, então o XP do período é
-- derivado das aulas concluídas dentro do período, usando a mesma regra de
-- gamificação do app (50 XP por aula concluída pela primeira vez).

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(period_type text DEFAULT 'global')
RETURNS TABLE (
  user_id uuid,
  user_name text,
  avatar_url text,
  total_xp integer,
  level integer,
  current_streak integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH bounds AS (
    SELECT CASE lower(coalesce(period_type, 'global'))
             WHEN 'weekly'  THEN date_trunc('week', now())
             WHEN 'monthly' THEN date_trunc('month', now())
             ELSE NULL
           END AS start_at
  ),
  ranked AS (
    SELECT
      p.id AS user_id,
      coalesce(nullif(btrim(p.name), ''), 'Membro Oculto') AS user_name,
      p.avatar_url,
      coalesce(s.level, 1) AS level,
      coalesce(s.current_streak, 0) AS current_streak,
      CASE
        WHEN b.start_at IS NULL THEN coalesce(s.total_xp, 0)
        ELSE coalesce((
          SELECT count(*) * 50
          FROM public.user_progress up
          WHERE up.user_id = p.id
            AND up.completed = true
            AND coalesce(up.completed_at, up.created_at) >= b.start_at
        ), 0)
      END::integer AS total_xp
    FROM public.profiles p
    LEFT JOIN public.user_stats s ON s.user_id = p.id
    CROSS JOIN bounds b
    WHERE coalesce(p.status, 'active') = 'active'
  )
  SELECT r.user_id,
         r.user_name,
         r.avatar_url,
         r.total_xp,
         r.level,
         r.current_streak
  FROM ranked r
  ORDER BY r.total_xp DESC, r.level DESC, r.user_name ASC
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_v2(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(text) TO authenticated;

NOTIFY pgrst, 'reload schema';
