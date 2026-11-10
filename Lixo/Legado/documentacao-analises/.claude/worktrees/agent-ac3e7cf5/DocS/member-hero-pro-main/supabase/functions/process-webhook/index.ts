import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// FASE C+D: Liberação Automática de Acesso
// ============================================
// Este endpoint:
// - Recebe webhooks de pagamento
// - Identifica a plataforma
// - Normaliza para formato canônico
// - Verifica se existe curso mapeado
// - Verifica se é evento de compra aprovada
// - Busca aluno por email
// - SE ALUNO NÃO EXISTIR: cria usuário no auth
// - Cria matrícula se não existir
// - Registra log
// - Retorna 200 OK (sempre)
// ============================================

interface CanonicalWebhook {
  platform: 'hotmart' | 'kiwify' | 'cakto' | 'unknown';
  event_type: string;
  external_product_id: string | null;
  buyer_email: string | null;
  buyer_name: string | null;
  transaction_id: string | null;
  raw_payload: Record<string, unknown>;
}

interface Course {
  id: string;
  titulo: string;
  integration_platform: string | null;
}

interface StudentProfile {
  id: string;
  user_id: string;
  email: string;
  name: string | null;
}

interface EnrollmentResult {
  status: 'sucesso' | 'user_created' | 'ignored' | 'no_match' | 'already_enrolled' | 'erro';
  message: string;
  student_id?: string;
  course_id?: string;
  user_created?: boolean;
}

// ============================================
// PURCHASE EVENT VALIDATION
// ============================================

// Eventos que indicam compra aprovada por plataforma
const PURCHASE_EVENTS: Record<string, string[]> = {
  hotmart: ['PURCHASE_COMPLETE', 'PURCHASE_APPROVED'],
  kiwify: ['paid', 'approved'],
  cakto: ['sale_completed', 'approved']
};

function isPurchaseApproved(canonical: CanonicalWebhook): boolean {
  const validEvents = PURCHASE_EVENTS[canonical.platform] || [];
  const eventType = canonical.event_type.toLowerCase();
  
  const isApproved = validEvents.some(evt => 
    eventType.includes(evt.toLowerCase())
  );
  
  console.log(`🔍 Checking if event "${canonical.event_type}" is purchase approved: ${isApproved}`);
  return isApproved;
}

// ============================================
// PLATFORM DETECTION
// ============================================

function detectPlatform(payload: Record<string, unknown>): CanonicalWebhook['platform'] {
  // Hotmart: tem campo "event" e "data.product"
  if (payload.event && typeof payload.data === 'object' && payload.data !== null) {
    const data = payload.data as Record<string, unknown>;
    if (data.product) {
      console.log('🔍 Platform detected: hotmart');
      return 'hotmart';
    }
  }
  
  // Kiwify: tem "customer" ou "Customer" e "product" ou "Product"
  if ((payload.customer || payload.Customer) && (payload.product || payload.Product)) {
    console.log('🔍 Platform detected: kiwify');
    return 'kiwify';
  }
  
  // Cakto: tem "products" como array ou estrutura específica
  if (Array.isArray(payload.products)) {
    console.log('🔍 Platform detected: cakto');
    return 'cakto';
  }
  
  // Fallback: verificar por estrutura alternativa do Cakto
  if (payload.customer && payload.events && Array.isArray(payload.events)) {
    console.log('🔍 Platform detected: cakto (alternative structure)');
    return 'cakto';
  }
  
  console.log('🔍 Platform detected: unknown');
  return 'unknown';
}

// ============================================
// PLATFORM PARSERS
// ============================================

function parseHotmart(payload: Record<string, unknown>): CanonicalWebhook {
  const data = (payload.data || {}) as Record<string, unknown>;
  const product = (data.product || {}) as Record<string, unknown>;
  const buyer = (data.buyer || {}) as Record<string, unknown>;
  const purchase = (data.purchase || {}) as Record<string, unknown>;
  
  return {
    platform: 'hotmart',
    event_type: String(payload.event || 'unknown'),
    external_product_id: (product.id && product.id !== 0) 
      ? String(product.id) 
      : (product.ucode ? String(product.ucode) : null),
    buyer_email: buyer.email ? String(buyer.email) : null,
    buyer_name: buyer.name ? String(buyer.name) : null,
    transaction_id: purchase.transaction ? String(purchase.transaction) : null,
    raw_payload: payload
  };
}

