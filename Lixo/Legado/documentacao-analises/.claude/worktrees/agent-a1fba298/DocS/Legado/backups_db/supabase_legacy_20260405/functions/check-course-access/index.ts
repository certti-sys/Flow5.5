import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CourseAccessMap {
  [courseId: string]: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get courseIds from request body
    const { courseIds } = await req.json();
    if (!courseIds || !Array.isArray(courseIds)) {
      return new Response(
        JSON.stringify({ error: 'courseIds must be an array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking access for user ${user.id} to courses:`, courseIds);

    // Check if user is admin (admins have access to everything)
    const { data: userRoles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const isAdmin = userRoles?.some(ur => ur.role === 'admin');
    console.log(`User is admin: ${isAdmin}`);

    if (isAdmin) {
      // Admin has access to everything
      const accessMap: CourseAccessMap = {};
      courseIds.forEach((id: string) => accessMap[id] = true);
      return new Response(
        JSON.stringify({ accessMap }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check direct access via user_course_access
    const { data: userCourseAccess } = await supabase
      .from('user_course_access')
      .select('course_id')
      .eq('user_id', user.id)
      .in('course_id', courseIds);

    console.log(`Direct access records:`, userCourseAccess);

    // Get course categories
    const { data: courses } = await supabase
      .from('courses')
      .select('id, category')
      .in('id', courseIds);

    console.log(`Courses with categories:`, courses);

    // Extract unique categories
    const categories = [...new Set(
      courses?.map(c => c.category).filter(Boolean) as string[]
    )];

    // Check category access via user_course_categories
    let categoryAccess: any[] = [];
    if (categories.length > 0) {
      const { data } = await supabase
        .from('user_course_categories')
        .select('category')
        .eq('user_id', user.id)
        .in('category', categories);
      categoryAccess = data || [];
      console.log(`Category access records:`, categoryAccess);
    }

    // Build access map
    const accessMap: CourseAccessMap = {};

    courseIds.forEach((courseId: string) => {
      // First: check direct access
      const hasDirectAccess = userCourseAccess?.some(
        uca => uca.course_id === courseId
      );

      if (hasDirectAccess) {
        accessMap[courseId] = true;
        return;
      }

      // Second: check category access
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

      // No access
      accessMap[courseId] = false;
    });

    console.log(`Final access map:`, accessMap);

    return new Response(
      JSON.stringify({ accessMap }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in check-course-access:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
