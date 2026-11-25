import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateCSRF } from '../_shared/cors.ts';
import { logger } from '../_shared/logger.ts';
import { checkRateLimit } from '../_shared/rate-limiter.ts';
import { z } from 'https://esm.sh/zod@3.22.4';

const RequestSchema = z.object({
  materialId: z.string().uuid(),
});

/** 10 min: tempo de sobra para ler o PDF inteiro e curto o bastante para não vazar. */
const SIGNED_URL_TTL_SECONDS = 600;

/**
 * Emite URL assinada para o PDF de uma aula.
 *
 * Por que uma edge em vez de `createSignedUrl` no cliente: o bucket é privado e
 * não tem policy de SELECT para aluno, então quem assina é a service role — e é
 * aqui, antes de assinar, que se confere que o aluno tem acesso ao curso, não
 * está travado por drip e o material realmente pertence àquela aula.
 *
 * Sem isso, qualquer aluno logado que descobrisse um caminho de arquivo leria o
 * PDF de qualquer curso.
 */
Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const csrfError = validateCSRF(req);
  if (csrfError) return csrfError;

  try {
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', '')
    );
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rateLimit = await checkRateLimit(supabaseAdmin, user.id, 'lesson-file-url', 60, 60);
    if (!rateLimit.allowed) {
      return new Response(
        JSON.stringify({ error: 'Muitas solicitações.', retryAfter: rateLimit.retryAfter }),
        {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': String(rateLimit.retryAfter) },
        }
      );
    }

    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'materialId inválido.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: material, error: materialError } = await supabaseAdmin
      .from('lesson_materials')
      .select('id, type, content, lesson_id')
      .eq('id', parsed.data.materialId)
      .maybeSingle();

    if (materialError) throw materialError;
    if (!material || material.type !== 'pdf') {
      return new Response(
        JSON.stringify({ error: 'Material não encontrado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: lesson, error: lessonError } = await supabaseAdmin
      .from('lessons')
      .select('id, module_id, modules(course_id)')
      .eq('id', material.lesson_id)
      .maybeSingle();

    if (lessonError) throw lessonError;
    const courseId = (lesson?.modules as { course_id?: string } | null)?.course_id;
    if (!courseId) {
      return new Response(
        JSON.stringify({ error: 'Aula sem curso vinculado.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      const { data: hasAccess } = await supabaseAdmin
        .from('user_course_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (!hasAccess) {
        logger.warn('PDF requested without course access', { userId: user.id, courseId });
        return new Response(
          JSON.stringify({ error: 'Você não tem acesso a este curso.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Drip: aula agendada não entrega material. Mesma função que a UI usa.
      const { data: locked } = await supabaseAdmin.rpc('get_course_release_map_for', {
        p_user_id: user.id,
        p_course_id: courseId,
      });
      if ((locked ?? []).some((row: { kind: string; id: string }) => row.kind === 'lesson' && row.id === lesson.id)) {
        return new Response(
          JSON.stringify({ error: 'Esta aula ainda não foi liberada.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { data: signed, error: signError } = await supabaseAdmin.storage
      .from('lesson-files')
      .createSignedUrl(material.content, SIGNED_URL_TTL_SECONDS);

    if (signError || !signed?.signedUrl) {
      logger.error('Failed to sign lesson file URL', signError);
      return new Response(
        JSON.stringify({ error: 'Arquivo indisponível.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('Internal error in lesson-file-url', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao abrir o arquivo.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