function parseKiwify(payload: Record<string, unknown>): CanonicalWebhook {
  // Kiwify pode ter campos em camelCase ou PascalCase
  const customer = (payload.customer || payload.Customer || {}) as Record<string, unknown>;
  const product = (payload.product || payload.Product || {}) as Record<string, unknown>;
  
  return {
    platform: 'kiwify',
    event_type: String(payload.order_status || payload.status || 'unknown'),
    external_product_id: product.id ? String(product.id) : null,
    buyer_email: customer.email ? String(customer.email) : null,
    buyer_name: customer.name ? String(customer.name) : null,
    transaction_id: payload.order_id ? String(payload.order_id) : (payload.id ? String(payload.id) : null),
    raw_payload: payload
  };
}

function parseCakto(payload: Record<string, unknown>): CanonicalWebhook {
  const products = (payload.products || []) as Array<Record<string, unknown>>;
  const customer = (payload.customer || {}) as Record<string, unknown>;
  const events = (payload.events || []) as Array<Record<string, unknown>>;
  
  // Pegar o primeiro produto se existir
  const firstProduct = products[0] || {};
  const firstEvent = events[0] || {};
  
  return {
    platform: 'cakto',
    event_type: String(firstEvent.custom_id || payload.status || 'unknown'),
    external_product_id: firstProduct.id ? String(firstProduct.id) : null,
    buyer_email: customer.email ? String(customer.email) : null,
    buyer_name: customer.name ? String(customer.name) : null,
    transaction_id: payload.id ? String(payload.id) : null,
    raw_payload: payload
  };
}

function parseUnknown(payload: Record<string, unknown>): CanonicalWebhook {
  // Tentar extrair dados comuns de qualquer payload
  return {
    platform: 'unknown',
    event_type: String(payload.event || payload.status || payload.type || 'unknown'),
    external_product_id: null,
    buyer_email: extractEmail(payload),
    buyer_name: extractName(payload),
    transaction_id: extractTransactionId(payload),
    raw_payload: payload
  };
}

// Helper functions para extração genérica
function extractEmail(payload: Record<string, unknown>): string | null {
  const emailKeys = ['email', 'buyer_email', 'customer_email', 'comprador_email'];
  for (const key of emailKeys) {
    if (payload[key] && typeof payload[key] === 'string') {
      return payload[key] as string;
    }
  }
  // Buscar em objetos aninhados
  for (const value of Object.values(payload)) {
    if (typeof value === 'object' && value !== null) {
      const nested = value as Record<string, unknown>;
      if (nested.email && typeof nested.email === 'string') {
        return nested.email;
      }
    }
  }
  return null;
}

function extractName(payload: Record<string, unknown>): string | null {
  const nameKeys = ['name', 'buyer_name', 'customer_name', 'comprador_nome', 'nome'];
  for (const key of nameKeys) {
    if (payload[key] && typeof payload[key] === 'string') {
      return payload[key] as string;
    }
  }
  return null;
}

function extractTransactionId(payload: Record<string, unknown>): string | null {
  const txKeys = ['transaction_id', 'transaction', 'order_id', 'id', 'transacao'];
  for (const key of txKeys) {
    if (payload[key]) {
      return String(payload[key]);
    }
  }
  return null;
}

// ============================================
// MAIN PARSER
// ============================================

function parseWebhook(payload: Record<string, unknown>): CanonicalWebhook {
  const platform = detectPlatform(payload);
  
  switch (platform) {
    case 'hotmart':
      return parseHotmart(payload);
    case 'kiwify':
      return parseKiwify(payload);
    case 'cakto':
      return parseCakto(payload);
    default:
      return parseUnknown(payload);
  }
}

// ============================================
// COURSE LOOKUP
// ============================================

interface CourseMatchResult {
  course: Course | null;
  webhookConfigId: string | null;
  matchedVia: 'webhook_config' | 'external_product_id' | null;
}

