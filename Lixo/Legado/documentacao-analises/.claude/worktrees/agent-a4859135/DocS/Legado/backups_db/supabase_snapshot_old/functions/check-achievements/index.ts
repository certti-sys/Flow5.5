import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
}

interface UserAchievement {
  achievement_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    console.log(`Checking achievements for user ${user.id}`);

    // Buscar todas as conquistas
    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('achievements')
      .select('*')
      .order('order_index');

    if (achievementsError) throw achievementsError;

    // Buscar conquistas já desbloqueadas
    const { data: userAchievements, error: userAchievementsError } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (userAchievementsError) throw userAchievementsError;

    const unlockedIds = new Set(userAchievements?.map((ua: UserAchievement) => ua.achievement_id) || []);

    // Buscar estatísticas do usuário
    let { data: userStats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
    }

    // Contar aulas completadas (usar user_progress ao invés de lesson_progress)
    const { count: lessonsCompleted, error: lessonsError } = await supabaseClient
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true);

    if (lessonsError) throw lessonsError;

    // Contar cursos completados (curso completo = todas as aulas do curso completadas)
    const { data: coursesData, error: coursesError } = await supabaseClient
      .from('courses')
      .select(`
        id,
        modules!inner(
          id,
          lessons!inner(id)
        )
      `);

    if (coursesError) throw coursesError;

    let coursesCompleted = 0;
    if (coursesData) {
      for (const course of coursesData) {
        const totalLessons = course.modules.reduce((sum: number, module: any) => 
          sum + (module.lessons?.length || 0), 0);
        
        // Buscar aulas completadas pelo usuário para este curso
        // user_progress não tem course_id, então precisamos fazer JOIN com lessons
        const { data: completedLessonsData, error: courseProgressError } = await supabaseClient
          .from('user_progress')
          .select(`
            lesson_id,
            lessons!inner(
              id,
              module_id,
              modules!inner(
                course_id
              )
            )
          `)
          .eq('user_id', user.id)
          .eq('completed', true);

        if (!courseProgressError && completedLessonsData) {
          // Filtrar aulas deste curso específico
          const completedInCourse = completedLessonsData.filter((progress: any) => 
            progress.lessons?.modules?.course_id === course.id
          ).length;

          if (completedInCourse === totalLessons && totalLessons > 0) {
            coursesCompleted++;
          }
        }
      }
    }

    // Se user_stats não existir, criar agora baseado no progresso existente
    if (!userStats) {
      const totalXp = (lessonsCompleted || 0) * 10;
      const level = Math.floor(totalXp / 100) + 1;
      
      const { error: createStatsError } = await supabaseClient
        .from('user_stats')
        .insert({
          user_id: user.id,
          total_xp: totalXp,
          level: level,
          current_streak: 0,
          best_streak: 0,
          last_activity_date: new Date().toISOString().split('T')[0],
          lessons_today: 0,
        });
      
      if (createStatsError) {
        console.error('Error creating user_stats:', createStatsError);
      }

      // Recarregar stats
      const { data: newStats } = await supabaseClient
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      userStats = newStats;
    }

    const currentStreak = userStats?.current_streak || 0;
    const lessonsToday = userStats?.lessons_today || 0;

    // Verificar conquistas e desbloquear novas
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of (achievements || [])) {
      if (unlockedIds.has(achievement.id)) continue;\n\n      let shouldUnlock = false;

      switch (achievement.criteria_type) {\n        case 'lessons_completed':
          shouldUnlock = (lessonsCompleted || 0) >= achievement.criteria_value;
          break;
        case 'courses_completed':
          shouldUnlock = coursesCompleted >= achievement.criteria_value;
          break;
        case 'streak_days':
          shouldUnlock = currentStreak >= achievement.criteria_value;
          break;
        case 'daily_lessons':
          shouldUnlock = lessonsToday >= achievement.criteria_value;
          break;
      }

      if (shouldUnlock) {
        // Desbloquear conquista
        const { error: insertError } = await supabaseClient
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!insertError) {
          newlyUnlocked.push(achievement);
          
          // Adicionar XP da conquista
          const { error: updateError } = await supabaseClient
            .from('user_stats')
            .update({
              total_xp: (userStats?.total_xp || 0) + achievement.xp_reward,
              level: Math.floor(((userStats?.total_xp || 0) + achievement.xp_reward) / 100) + 1,
            })\n            .eq('user_id', user.id);

          if (updateError) {
            console.error('Error updating XP:', updateError);
          }

          console.log(`Unlocked achievement: ${achievement.title} (+${achievement.xp_reward} XP)`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        newlyUnlocked,
        totalXpGained: newlyUnlocked.reduce((sum, a) => sum + a.xp_reward, 0),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {\n    console.error('Error in check-achievements:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});