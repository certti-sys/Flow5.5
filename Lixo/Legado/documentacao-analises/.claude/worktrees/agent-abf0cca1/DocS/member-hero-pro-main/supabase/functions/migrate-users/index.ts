import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserToMigrate {
  id: string;
  email: string;
  password: string;
  name?: string;
  nome?: string;
  role?: string;
  isAdmin?: boolean;
  avatar?: string;
  status?: string;
}

interface MigrationResult {
  oldId: string;
  newId?: string;
  existingId?: string;
  email: string;
  success: boolean;
  skipped: boolean;
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Criar cliente com Service Role Key para bypass de RLS
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { users } = await req.json() as { users: UserToMigrate[] };
    
    if (!users || !Array.isArray(users)) {
      return new Response(
        JSON.stringify({ error: 'Users array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[migrate-users] Starting migration of ${users.length} users`);

    const results: MigrationResult[] = [];

    for (const user of users) {
      const email = user.email?.toLowerCase()?.trim();
      
      if (!email) {
        results.push({
          oldId: user.id,
          email: 'N/A',
          success: false,
          skipped: false,
          error: 'Email is required',
        });
        continue;
      }

      try {
        // Verificar se usuário já existe pelo email
        const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (listError) {
          console.error(`[migrate-users] Error listing users:`, listError);
          throw listError;
        }

        const existingUser = existingUsers.users.find(u => u.email?.toLowerCase() === email);

        if (existingUser) {
          console.log(`[migrate-users] User ${email} already exists with ID ${existingUser.id}`);
          
          // Verificar se profile existe
          const { data: existingProfile } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('user_id', existingUser.id)
            .maybeSingle();

          if (!existingProfile) {
            // Criar profile se não existir
            await supabaseAdmin.from('profiles').insert({
              user_id: existingUser.id,
              name: user.name || user.nome || email.split('@')[0],
              email: email,
              avatar: user.avatar || null,
              status: user.status || 'active',
            });
            console.log(`[migrate-users] Created profile for existing user ${email}`);
          }

          // Verificar/criar role
          const isAdmin = user.isAdmin === true || user.role === 'admin';
          const role = isAdmin ? 'admin' : 'student';

          const { data: existingRole } = await supabaseAdmin
            .from('user_roles')
            .select('id')
            .eq('user_id', existingUser.id)
            .eq('role', role)
            .maybeSingle();

          if (!existingRole) {
            await supabaseAdmin.from('user_roles').insert({
              user_id: existingUser.id,
              role: role,
            });
            console.log(`[migrate-users] Created role ${role} for user ${email}`);
          }

          results.push({
            oldId: user.id,
            existingId: existingUser.id,
            email: email,
            success: false,
            skipped: true,
          });
          continue;
        }

        // Criar novo usuário
        const password = user.password || 'TempPassword123!';
        
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: email,
          password: password,
          email_confirm: true, // Confirmar email automaticamente
          user_metadata: {
            name: user.name || user.nome || email.split('@')[0],
          },
        });

        if (createError) {
          console.error(`[migrate-users] Error creating user ${email}:`, createError);
          throw createError;
        }

        console.log(`[migrate-users] Created user ${email} with ID ${newUser.user.id}`);

        // Criar profile
        const { error: profileError } = await supabaseAdmin.from('profiles').insert({
          user_id: newUser.user.id,
          name: user.name || user.nome || email.split('@')[0],
          email: email,
          avatar: user.avatar || null,
          status: user.status || 'active',
        });

        if (profileError) {
          console.error(`[migrate-users] Error creating profile for ${email}:`, profileError);
        } else {
          console.log(`[migrate-users] Created profile for ${email}`);
        }

        // Criar role
        const isAdmin = user.isAdmin === true || user.role === 'admin';
        const role = isAdmin ? 'admin' : 'student';

        const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
          user_id: newUser.user.id,
          role: role,
        });

        if (roleError) {
          console.error(`[migrate-users] Error creating role for ${email}:`, roleError);
        } else {
          console.log(`[migrate-users] Created role ${role} for ${email}`);
        }

        results.push({
          oldId: user.id,
          newId: newUser.user.id,
          email: email,
          success: true,
          skipped: false,
        });

      } catch (userError: any) {
        console.error(`[migrate-users] Failed to migrate user ${email}:`, userError);
        results.push({
          oldId: user.id,
          email: email,
          success: false,
          skipped: false,
          error: userError.message || 'Unknown error',
        });
      }
    }

    const summary = {
      total: users.length,
      created: results.filter(r => r.success).length,
      skipped: results.filter(r => r.skipped).length,
      errors: results.filter(r => !r.success && !r.skipped).length,
    };

    console.log(`[migrate-users] Migration complete:`, summary);

    return new Response(
      JSON.stringify({ results, summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[migrate-users] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