// Match curso via webhook_configs (usando ?key= da URL)
async function findCourseByWebhookKey(
  supabase: any,
  webhookKey: string | null
): Promise<CourseMatchResult> {
  if (!webhookKey) {
    return { course: null, webhookConfigId: null, matchedVia: null };
  }
  
  console.log('🔑 Looking for webhook_config with secret_key:', webhookKey.substring(0, 8) + '...');
  
  // Buscar na tabela webhook_configs (legacy) ou webhooks
  const { data: webhookConfig, error: configError } = await supabase
    .from('webhooks')
    .select('id, curso_id, plataforma, ativo')
    .eq('secret_key', webhookKey)
    .eq('ativo', true)
    .maybeSingle();
  
  if (configError) {
    console.error('❌ Error looking up webhook_config:', configError);
    return { course: null, webhookConfigId: null, matchedVia: null };
  }
  
  if (!webhookConfig) {
    console.log('⚠️ No active webhook_config found for key');
    return { course: null, webhookConfigId: null, matchedVia: null };
  }
  
  console.log('✅ Webhook config found:', webhookConfig.id, 'platform:', webhookConfig.plataforma);
  
  // Buscar o curso associado
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, titulo, integration_platform')
    .eq('id', webhookConfig.curso_id)
    .eq('integration_enabled', true)
    .maybeSingle();
  
  if (courseError) {
    console.error('❌ Error looking up course by webhook config:', courseError);
    return { course: null, webhookConfigId: webhookConfig.id, matchedVia: null };
  }
  
  if (course) {
    console.log('✅ Course matched via webhook key:', course.titulo, '(', course.id, ')');
    return { 
      course: course as Course, 
      webhookConfigId: webhookConfig.id, 
      matchedVia: 'webhook_config' 
    };
  }
  
  console.log('⚠️ Course not found or integration disabled for webhook config');
  return { course: null, webhookConfigId: webhookConfig.id, matchedVia: null };
}

// Match curso via external_product_id (fallback)
async function findCourseByExternalId(
  supabase: any,
  externalProductId: string | null
): Promise<Course | null> {
  if (!externalProductId) {
    console.log('⚠️ No external_product_id provided, skipping course lookup');
    return null;
  }
  
  console.log('🔍 Looking for course with external_product_id:', externalProductId);
  
  const { data: course, error } = await supabase
    .from('courses')
    .select('id, titulo, integration_platform')
    .eq('external_product_id', externalProductId)
    .eq('integration_enabled', true)
    .maybeSingle();
  
  if (error) {
    console.error('❌ Error looking up course:', error);
    return null;
  }
  
  if (course) {
    console.log('✅ Course found via external_product_id:', course.titulo, '(', course.id, ')');
  } else {
    console.log('⚠️ No course found for external_product_id:', externalProductId);
  }
  
  return course as Course | null;
}

// ============================================
// STUDENT LOOKUP
// ============================================

async function findStudentByEmail(
  supabase: any, 
  email: string | null
): Promise<StudentProfile | null> {
  if (!email) {
    console.log('⚠️ No buyer email provided, skipping student lookup');
    return null;
  }
  
  const normalizedEmail = email.toLowerCase().trim();
  console.log('🔍 Looking for student with email:', normalizedEmail);
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, user_id, email, name')
    .ilike('email', normalizedEmail)
    .maybeSingle();
  
  if (error) {
    console.error('❌ Error finding student:', error);
    return null;
  }
  
  if (data) {
    console.log('✅ Student found:', data.name || data.email, '(', data.user_id, ')');
  } else {
    console.log('⚠️ No student found with email:', normalizedEmail);
  }
  
  return data as StudentProfile | null;
}

// ============================================
// AUTO-CREATE USER (FASE D)
// ============================================

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  const length = 16;
  let password = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

// Criar profile do aluno vinculado ao auth.users.id
async function createStudentProfile(
  supabase: any,
  userId: string,
  email: string,
  name: string | null
): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();
  const displayName = name || normalizedEmail.split('@')[0];
  
  console.log('📝 Creating student profile for user:', userId);
  
  // Verificar se profile já existe (nunca sobrescrever)
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existing) {
    console.log('ℹ️ Profile already exists for user:', userId);
    return true;
  }
  
  // Criar profile vinculado ao auth.users.id
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,          // profiles.user_id = auth.users.id
      email: normalizedEmail,   // profiles.email = email do comprador
      name: displayName,        // profiles.name = nome do comprador
      status: 'active'          // profiles.status = 'active'
    });
  
  if (profileError) {
    // Verificar se é conflito (profile criado pelo trigger)
    if (profileError.code === '23505') {
      console.log('ℹ️ Profile already created by trigger (conflict)');
      return true;
    }
    console.error('❌ Error creating profile:', profileError);
    return false;
  }
  
  console.log('✅ Profile created successfully for:', normalizedEmail);
  return true;
}

