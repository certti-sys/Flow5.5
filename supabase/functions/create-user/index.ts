import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  whatsapp: z.string().optional(),
  role: z.enum(['admin', 'student']).default('student'),
  courseIds: z.array(z.string().uuid()).optional().default([])
})


async function logAudit(supabaseAdmin: any, adminUserId: string, action: string, resourceType: string, resourceId: string, details: any, req: Request) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabaseAdmin.from('audit_logs').insert({
      user_id: adminUserId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details,
      ip_address: ipAddress,
      user_agent: userAgent
    });
  } catch (error) {
    logger.error('Audit log error', error);
  }
}

async function verifyAdminRole(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data: roleData, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (error || !roleData) return false;
  return true;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      logger.error('Auth error in create-user', authError);
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const isAdmin = await verifyAdminRole(supabaseAdmin, callerUser.id);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // --- SHARED RATE LIMITING ---
    const rateLimit = await checkRateLimit(
      supabaseAdmin,
      ipAddress,
      'create-user',
      5,          // 5 requests
      15 * 60     // per 15 minutes
    );

    if (!rateLimit.allowed) {
      logger.info('Rate limit hit for create-user', { ipAddress });
      return new Response(
        JSON.stringify({ 
          error: 'Muitas solicitações.', 
          retryAfter: rateLimit.retryAfter 
        }), 
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) }, 
          status: 429 
        }
      );
    }

    const body = await req.json();
    const result = createUserSchema.safeParse(body);
    
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Dados inválidos.', details: result.error.format() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { email, password, name, whatsapp, role, courseIds } = result.data;
    logger.info(`Creating user: ${email}`, { role });

    const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name, whatsapp: whatsapp || null }
    })

    if (createError || !authUser.user) {
      logger.error('Error creating auth user', createError);
      throw createError || new Error('Failed to create user')
    }

    const userId = authUser.user.id
    
    // Criar ou atualizar perfil (UPSERT)
    await supabaseAdmin.from('profiles').upsert({
      id: userId,
      name: name,
      whatsapp: whatsapp || null,
      status: 'active',
    }, { onConflict: 'id' });
    
    // Inserir ou atualizar role
    await supabaseAdmin.from('user_roles').upsert({
      user_id: userId,
      role: role,
    }, { onConflict: 'user_id, role' });

    if (courseIds && courseIds.length > 0) {
      const accessRows = courseIds.map((id: string) => ({
        user_id: userId,
        course_id: id,
        source: 'admin_manual',
        granted_by: callerUser.id
      }))
      await supabaseAdmin.from('user_course_access').insert(accessRows)
    }

    await logAudit(supabaseAdmin, callerUser.id, 'create_user', 'user', userId, { email_domain: email.split('@')[1], role_assigned: role }, req);

    logger.info('User created successfully', { userId });

    return new Response(JSON.stringify({ success: true, userId }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201 })
  } catch (error) {
    logger.error('Internal function error in create-user', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})
