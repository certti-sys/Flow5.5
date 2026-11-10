import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, validateCSRF } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'

// Rate limiting: 5 requests per 15 minutes per IP
async function checkRateLimit(supabaseAdmin: any, identifier: string, action: string): Promise<boolean> {
  const windowMinutes = 15;
  const maxRequests = 5;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Clean old entries and get current count
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('rate_limits')
    .select('id, count')
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('window_start', windowStart)
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    logger.error('Rate limit check error', checkError);
    return true;
  }

  if (existing) {
    if (existing.count >= maxRequests) {
      return false; // Rate limited
    }
    // Increment count
    await supabaseAdmin
      .from('rate_limits')
      .update({ count: existing.count + 1 })
      .eq('id', existing.id);
  } else {
    // Create new entry
    await supabaseAdmin
      .from('rate_limits')
      .insert({
        identifier,
        action,
        count: 1,
        window_start: new Date().toISOString()
      });
  }
  return true;
}

// Audit logging
async function logAudit(
  supabaseAdmin: any,
  adminUserId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: any,
  req: Request
) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
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

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- CSRF PROTECTION ---
  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;


  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || 
                     req.headers.get('cf-connecting-ip') || 
                     'unknown';

    // Check rate limit
    const allowed = await checkRateLimit(supabaseAdmin, clientIP, 'delete_user');
    if (!allowed) {
      logger.info('Rate limit hit for delete-user', { clientIP });
      return new Response(
        JSON.stringify({ error: 'Taxa de requisições excedida. Tente novamente em 15 minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin authorization
    let adminUserId = 'system';
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !adminUser) {
        logger.error('Auth error in delete-user', authError);
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', adminUser.id)
        .eq('role', 'admin')
        .single();

      if (roleError || !roleData) {
        logger.warn('Non-admin attempted delete-user', { adminUserId: adminUser.id });
        return new Response(
          JSON.stringify({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      adminUserId = adminUser.id;
    } else {
      return new Response(
        JSON.stringify({ error: 'Token de autorização necessário' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user info before deletion for audit log
    const { data: userToDelete } = await supabaseAdmin.auth.admin.getUserById(userId);

    logger.info(`Deleting user: ${userId}`, { deletedBy: adminUserId });

    // Delete the user from Supabase Auth (cascades to profiles and related tables)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      logger.error('Error deleting user', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao excluir usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the deletion in audit_logs
    await logAudit(
      supabaseAdmin,
      adminUserId,
      'delete_user',
      'user',
      userId,
      { 
        deleted_user_email: userToDelete?.user?.email || 'unknown',
        deleted_at: new Date().toISOString()
      },
      req
    );

    logger.info('User deleted successfully', { userId });

    return new Response(
      JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    logger.error('Internal function error in delete-user', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