// Garantir que o usuário tenha role student
async function ensureStudentRole(
  supabase: any,
  userId: string
): Promise<boolean> {
  console.log('🔑 Ensuring student role for user:', userId);
  
  // Verificar se role já existe
  const { data: existing } = await supabase
    .from('user_roles')
    .select('id')
    .eq('user_id', userId)
    .eq('role', 'student')
    .maybeSingle();
  
  if (existing) {
    console.log('ℹ️ Student role already exists');
    return true;
  }
  
  // Criar role como student
  const { error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: 'student'
    });
  
  if (error) {
    if (error.code === '23505') {
      console.log('ℹ️ Role already created by trigger (conflict)');
      return true;
    }
    console.error('❌ Error creating student role:', error);
    return false;
  }
  
  console.log('✅ Student role created');
  return true;
}

async function createAuthUser(
  supabase: any,
  email: string,
  name: string | null
): Promise<{ userId: string } | null> {
  const normalizedEmail = email.toLowerCase().trim();
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://member-hero-pro.vercel.app';
  
  console.log('👤 Inviting new user for email:', normalizedEmail);
  
  // Usar inviteUserByEmail - cria usuário E envia email automaticamente
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, {
    redirectTo: `${frontendUrl}/auth`,
    data: {
      name: name || normalizedEmail.split('@')[0],
      created_by: 'webhook_auto'
    }
  });
  
  if (error) {
    // Se usuário já existe, buscar o ID existente
    if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
      console.log('ℹ️ User already exists, looking up existing user...');
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const found = existingUsers?.users?.find(
        (u: any) => u.email?.toLowerCase() === normalizedEmail
      );
      if (found) {
        console.log('✅ Found existing user:', found.id);
        // Garantir profile e role existem
        await createStudentProfile(supabase, found.id, normalizedEmail, name);
        await ensureStudentRole(supabase, found.id);
        return { userId: found.id };
      }
    }
    console.error('❌ Error inviting user:', error.message);
    return null;
  }
  
  const userId = data.user.id;
  console.log('✅ User invited successfully:', userId);
  console.log('📧 Invitation email sent automatically by Supabase Auth');
  
  // Criar profile IMEDIATAMENTE (não depender apenas do trigger)
  const profileCreated = await createStudentProfile(
    supabase,
    userId,
    normalizedEmail,
    name
  );
  
  if (!profileCreated) {
    console.error('⚠️ Failed to create profile, but auth user exists');
  }
  
  // Garantir role student
  await ensureStudentRole(supabase, userId);
  
  // Marcar email como enviado no profile
  await supabase
    .from('profiles')
    .update({ onboarding_email_sent_at: new Date().toISOString() })
    .eq('user_id', userId);
  
  console.log('✅ User creation complete - invitation email sent');
  
  return { userId };
}

// ============================================
// ENROLLMENT CHECK
// ============================================

async function hasExistingEnrollment(
  supabase: any,
  userId: string,
  courseId: string
): Promise<boolean> {
  console.log('🔍 Checking existing enrollment for user:', userId, 'course:', courseId);
  
  const { data, error } = await supabase
    .from('course_access')
    .select('id, granted')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();
  
  if (error) {
    console.error('❌ Error checking enrollment:', error);
    return false; // Em caso de erro, tenta criar (idempotência)
  }
  
  if (data) {
    console.log('ℹ️ Existing enrollment found, granted:', data.granted);
    return true;
  }
  
  console.log('ℹ️ No existing enrollment found');
  return false;
}

// ============================================
// CREATE ENROLLMENT
// ============================================

async function createEnrollment(
  supabase: any,
  userId: string,
  courseId: string
): Promise<boolean> {
  console.log('📝 Creating enrollment for user:', userId, 'course:', courseId);
  
  const { error } = await supabase
    .from('course_access')
    .insert({
      user_id: userId,
      course_id: courseId,
      granted: true,
      granted_at: new Date().toISOString(),
      source: 'webhook'
    });
  
  if (error) {
    console.error('❌ Error creating enrollment:', error);
    return false;
  }
  
  console.log('✅ Enrollment created successfully with source: webhook');
  return true;
}

