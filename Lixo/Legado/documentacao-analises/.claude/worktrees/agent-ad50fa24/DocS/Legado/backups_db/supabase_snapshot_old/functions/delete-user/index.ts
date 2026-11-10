import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate limiting: 5 requests per 15 minutes per IP
async function checkRateLimit(supabaseAdmin: any, identifier: string, action: string): Promise<boolean> {
  const windowMinutes = 15;
  const maxRequests = 5;
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  // Clean old entries and get current count
  const { data: existing } = await supabaseAdmin
    .from('rate_limits')
    .select('id, count')
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('window_start', windowStart)
    .single();

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
  await supabaseAdmin.from('audit_logs').insert({
    user_id: adminUserId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown',
    user_agent: req.headers.get('user-agent') || 'unknown'
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get client IP for rate limiting
    const clientIP = req.headers.get('x-forwarded-for') || \n                     req.headers.get('cf-connecting-ip') || \n                     'unknown';

    // Check rate limit
    const allowed = await checkRateLimit(supabaseAdmin, clientIP, 'delete_user');
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: 'Taxa de requisições excedida. Tente novamente em 15 minutos.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),\n        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n      );
    }

    // Verify admin authorization
    let adminUserId = 'system';
    const authHeader = req.headers.get('Authorization');
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: adminUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      if (authError || !adminUser) {
        return new Response(
          JSON.stringify({ error: 'Não autorizado' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user is admin
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', adminUser.id)\n        .eq('role', 'admin')\n        .single();\n\n      if (!roleData) {\n        return new Response(\n          JSON.stringify({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' }),\n          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n        );\n      }\n\n      adminUserId = adminUser.id;\n    } else {\n      return new Response(\n        JSON.stringify({ error: 'Token de autorização necessário' }),\n        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n      );\n    }\n\n    // Get user info before deletion for audit log\n    const { data: userToDelete } = await supabaseAdmin.auth.admin.getUserById(userId);\n\n    // Delete the user from Supabase Auth (cascades to profiles and related tables)\n    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);\n\n    if (deleteError) {\n      console.error('Error deleting user:', deleteError);\n      return new Response(\n        JSON.stringify({ error: `Erro ao excluir usuário: \${deleteError.message}` }),\n        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n      );\n    }\n\n    // Log the deletion in audit_logs\n    await logAudit(\n      supabaseAdmin,\n      adminUserId,\n      'delete_user',\n      'user',\n      userId,\n      { \n        deleted_user_email: userToDelete?.user?.email || 'unknown',\n        deleted_at: new Date().toISOString()\n      },\n      req\n    );\n\n    console.log(`User \${userId} deleted by admin \${adminUserId}`);\n\n    return new Response(\n      JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),\n      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n    );\n\n  } catch (error: unknown) {\n    console.error('Error in delete-user function:', error);\n    const errorMessage = error instanceof Error ? error.message : 'Erro interno do servidor';\n    return new Response(\n      JSON.stringify({ error: errorMessage }),\n      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }\n    );\n  }\n});\n
