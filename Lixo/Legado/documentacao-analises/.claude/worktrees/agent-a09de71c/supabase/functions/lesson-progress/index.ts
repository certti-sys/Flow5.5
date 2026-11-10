import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, validateCSRF } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { checkRateLimit } from "../_shared/rate-limiter.ts";
import { z } from "https://esm.sh/zod@3.22.4";

const LessonProgressSchema = z.object({
  action: z.enum(['get', 'update', 'mark_completed', 'get_course_progress']),
  lessonId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  progressPercent: z.number().min(0).max(100).optional(),
});

type LessonProgressRequest = z.infer<typeof LessonProgressSchema>;

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- CSRF PROTECTION ---
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;


  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Token não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(
      supabase,
      user.id,
      'lesson-progress',
      120,    // 120 reqs (generous for progress updates)
      60      // per minute
    );

    if (!rateLimit.allowed) {
      logger.warn(`Rate limit hit for lesson-progress: ${user.id}`);
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

    const bodyRaw = await req.json();
    const resultValidation = LessonProgressSchema.safeParse(bodyRaw);

    if (!resultValidation.success) {
      logger.error('Invalid lesson progress data', resultValidation.error.format());
      return new Response(
        JSON.stringify({ error: 'Dados inválidos', details: resultValidation.error.format() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, progressPercent, lessonId, courseId } = resultValidation.data;
    logger.info(`Lesson progress action: ${action}`, { userId: user.id, lessonId, courseId });

    if (action !== 'get_course_progress') {
      if (!lessonId || !courseId) {
        return new Response(
          JSON.stringify({ error: 'lessonId e courseId são obrigatórios' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (action === 'get') {
      const { data, error } = await supabase
        .from('user_progress')
        .select('progress_percent, completed, last_watched_at')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update') {
      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          progress_percent: Math.round(progressPercent ?? 0),
          last_watched_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' })
        .select('progress_percent, completed, last_watched_at')
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'mark_completed') {
      // 1. Check if already completed to avoid double XP award
      const { data: currentProgress } = await supabase
        .from('user_progress')
        .select('completed')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .maybeSingle();

      const isFirstTime = !currentProgress?.completed;

      const { data, error } = await supabase
        .from('user_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          progress_percent: 100,
          completed: true,
          last_watched_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' })
        .select('progress_percent, completed, last_watched_at')
        .maybeSingle();

      if (error) throw error;

      let xpGained = 0;
      if (isFirstTime) {
        xpGained = 50; // Standard XP per lesson
        
        logger.info(`Awarding XP for first completion`, { userId: user.id, lessonId, xp: xpGained });

        // Fetch current stats
        const { data: stats } = await supabase
          .from('user_stats')
          .select('total_xp, level, lessons_today, last_activity_date')
          .eq('user_id', user.id)
          .maybeSingle();

        const today = new Date().toISOString().split('T')[0];
        
        if (!stats) {
          // Initialize stats if missing
          const newXp = xpGained;
          const newLevel = Math.floor(newXp / 100) + 1;
          await supabase.from('user_stats').insert({
            user_id: user.id,
            total_xp: newXp,
            level: newLevel,
            current_streak: 1, // Start streak
            best_streak: 1,
            lessons_today: 1,
            last_activity_date: today
          });
        } else {
          // Update existing stats
          const newTotalXp = (stats.total_xp || 0) + xpGained;
          const newLevel = Math.floor(newTotalXp / 100) + 1;
          
          let newStreak = stats.current_streak || 0;
          let newBestStreak = stats.best_streak || 0;
          
          if (!stats.last_activity_date) {
            newStreak = 1;
          } else {
            const lastDate = new Date(stats.last_activity_date);
            const currentDate = new Date(today);
            const diffTime = Math.abs(currentDate.getTime() - lastDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
              // Consecutive day!
              newStreak += 1;
            } else if (diffDays > 1) {
              // Streak broken
              newStreak = 1;
            }
            // If diffDays === 0, it's the same day, streak doesn't change
          }

          if (newStreak > newBestStreak) {
            newBestStreak = newStreak;
          }

          const isNewDay = stats.last_activity_date !== today;
          const newLessonsToday = isNewDay ? 1 : (stats.lessons_today || 0) + 1;
          
          await supabase.from('user_stats').update({
            total_xp: newTotalXp,
            level: newLevel,
            current_streak: newStreak,
            best_streak: newBestStreak,
            lessons_today: newLessonsToday,
            last_activity_date: today,
            updated_at: new Date().toISOString()
          }).eq('user_id', user.id);
        }
      }

      return new Response(
        JSON.stringify({ data, xpGained }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_course_progress') {
      if (!courseId) {
        return new Response(
          JSON.stringify({ error: 'courseId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: allLessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id')
        .eq('module_id', courseId);
      if (lessonsError) throw lessonsError;

      if (!allLessons || allLessons.length === 0) {
        return new Response(
          JSON.stringify({ data: { lessonProgress: [], courseProgress: 0 } }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('lesson_id, progress_percent, completed')
        .eq('user_id', user.id)
        .eq('course_id', courseId);
      if (progressError) throw progressError;

      const progressMap = new Map<string, number>();
      progressData?.forEach(p => {
        progressMap.set(p.lesson_id, p.progress_percent || 0);
      });

      let totalProgress = 0;
      allLessons.forEach(lesson => {
        totalProgress += progressMap.get(lesson.id) || 0;
      });

      const courseProgress = Math.round(totalProgress / allLessons.length);

      return new Response(
        JSON.stringify({ data: { lessonProgress: progressData ?? [], courseProgress } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error(`Error in lesson-progress`, error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