// ============================================
// NOTA: Função sendOnboardingEmail removida
// O email agora é enviado automaticamente pelo
// inviteUserByEmail() na função createAuthUser()
// ============================================

// ============================================
// PROCESS ENROLLMENT (FASE C+D MAIN LOGIC)
// ============================================

async function processEnrollment(
  supabase: any,
  canonical: CanonicalWebhook,
  course: Course | null
): Promise<EnrollmentResult> {
  console.log('═══════════════════════════════════════════');
  console.log('📋 FASE C+D: Processing enrollment...');
  console.log('═══════════════════════════════════════════');
  
  // 1. Verificar se é evento de compra aprovada
  if (!isPurchaseApproved(canonical)) {
    console.log('⏭️ Event is not a purchase approval, skipping enrollment');
    return {
      status: 'ignored',
      message: `Event type '${canonical.event_type}' is not a purchase approval event`
    };
  }
  
  // 2. Verificar se curso foi encontrado
  if (!course) {
    console.log('⏭️ No course found, skipping enrollment');
    return {
      status: 'no_match',
      message: `No course found for product: ${canonical.external_product_id || 'unknown'}`
    };
  }
  
  // 3. Verificar se email foi fornecido
  if (!canonical.buyer_email) {
    console.log('⏭️ No buyer email provided');
    return {
      status: 'erro',
      message: 'No buyer email provided in webhook payload'
    };
  }
  
  // 4. Buscar aluno por email
  let student = await findStudentByEmail(supabase, canonical.buyer_email);
  let userCreated = false;
  
  // 5. FASE D: Se aluno não existe, criar usuário automaticamente
  if (!student) {
    console.log('👤 Student not found, creating new user automatically...');
    
    const authResult = await createAuthUser(
      supabase, 
      canonical.buyer_email, 
      canonical.buyer_name
    );
    
    if (!authResult) {
      console.log('❌ Failed to create auth user');
      return {
        status: 'erro',
        message: `Failed to create user for email: ${canonical.buyer_email}`
      };
    }
    
    // Buscar profile recém-criado (criado por createAuthUser)
    student = await findStudentByEmail(supabase, canonical.buyer_email);
    
    if (!student) {
      console.log('❌ Profile not found after creation');
      return {
        status: 'erro',
        message: `Profile creation failed for: ${canonical.buyer_email}`
      };
    }
    
    userCreated = true;
    console.log('✅ New user created and profile ready:', student.email);
    console.log('📧 Invitation email was sent automatically during user creation');
  }
  
  // 6. Verificar se matrícula já existe
  const alreadyEnrolled = await hasExistingEnrollment(supabase, student.user_id, course.id);
  if (alreadyEnrolled) {
    console.log('⏭️ Student already enrolled, skipping');
    return {
      status: 'already_enrolled',
      message: `Student ${student.email} already enrolled in course ${course.titulo}`,
      student_id: student.user_id,
      course_id: course.id,
      user_created: userCreated
    };
  }
  
  // 7. Criar matrícula
  const success = await createEnrollment(supabase, student.user_id, course.id);
  if (!success) {
    console.log('❌ Failed to create enrollment');
    return {
      status: 'erro',
      message: `Failed to create enrollment for ${student.email}`,
      student_id: student.user_id,
      course_id: course.id,
      user_created: userCreated
    };
  }
  
  console.log('🎉 Enrollment created successfully!');
  
  if (userCreated) {
    console.log('📧 New user was auto-created - they can use "Forgot Password" to set their password');
  }
  
  return {
    status: userCreated ? 'user_created' : 'sucesso',
    message: userCreated 
      ? `New user created and enrolled: ${student.email} in ${course.titulo}`
      : `Successfully enrolled ${student.email} in course ${course.titulo}`,
    student_id: student.user_id,
    course_id: course.id,
    user_created: userCreated
  };
}

// ============================================
// LOGGING (Best-effort, non-blocking)
// ============================================

