import { supabase } from '@/integrations/supabase/client';

// Chaves do localStorage (reutilizando do migrateToSupabase)
const STORAGE_KEYS = {
  COURSES: 'mh_courses',
  MODULES: 'memberhero_modulos',
  LESSONS: 'memberhero_aulas',
  CATEGORIES: 'memberhero_categories',
  TAGS: 'memberhero_tags',
  SHELVES: 'mh_shelves',
  USERS: 'memberhero_users',
  ACCESS: 'mh_student_access',
  WEBHOOKS: 'memberhero_webhooks',
  STUDENT_PROGRESS: 'memberhero_student_progress',
  LESSON_PROGRESS: 'mh_lesson_progress',
  SECONDARY_BANNERS: 'mh_banners_secundarios',
  PROMO_BANNERS: 'mh_promo_banners',
};

// Interfaces de validação
export interface ValidationItem {
  entity: string;
  localCount: number;
  dbCount: number;
  match: boolean;
  missingIds: string[];
  extraIds: string[];
  details: string[];
}

export interface ValidationResult {
  success: boolean;
  validations: ValidationItem[];
  summary: {
    totalChecks: number;
    passed: number;
    failed: number;
    criticalErrors: string[];
  };
}

// Função helper para ler localStorage
function readFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
}

// ============ VALIDAÇÕES INDIVIDUAIS ============

// Validar Usuários - compara emails e roles
async function validateUsers(): Promise<ValidationItem> {
  const localUsers = readFromLocalStorage<any[]>(STORAGE_KEYS.USERS) || [];
  const { data: profiles } = await (supabase.from('profiles') as any).select('user_id, email');
  const { data: roles } = await (supabase.from('user_roles') as any).select('user_id, role');
  
  const localEmails = new Set(localUsers.map(u => u.email?.toLowerCase()).filter(Boolean));
  const dbEmails = new Set((profiles || []).map((p: any) => p.email?.toLowerCase()).filter(Boolean));
  
  const missingEmails = [...localEmails].filter(e => !dbEmails.has(e));
  const details: string[] = [];
  
  // Verificar roles
  const localAdmins = localUsers.filter(u => u.role === 'admin').map(u => u.email?.toLowerCase());
  const localStudents = localUsers.filter(u => u.role === 'student' || u.role === 'aluno').map(u => u.email?.toLowerCase());
  
  // Mapear user_id -> email no DB
  const emailToUserId: Record<string, string> = {};
  (profiles || []).forEach((p: any) => {
    if (p.email) emailToUserId[p.email.toLowerCase()] = p.user_id;
  });
  
  // Verificar se cada admin local é admin no DB
  for (const adminEmail of localAdmins) {
    const userId = emailToUserId[adminEmail];
    if (userId) {
      const isAdmin = (roles || []).some((r: any) => r.user_id === userId && r.role === 'admin');
      if (!isAdmin) {
        details.push(`Admin "${adminEmail}" não tem role 'admin' no banco`);
      }
    }
  }
  
  // Verificar se cada student local é student no DB
  for (const studentEmail of localStudents) {
    const userId = emailToUserId[studentEmail];
    if (userId) {
      const isStudent = (roles || []).some((r: any) => r.user_id === userId && r.role === 'student');
      if (!isStudent) {
        details.push(`Aluno "${studentEmail}" não tem role 'student' no banco`);
      }
    }
  }
  
  if (missingEmails.length > 0) {
    details.push(`Emails não encontrados no banco: ${missingEmails.join(', ')}`);
  }
  
  return {
    entity: 'Usuários',
    localCount: localUsers.length,
    dbCount: profiles?.length || 0,
    match: missingEmails.length === 0 && details.length === 0,
    missingIds: missingEmails,
    extraIds: [],
    details,
  };
}

