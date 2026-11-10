import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "https://esm.sh/zod@3.22.4";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
}

const UserAchievementSchema = z.object({
  achievement_id: z.string().uuid(),
});

type UserAchievement = z.infer<typeof UserAchievementSchema>;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
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

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(
      supabaseClient,
      user.id,
      'check-achievements',
      30,      // 30 reqs
      60       // per minute
    );

    if (!rateLimit.allowed) {
      logger.warn(`Rate limit hit for check-achievements: ${user.id}`);
      return new Response(
        JSON.stringify({ 
          error: 'Muitas solicitações.', 
          retryAfter: rateLimit.retryAfter 
        }), 
        { 
          status: 429, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) } 
        }
      );
    }

    logger.info(`Checking achievements`, { userId: user.id });

    const { data: achievements, error: achievementsError } = await supabaseClient
      .from('achievements')
      .select('*')
      .order('order_index');

    if (achievementsError) throw achievementsError;

    const { data: userAchievements, error: userAchievementsError } = await supabaseClient
      .from('user_achievements')
      .select('achievement_id')
      .eq('user_id', user.id);

    if (userAchievementsError) throw userAchievementsError;

    const unlockedIds = new Set(userAchievements?.map((ua: UserAchievement) => ua.achievement_id) || []);

    let { data: userStats, error: statsError } = await supabaseClient
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      logger.error('Error fetching user stats', statsError);
    }

    const { count: lessonsCompleted, error: lessonsError } = await supabaseClient
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('completed', true);

    if (lessonsError) throw lessonsError;

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
          const completedInCourse = completedLessonsData.filter((progress: any) => 
            progress.lessons?.modules?.course_id === course.id
          ).length;

          if (completedInCourse === totalLessons && totalLessons > 0) {
            coursesCompleted++;
          }
        }
      }
    }

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
      
      const { data: newStats } = await supabaseClient
        .from('user_stats')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      userStats = newStats;
    }

    const currentStreak = userStats?.current_streak || 0;
    const lessonsToday = userStats?.lessons_today || 0;

    const newlyUnlocked: Achievement[] = [];

    for (const achievement of (achievements || [])) {
      if (unlockedIds.has(achievement.id)) continue;

      let shouldUnlock = false;

      switch (achievement.criteria_type) {
        case 'lessons_completed':
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
        const { error: insertError } = await supabaseClient
          .from('user_achievements')
          .insert({
            user_id: user.id,
            achievement_id: achievement.id,
          });

        if (!insertError) {
          newlyUnlocked.push(achievement);
          
          const { error: updateError } = await supabaseClient
            .from('user_stats')
            .update({
              total_xp: (userStats?.total_xp || 0) + achievement.xp_reward,
              level: Math.floor(((userStats?.total_xp || 0) + achievement.xp_reward) / 100) + 1,
            })
            .eq('user_id', user.id);
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

  } catch (error) {
    logger.error(`Error in check-achievements`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