async function logWebhook(
  supabase: any,
  canonical: CanonicalWebhook,
  course: Course | null,
  enrollmentResult: EnrollmentResult,
  webhookConfigId: string | null = null,
  matchedVia: string | null = null
): Promise<void> {
  try {
    const logData = {
      plataforma: canonical.platform,
      evento: canonical.event_type,
      curso_id: course?.id || null,
      external_product_id: canonical.external_product_id,
      buyer_email: canonical.buyer_email,
      buyer_name: canonical.buyer_name,
      transaction_id: canonical.transaction_id,
      course_matched: course !== null,
      status: enrollmentResult.status,
      mensagem: `${enrollmentResult.message}${matchedVia ? ` [matched via: ${matchedVia}]` : ''}`,
      payload: canonical.raw_payload,
      webhook_id: webhookConfigId
    };
    
    console.log('📝 Logging webhook:', JSON.stringify(logData, null, 2));
    
    const { error } = await supabase.from('webhook_logs').insert(logData);
    
    if (error) {
      console.error('❌ Failed to log webhook (non-blocking):', error);
    } else {
      console.log('✅ Webhook logged successfully');
    }
  } catch (error) {
    console.error('❌ Exception logging webhook (non-blocking):', error);
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('═══════════════════════════════════════════');
  console.log('🔔 WEBHOOK RECEIVED');
  console.log('═══════════════════════════════════════════');
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Time:', new Date().toISOString());

  // Extract webhook key from URL query params
  const url = new URL(req.url);
  const webhookKey = url.searchParams.get('key');
  console.log('🔑 Webhook key present:', webhookKey ? 'yes' : 'no');

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse payload
    let payload: Record<string, unknown>;
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse JSON payload:', parseError);
      // Log the error but still return 200
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received (invalid JSON)' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('📦 Raw payload:', JSON.stringify(payload, null, 2));

    // Step 1: Parse webhook to canonical format
    const canonical = parseWebhook(payload);
    console.log('📋 Canonical webhook:', JSON.stringify(canonical, null, 2));

    // Step 2: Find course - PRIORITY: via webhook key, FALLBACK: via external_product_id
    let course: Course | null = null;
    let webhookConfigId: string | null = null;
    let matchedVia: 'webhook_config' | 'external_product_id' | null = null;
    
    // 2a. Try to match via webhook key first (most reliable)
    if (webhookKey) {
      console.log('🔍 Attempting course match via webhook key...');
      const keyMatch = await findCourseByWebhookKey(supabase, webhookKey);
      if (keyMatch.course) {
        course = keyMatch.course;
        webhookConfigId = keyMatch.webhookConfigId;
        matchedVia = 'webhook_config';
        console.log('✅ Course matched via webhook key');
      } else {
        console.log('⚠️ No course found via webhook key, falling back to external_product_id');
      }
    }
    
    // 2b. Fallback: match via external_product_id
    if (!course && canonical.external_product_id) {
      console.log('🔍 Attempting course match via external_product_id...');
      course = await findCourseByExternalId(supabase, canonical.external_product_id);
      if (course) {
        matchedVia = 'external_product_id';
        console.log('✅ Course matched via external_product_id');
      }
    }
    
    console.log(`📋 Course match result: ${course ? course.titulo : 'no match'} (via: ${matchedVia || 'none'})`);

    // Step 3: FASE C+D - Process enrollment (with auto-create user)
    const enrollmentResult = await processEnrollment(supabase, canonical, course);
    console.log('📋 Enrollment result:', JSON.stringify(enrollmentResult, null, 2));

    // Step 4: Log webhook with enrollment result
    await logWebhook(supabase, canonical, course, enrollmentResult, webhookConfigId, matchedVia);

    // Step 5: Always return 200 OK
    console.log('═══════════════════════════════════════════');
    console.log('✅ WEBHOOK PROCESSED SUCCESSFULLY');
    console.log('═══════════════════════════════════════════');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: enrollmentResult.message,
        platform: canonical.platform,
        status: enrollmentResult.status,
        course_matched: course !== null,
        matched_via: matchedVia,
        course_id: course?.id || null,
        student_id: enrollmentResult.student_id || null,
        user_created: enrollmentResult.user_created || false
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // Even on error, return 200 to avoid retries from payment platforms
    console.error('❌ Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook received (processing error logged)',
        status: 'erro'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