// Validar Cursos
async function validateCourses(): Promise<ValidationItem> {
  const localCourses = readFromLocalStorage<any[]>(STORAGE_KEYS.COURSES) || [];
  const { data: dbCourses, count } = await (supabase.from('courses') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localCourses.map(c => c.id));
  const dbIds = new Set((dbCourses || []).map((c: any) => c.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id)) as string[];
  const extraIds = [...dbIds].filter(id => !localIds.has(id)) as string[];
  
  return {
    entity: 'Cursos',
    localCount: localCourses.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds,
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.slice(0, 5).join(', ')}${missingIds.length > 5 ? '...' : ''}`] : [],
  };
}

// Validar Módulos
async function validateModules(): Promise<ValidationItem> {
  const localModules = readFromLocalStorage<any[]>(STORAGE_KEYS.MODULES) || [];
  const { data: dbModules, count } = await (supabase.from('modules') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localModules.map(m => m.id));
  const dbIds = new Set((dbModules || []).map((m: any) => m.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id)) as string[];
  const extraIds = [...dbIds].filter(id => !localIds.has(id)) as string[];
  
  return {
    entity: 'Módulos',
    localCount: localModules.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds,
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.slice(0, 5).join(', ')}${missingIds.length > 5 ? '...' : ''}`] : [],
  };
}

// Validar Aulas
async function validateLessons(): Promise<ValidationItem> {
  const localLessons = readFromLocalStorage<any[]>(STORAGE_KEYS.LESSONS) || [];
  const { data: dbLessons, count } = await (supabase.from('lessons') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localLessons.map(l => l.id));
  const dbIds = new Set((dbLessons || []).map((l: any) => l.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id)) as string[];
  const extraIds = [...dbIds].filter(id => !localIds.has(id)) as string[];
  
  return {
    entity: 'Aulas',
    localCount: localLessons.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds,
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.slice(0, 5).join(', ')}${missingIds.length > 5 ? '...' : ''}`] : [],
  };
}

// Validar Categorias
async function validateCategories(): Promise<ValidationItem> {
  const localCategories = readFromLocalStorage<any[]>(STORAGE_KEYS.CATEGORIES) || [];
  const { data: dbCategories, count } = await (supabase.from('categories') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localCategories.map(c => c.id));
  const dbIds = new Set((dbCategories || []).map((c: any) => c.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id));
  
  return {
    entity: 'Categorias',
    localCount: localCategories.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds: [],
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.join(', ')}`] : [],
  };
}

// Validar Tags
async function validateTags(): Promise<ValidationItem> {
  const localTags = readFromLocalStorage<any[]>(STORAGE_KEYS.TAGS) || [];
  const { data: dbTags, count } = await (supabase.from('tags') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localTags.map(t => t.id));
  const dbIds = new Set((dbTags || []).map((t: any) => t.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id));
  
  return {
    entity: 'Tags',
    localCount: localTags.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds: [],
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.join(', ')}`] : [],
  };
}

// Validar Prateleiras
async function validateShelves(): Promise<ValidationItem> {
  const localShelves = readFromLocalStorage<any[]>(STORAGE_KEYS.SHELVES) || [];
  const { data: dbShelves, count } = await (supabase.from('shelves') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localShelves.map(s => s.id));
  const dbIds = new Set((dbShelves || []).map((s: any) => s.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id));
  
  return {
    entity: 'Prateleiras',
    localCount: localShelves.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds: [],
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.join(', ')}`] : [],
  };
}

// Validar Webhooks
async function validateWebhooks(): Promise<ValidationItem> {
  const localWebhooks = readFromLocalStorage<any[]>(STORAGE_KEYS.WEBHOOKS) || [];
  const { data: dbWebhooks, count } = await (supabase.from('webhooks') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localWebhooks.map(w => w.id));
  const dbIds = new Set((dbWebhooks || []).map((w: any) => w.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id));
  
  return {
    entity: 'Webhooks',
    localCount: localWebhooks.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds: [],
    details: missingIds.length > 0 ? [`IDs não migrados: ${missingIds.join(', ')}`] : [],
  };
}

