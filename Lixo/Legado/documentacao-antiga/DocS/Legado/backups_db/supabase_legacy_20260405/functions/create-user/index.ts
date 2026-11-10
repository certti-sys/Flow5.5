import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

console.log('create-user function started')

// Rate limiting: 5 requests per IP per 15 minutes
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms
const RATE_LIMIT_MAX = 5;

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
    return true; // Allow on error to prevent blocking legitimate requests
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

async function logAudit(supabaseAdmin: any, userId: string, action: string, resourceType: string, resourceId: string, details: any, req: Request) {
  try {
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    await supabaseAdmin.from('audit_logs').insert({
      user_id: userId,
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
        JSON.stringify({ error: 'Acesso negado. Apenas administradores podem criar usuários.' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 403
        }
      );
    }

    // Get IP address for rate limiting
    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Check rate limit
    const isAllowed = await checkRateLimit(supabaseAdmin, ipAddress, 'create-user');
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

    const { email, password, name, whatsapp } = await req.json()

    console.log('Admin', callerUser.id, 'creating user with email:', email)

    // Create user in Supabase Auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name,
        whatsapp
      }
    })

    if (createError) {
      console.error('Error creating user:', createError)
      throw createError
    }

    console.log('User created successfully:', authData.user.id)

    // Log audit
    await logAudit(
      supabaseAdmin,
      callerUser.id,
      'create_user',
      'user',
      authData.user.id,
      { email, name, whatsapp },
      req
    );

    return new Response(
      JSON.stringify({ 
        success: true,
        userId: authData.user.id
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Error in create-user function:', error)
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
