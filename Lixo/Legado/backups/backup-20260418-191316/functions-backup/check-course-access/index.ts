import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateCSRF } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';

interface CourseAccessMap {
  [courseId: string]: boolean;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- CSRF PROTECTION ---
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;


  try {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    logger.info(`Auth header present: ${!!authHeader}`);

    if (!authHeader) {
      logger.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify token manually/explicitly
    const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      logger.error('Invalid token or user not found', { userError });
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- RATE LIMITING ---
    const rateLimit = await checkRateLimit(
      supabase,
      user.id,
      'check-course-access',
      60, // 60 requests
      60  // per minute
    );

    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests", 
          retryAfter: rateLimit.retryAfter 
        }), 
        { 
          status: 429, 
          headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": String(rateLimit.retryAfter) } 
        }
      );
    }

    const { courseIds } = await req.json();
    logger.info(`Checking course access`, { 
      userId: user.id, 
      userEmail: user.email,
      courseIds: courseIds 
    });
    if (!courseIds || !Array.isArray(courseIds)) {
      return new Response(
        JSON.stringify({ error: 'courseIds must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(ur => ur.role === 'admin');
    logger.info(`Access check for user: ${user.id}`, { isAdmin, roleCount: userRoles?.length });

    if (isAdmin) {
      const accessMap: CourseAccessMap = {};
      courseIds.forEach((id: string) => accessMap[id] = true);
      return new Response(
        JSON.stringify({ accessMap }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: userCourseAccess } = await supabase
      .from('user_course_access')
      .select('course_id')
      .eq('user_id', user.id)
      .in('course_id', courseIds);

    const { data: courses } = await supabase
      .from('courses')
      .select('id, category')
      .in('id', courseIds);

    const categories = [...new Set(
      courses?.map(c => c.category).filter(Boolean) as string[]
    )];

    let categoryAccess: any[] = [];
    if (categories.length > 0) {
      const { data } = await supabase
        .from('user_course_categories')
        .select('category')
        .eq('user_id', user.id)
        .in('category', categories);
      categoryAccess = data || [];
    }

    const accessMap: CourseAccessMap = {};

    courseIds.forEach((courseId: string) => {
      const hasDirectAccess = userCourseAccess?.some(
        uca => uca.course_id === courseId
      );

      if (hasDirectAccess) {
        accessMap[courseId] = true;
        return;
      }

      const course = courses?.find(c => c.id === courseId);
      if (course?.category) {
        const hasCategoryAccess = categoryAccess.some(
          ca => ca.category === course.category
        );
        if (hasCategoryAccess) {
          accessMap[courseId] = true;
          return;
        }
      }

      accessMap[courseId] = false;
    });

    logger.info('Access check result', { 
        userId: user.id, 
        grantedCount: Object.values(accessMap).filter(v => v).length,
        totalRequested: courseIds.length 
    });

    return new Response(
      JSON.stringify({ accessMap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error(`Error in check-course-access`, error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