// Validar Matrículas (course_access) - CRÍTICO: verifica relações aluno ↔ curso
async function validateCourseAccess(): Promise<ValidationItem> {
  const localAccess = readFromLocalStorage<any[]>(STORAGE_KEYS.ACCESS) || [];
  const localUsers = readFromLocalStorage<any[]>(STORAGE_KEYS.USERS) || [];
  const { data: dbAccess } = await (supabase.from('course_access') as any).select('user_id, course_id');
  const { data: profiles } = await (supabase.from('profiles') as any).select('user_id, email');
  
  // Mapear email -> user_id no DB
  const emailToUserId: Record<string, string> = {};
  (profiles || []).forEach((p: any) => {
    if (p.email) emailToUserId[p.email.toLowerCase()] = p.user_id;
  });
  
  // Mapear user_id local -> email
  const localUserIdToEmail: Record<string, string> = {};
  localUsers.forEach(u => {
    if (u.id && u.email) localUserIdToEmail[u.id] = u.email.toLowerCase();
  });
  
  const details: string[] = [];
  let missingCount = 0;
  
  // Agrupar acessos locais por usuário
  const localByUser: Record<string, Set<string>> = {};
  for (const access of localAccess) {
    const userId = access.userId || access.user_id;
    const courseId = access.courseId || access.course_id;
    if (userId && courseId) {
      if (!localByUser[userId]) localByUser[userId] = new Set();
      localByUser[userId].add(courseId);
    }
  }
  
  // Agrupar acessos do DB por usuário
  const dbByUser: Record<string, Set<string>> = {};
  for (const access of (dbAccess || [])) {
    if (!dbByUser[access.user_id]) dbByUser[access.user_id] = new Set();
    dbByUser[access.user_id].add(access.course_id);
  }
  
  // Verificar cada usuário local
  for (const [localUserId, localCourseIds] of Object.entries(localByUser)) {
    const email = localUserIdToEmail[localUserId];
    const dbUserId = email ? emailToUserId[email] : null;
    
    if (!dbUserId) {
      details.push(`Usuário ${email || localUserId} não encontrado no banco`);
      missingCount += localCourseIds.size;
      continue;
    }
    
    const dbCourseIds = dbByUser[dbUserId] || new Set();
    
    // Verificar se todos os cursos locais estão no DB
    for (const courseId of localCourseIds) {
      if (!dbCourseIds.has(courseId)) {
        details.push(`Matrícula faltando: ${email || localUserId} → curso ${courseId.slice(0, 8)}...`);
        missingCount++;
      }
    }
    
    // Verificar se quantidades batem
    if (localCourseIds.size !== dbCourseIds.size) {
      details.push(`${email || localUserId}: ${localCourseIds.size} cursos local vs ${dbCourseIds.size} no banco`);
    }
  }
  
  return {
    entity: 'Matrículas',
    localCount: localAccess.length,
    dbCount: dbAccess?.length || 0,
    match: details.length === 0 && missingCount === 0,
    missingIds: [],
    extraIds: [],
    details: details.slice(0, 10), // Limitar para não sobrecarregar a UI
  };
}

// Validar Progresso dos Alunos
async function validateStudentProgress(): Promise<ValidationItem> {
  const localProgress = readFromLocalStorage<any[]>(STORAGE_KEYS.STUDENT_PROGRESS) || 
                        readFromLocalStorage<any[]>(STORAGE_KEYS.LESSON_PROGRESS) || [];
  const { data: dbProgress, count } = await (supabase.from('student_progress') as any)
    .select('user_id, aula_id', { count: 'exact', head: false });
  
  const details: string[] = [];
  
  // Criar chaves compostas para comparação (user_id + aula_id)
  const localKeys = new Set(
    localProgress.map(p => {
      const userId = p.userId || p.user_id;
      const aulaId = p.aulaId || p.aula_id;
      return `${userId}|${aulaId}`;
    }).filter(k => k !== 'undefined|undefined' && k !== 'null|null')
  );
  
  const dbKeys = new Set(
    (dbProgress || []).map((p: any) => `${p.user_id}|${p.aula_id}`)
  );
  
  const missingKeys = [...localKeys].filter(k => !dbKeys.has(k));
  
  if (missingKeys.length > 0) {
    details.push(`${missingKeys.length} registros de progresso não migrados`);
  }
  
  return {
    entity: 'Progresso',
    localCount: localProgress.length,
    dbCount: count || 0,
    match: missingKeys.length === 0,
    missingIds: missingKeys.slice(0, 5),
    extraIds: [],
    details,
  };
}

// Validar Banners Secundários
async function validateSecondaryBanners(): Promise<ValidationItem> {
  const localBanners = readFromLocalStorage<any[]>(STORAGE_KEYS.SECONDARY_BANNERS) || [];
  const { data: dbBanners, count } = await (supabase.from('banners_secundarios') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localBanners.map(b => b.id));
  const dbIds = new Set((dbBanners || []).map((b: any) => b.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id));
  
  return {
    entity: 'Banners Secundários',
    localCount: localBanners.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds: [],
    details: [],
  };
}

