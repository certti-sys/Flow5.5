import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const resetPasswordSchema = z.object({
  userId: z.string().uuid()
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

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
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
      logger.error('Auth error in reset-user-password', authError);
      return new Response(JSON.stringify({ error: 'Token inválido ou expirado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const isAdmin = await verifyAdminRole(supabaseAdmin, callerUser.id);
    if (!isAdmin) {
      logger.warn('Non-admin attempted reset-user-password', { adminUserId: callerUser.id });
      return new Response(JSON.stringify({ error: 'Acesso negado.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // --- SHARED RATE LIMITING ---
    const rateLimit = await checkRateLimit(
      supabaseAdmin,
      ipAddress,
      'reset-password',
      3,          // 3 requests
      15 * 60     // per 15 minutes
    );

    if (!rateLimit.allowed) {
      logger.info('Rate limit hit for reset-password', { ipAddress });
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

    const body = await req.json()
    const result = resetPasswordSchema.safeParse(body)
    if (!result.success) {
      return new Response(JSON.stringify({ error: 'Dados inválidos.', details: result.error.format() }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
    }

    const { userId } = result.data
    logger.info(`Resetting password for user: ${userId}`, { adminUserId: callerUser.id });

    const tempPassword = generatePassword(12)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: tempPassword })

    if (updateError) {
      logger.error('Error updating password', updateError);
      throw updateError
    }

    await logAudit(supabaseAdmin, callerUser.id, 'reset_password', 'user', userId, { temporary_password_generated: true }, req);

    logger.info('Password reset successfully');

    return new Response(JSON.stringify({ success: true, tempPassword }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
  } catch (error) {
    logger.error('Internal function error in reset-user-password', error);
    return new Response(JSON.stringify({ error: 'Erro interno ao resetar senha' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 })
  }
})

