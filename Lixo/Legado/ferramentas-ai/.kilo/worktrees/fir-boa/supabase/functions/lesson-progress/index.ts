import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
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
        .from('lesson_progress')
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
        .from('lesson_progress')
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
      const { data, error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          progress_percent: 100,
          completed: true,
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
        .from('lesson_progress')
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