// Validar Promo Banners
async function validatePromoBanners(): Promise<ValidationItem> {
  const localBanners = readFromLocalStorage<any[]>(STORAGE_KEYS.PROMO_BANNERS) || [];
  const { data: dbBanners, count } = await (supabase.from('promo_banners') as any)
    .select('id', { count: 'exact', head: false });
  
  const localIds = new Set(localBanners.map(b => b.id));
  const dbIds = new Set((dbBanners || []).map((b: any) => b.id));
  
  const missingIds = [...localIds].filter(id => !dbIds.has(id));
  
  return {
    entity: 'Banners Promocionais',
    localCount: localBanners.length,
    dbCount: count || 0,
    match: missingIds.length === 0,
    missingIds,
    extraIds: [],
    details: [],
  };
}

// ============ FUNÇÃO PRINCIPAL DE VALIDAÇÃO ============

export async function runFullValidation(
  onProgress?: (step: string, progress: number) => void
): Promise<ValidationResult> {
  const validations: ValidationItem[] = [];
  let currentStep = 0;
  const totalSteps = 12;

  try {
    // 1. Usuários
    onProgress?.('Validando usuários...', (++currentStep / totalSteps) * 100);
    validations.push(await validateUsers());

    // 2. Cursos
    onProgress?.('Validando cursos...', (++currentStep / totalSteps) * 100);
    validations.push(await validateCourses());

    // 3. Módulos
    onProgress?.('Validando módulos...', (++currentStep / totalSteps) * 100);
    validations.push(await validateModules());

    // 4. Aulas
    onProgress?.('Validando aulas...', (++currentStep / totalSteps) * 100);
    validations.push(await validateLessons());

    // 5. Categorias
    onProgress?.('Validando categorias...', (++currentStep / totalSteps) * 100);
    validations.push(await validateCategories());

    // 6. Tags
    onProgress?.('Validando tags...', (++currentStep / totalSteps) * 100);
    validations.push(await validateTags());

    // 7. Prateleiras
    onProgress?.('Validando prateleiras...', (++currentStep / totalSteps) * 100);
    validations.push(await validateShelves());

    // 8. Webhooks
    onProgress?.('Validando webhooks...', (++currentStep / totalSteps) * 100);
    validations.push(await validateWebhooks());

    // 9. Matrículas (course_access)
    onProgress?.('Validando matrículas...', (++currentStep / totalSteps) * 100);
    validations.push(await validateCourseAccess());

    // 10. Progresso
    onProgress?.('Validando progresso...', (++currentStep / totalSteps) * 100);
    validations.push(await validateStudentProgress());

    // 11. Banners Secundários
    onProgress?.('Validando banners...', (++currentStep / totalSteps) * 100);
    validations.push(await validateSecondaryBanners());

    // 12. Promo Banners
    onProgress?.('Validando banners promocionais...', (++currentStep / totalSteps) * 100);
    validations.push(await validatePromoBanners());

    onProgress?.('Validação concluída!', 100);

    // Calcular resumo
    const passed = validations.filter(v => v.match).length;
    const failed = validations.filter(v => !v.match).length;

    // Erros críticos = qualquer divergência
    const criticalErrors: string[] = [];
    for (const v of validations) {
      if (!v.match) {
        criticalErrors.push(`${v.entity}: ${v.localCount} local vs ${v.dbCount} banco`);
        if (v.missingIds.length > 0) {
          criticalErrors.push(`  → IDs não migrados: ${v.missingIds.slice(0, 3).join(', ')}${v.missingIds.length > 3 ? '...' : ''}`);
        }
        for (const detail of v.details) {
          criticalErrors.push(`  → ${detail}`);
        }
      }
    }

    return {
      success: failed === 0,
      validations,
      summary: {
        totalChecks: validations.length,
        passed,
        failed,
        criticalErrors,
      },
    };
  } catch (error: any) {
    console.error('Validation error:', error);
    return {
      success: false,
      validations,
      summary: {
        totalChecks: validations.length,
        passed: validations.filter(v => v.match).length,
        failed: validations.filter(v => !v.match).length + 1,
        criticalErrors: [`Erro durante validação: ${error.message}`],
      },
    };
  }
}

// Verificar se há dados no localStorage para validar
export function hasLocalStorageDataForValidation(): boolean {
  return Object.values(STORAGE_KEYS).some(key => {
    const data = localStorage.getItem(key);
    return data && data !== 'null' && data !== '[]' && data !== '{}';
  });
}
