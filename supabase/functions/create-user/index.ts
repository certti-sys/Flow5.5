import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, validateCSRF } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'
import { checkRateLimit } from '../_shared/rate-limiter.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

// 'student' era aceito pela UI antiga, mas o enum app_role só tem admin|moderator|user.
// O upsert antigo falhava em silêncio; aqui normalizamos antes de gravar.
const roleSchema = z.enum(['admin', 'student', 'user']).default('user')
const normalizeRole = (role: string) => (role === 'student' ? 'user' : role)

const singleUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  whatsapp: z.string().min(10, "WhatsApp inválido"),
  role: roleSchema,
  courseIds: z.array(z.string().uuid()).optional().default([]),
})

const bulkUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  whatsapp: z.string().optional(),
  password: z.string().min(6).optional(),
})

const bulkSchema = z.object({
  users: z.array(bulkUserSchema).min(1).max(100),
  courseIds: z.array(z.string().uuid()).optional().default([]),
  grantToExisting: z.boolean().optional().default(false),
  sendWelcome: z.boolean().optional().default(true),
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

/** Senha aleatória forte: o aluno define a definitiva pelo link do e-mail. */
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('') + '!A9';
}

async function grantCourses(supabaseAdmin: any, userId: string, courseIds: string[], source: string, grantedBy: string) {
  if (courseIds.length === 0) return;

  const { error } = await supabaseAdmin
    .from('user_course_access')
    .upsert(
      courseIds.map((courseId) => ({
        user_id: userId,
        course_id: courseId,
        source,
        granted_by: grantedBy,
      })),
      { onConflict: 'user_id,course_id', ignoreDuplicates: true },
    );

  if (error) logger.error('Error granting courses', error);
}

/** Envia o e-mail de boas-vindas com link de definição de senha. */
async function sendWelcomeEmail(supabaseUrl: string, serviceKey: string, email: string, name: string) {
  try {
    const { data: linkData } = await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'recovery', email }),
    }).then((r) => r.json().then((body) => ({ data: body })));

    const loginUrl = linkData?.action_link || '';

    const res = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        'x-requested-with': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        to: email,
        toName: name,
        type: 'welcome',
        variables: { name, login_url: loginUrl, email },
      }),
    });

    if (!res.ok) {
      logger.warn('Welcome email failed', { email, status: res.status });
      return false;
    }
    return true;
  } catch (error) {
    logger.error('Error sending welcome email', error);
    return false;
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Não autorizado.' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      logger.error('Auth error in create-user', authError);
      return json({ error: 'Token inválido ou expirado.' }, 401);
    }

    const isAdmin = await verifyAdminRole(supabaseAdmin, callerUser.id);
    if (!isAdmin) return json({ error: 'Acesso negado.' }, 403);

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const body = await req.json();
    const isBulk = Array.isArray(body?.users);

    // Lote é uma ação do admin, não do IP: limitar por IP bloquearia a importação
    // de 25 em 25 depois de 5 alunos vindos da mesma rede.
    const rateLimit = isBulk
      ? await checkRateLimit(supabaseAdmin, callerUser.id, 'create-user-bulk', 20, 60 * 60)
      : await checkRateLimit(supabaseAdmin, ipAddress, 'create-user', 5, 15 * 60);

    if (!rateLimit.allowed) {
      logger.info('Rate limit hit for create-user', { ipAddress, isBulk });
      return new Response(
        JSON.stringify({ error: 'Muitas solicitações.', retryAfter: rateLimit.retryAfter }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) },
          status: 429,
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // ---------- LOTE ----------
    if (isBulk) {
      const parsed = bulkSchema.safeParse(body);
      if (!parsed.success) {
        return json({ error: 'Dados inválidos.', details: parsed.error.format() }, 400);
      }

      const { users, courseIds, grantToExisting, sendWelcome } = parsed.data;
      const results: Array<{ email: string; status: 'created' | 'exists' | 'error'; message?: string; emailSent?: boolean }> = [];

      for (const user of users) {
        const email = user.email.trim().toLowerCase();

        try {
          const password = user.password ?? generatePassword();

          const { data: authUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name: user.name, whatsapp: user.whatsapp || null },
          });

          if (createError || !authUser?.user) {
            const alreadyExists = /already|registered|exists/i.test(createError?.message ?? '');

            if (!alreadyExists) {
              results.push({ email, status: 'error', message: createError?.message || 'Falha ao criar usuário' });
              continue;
            }

            if (!grantToExisting) {
              results.push({ email, status: 'exists', message: 'E-mail já cadastrado (acesso não alterado).' });
              continue;
            }

            const { data: existing } = await supabaseAdmin
              .from('profiles')
              .select('id')
              .eq('email', email)
              .maybeSingle();

            if (!existing?.id) {
              results.push({ email, status: 'exists', message: 'E-mail já cadastrado, perfil não localizado.' });
              continue;
            }

            await grantCourses(supabaseAdmin, existing.id, courseIds, 'import', callerUser.id);
            results.push({ email, status: 'exists', message: 'Já existia: acesso aos cursos concedido.' });
            continue;
          }

          const userId = authUser.user.id;

          // O trigger handle_new_user já cria o perfil; aqui só completamos nome/whatsapp.
          await supabaseAdmin.from('profiles').upsert({
            id: userId,
            name: user.name,
            whatsapp: user.whatsapp || null,
            status: 'active',
          }, { onConflict: 'id' });

          await supabaseAdmin.from('user_roles').upsert(
            { user_id: userId, role: 'user' },
            { onConflict: 'user_id, role', ignoreDuplicates: true },
          );

          await grantCourses(supabaseAdmin, userId, courseIds, 'import', callerUser.id);

          const emailSent = sendWelcome ? await sendWelcomeEmail(supabaseUrl, serviceKey, email, user.name) : false;
          results.push({ email, status: 'created', emailSent });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Erro desconhecido';
          logger.error('Bulk import row error', { email, message });
          results.push({ email, status: 'error', message });
        }
      }

      const summary = {
        total: results.length,
        created: results.filter((r) => r.status === 'created').length,
        exists: results.filter((r) => r.status === 'exists').length,
        errors: results.filter((r) => r.status === 'error').length,
        emailsSent: results.filter((r) => r.emailSent).length,
      };

      await logAudit(supabaseAdmin, callerUser.id, 'import_users', 'user', 'bulk', {
        total: summary.total,
        created: summary.created,
        courses: courseIds.length,
        grant_to_existing: grantToExisting,
      }, req);

      return json({ results, summary }, 201);
    }

    // ---------- USUÁRIO ÚNICO ----------
    const result = singleUserSchema.safeParse(body);
    if (!result.success) {
      return json({ error: 'Dados inválidos.', details: result.error.format() }, 400);
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
      role: normalizeRole(role),
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

    await logAudit(supabaseAdmin, callerUser.id, 'create_user', 'user', userId, { email_domain: email.split('@')[1], role_assigned: normalizeRole(role) }, req);

    logger.info('User created successfully', { userId });

    return json({ success: true, userId }, 201);
  } catch (error) {
    logger.error('Internal function error in create-user', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return json({ error: errorMessage }, 400);
  }
})
