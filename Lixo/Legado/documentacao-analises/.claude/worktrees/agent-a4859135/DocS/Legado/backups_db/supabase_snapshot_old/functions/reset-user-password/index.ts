import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

console.log('reset-user-password function started')

// Rate limiting: 3 requests per IP per 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const RATE_LIMIT_MAX = 3;

async function checkRateLimit(supabaseAdmin: any, identifier: string, action: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW);
  
  const { data, error } = await supabaseAdmin
    .from('rate_limits')
    .select('count')
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString())
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Rate limit check error:', error);
    return true;
  }

  if (!data) {
    await supabaseAdmin.from('rate_limits').insert({
      identifier,
      action,
      count: 1,
      window_start: new Date().toISOString()
    });
    return true;
  }

  if (data.count >= RATE_LIMIT_MAX) {
    return false;
  }

  await supabaseAdmin
    .from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('identifier', identifier)
    .eq('action', action)
    .gte('window_start', windowStart.toISOString());

  return true;
}

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
    console.error('Audit log error:', error);
  }
}

async function verifyAdminRole(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data: roleData, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .single();

  if (error || !roleData) {
    return false;
  }

  return true;
}

// Function to generate a random password
function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Não autorizado. Token de autenticação necessário.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      console.log('Invalid token or user not found');
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        }
      );
    }

    // Check if caller has admin role
    const isAdmin = await verifyAdminRole(supabaseAdmin, callerUser.id);
    if (!isAdmin) {
      console.log('Access denied: User is not an admin:', callerUser.id);
      return new Response(
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem resetar senhas.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limit
    const isAllowed = await checkRateLimit(supabaseAdmin, ipAddress, 'reset-password');
    if (!isAllowed) {
      console.log('Rate limit exceeded for IP:', ipAddress);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 429
        }
      );
    }

    const { userId } = await req.json()

    console.log('Admin', callerUser.id, 'resetting password for user:', userId)

    // Generate temporary password
    const tempPassword = generatePassword(12)

    // Update user password
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: tempPassword }
    )

    if (updateError) {
      console.error('Error updating password:', updateError)
      throw updateError
    }

    console.log('Password reset successfully for user:', userId)

    // Log audit
    await logAudit(
      supabaseAdmin,
      callerUser.id,
      'reset_password',
      'user',
      userId,
      { temporary_password_generated: true },
      req
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        tempPassword
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in reset-user-password function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
