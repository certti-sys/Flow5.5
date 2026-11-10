import { supabase } from '@/integrations/supabase/client';

// Chaves do localStorage - TODAS as chaves existentes
const STORAGE_KEYS = {
  // Conteúdo
  COURSES: 'mh_courses',
  MODULES: 'memberhero_modulos',
  LESSONS: 'memberhero_aulas',
  CATEGORIES: 'memberhero_categories',
  TAGS: 'memberhero_tags',
  
  // Vitrine
  SHELVES: 'mh_shelves',
  BANNER: 'mh_banner_principal',
  SECONDARY_BANNERS: 'mh_banners_secundarios',
  PROMO_BANNERS: 'mh_promo_banners',
  
  // Configurações
  SETTINGS: 'mh_settings',
  PLATFORM_SETTINGS: 'memberhero_settings',
  CARDS_SETTINGS: 'mh_cards_settings',
  SHOWCASE_SETTINGS: 'mh_showcase_settings',
  
  // Usuários e acesso
  USERS: 'memberhero_users',
  ACCESS: 'mh_student_access',
  COMMUNITY_ACCESS: 'mh_community_access',
  
  // Comunidade
  COMMUNITY_SETTINGS: 'mh_community_settings',
  
  // Notificações
  NOTIFICATIONS: 'memberhero_notificacoes',
  NOTIFICATION_SETTINGS: 'memberhero_admin_notification_settings',
  
  // Webhooks
  WEBHOOKS: 'memberhero_webhooks',
  WEBHOOK_LOGS: 'memberhero_webhook_logs',
  
  // Progresso
  STUDENT_PROGRESS: 'memberhero_student_progress',
  LESSON_PROGRESS: 'mh_lesson_progress',
};

export interface MigrationResult {
  success: boolean;
  entity: string;
  count: number;
  errors: string[];
  skipped: number;
  idMap?: Record<string, string>;
}

export interface MigrationSummary {
  success: boolean;
  results: MigrationResult[];
  summary: {
    totalMigrated: number;
    totalErrors: number;
    totalSkipped: number;
  };
  userIdMap?: Record<string, string>;
}

// Função para ler do localStorage
function readFromLocalStorage<T>(key: string): T | null {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
}

// Validar se é um UUID válido
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// Preview dos dados - EXPANDIDO
export function getDataPreview() {
  const courses = readFromLocalStorage<any[]>(STORAGE_KEYS.COURSES) || [];
  const modules = readFromLocalStorage<any[]>(STORAGE_KEYS.MODULES) || [];
  const lessons = readFromLocalStorage<any[]>(STORAGE_KEYS.LESSONS) || [];
  const categories = readFromLocalStorage<any[]>(STORAGE_KEYS.CATEGORIES) || [];
  const tags = readFromLocalStorage<any[]>(STORAGE_KEYS.TAGS) || [];
  const shelves = readFromLocalStorage<any[]>(STORAGE_KEYS.SHELVES) || [];
  const banner = readFromLocalStorage<any>(STORAGE_KEYS.BANNER);
  const secondaryBanners = readFromLocalStorage<any[]>(STORAGE_KEYS.SECONDARY_BANNERS) || [];
  const promoBanners = readFromLocalStorage<any[]>(STORAGE_KEYS.PROMO_BANNERS) || [];
  const users = readFromLocalStorage<any[]>(STORAGE_KEYS.USERS) || [];
  const access = readFromLocalStorage<any[]>(STORAGE_KEYS.ACCESS) || [];
  const notifications = readFromLocalStorage<any[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
  const webhooks = readFromLocalStorage<any[]>(STORAGE_KEYS.WEBHOOKS) || [];
  const platformSettings = readFromLocalStorage<any>(STORAGE_KEYS.PLATFORM_SETTINGS);
  const cardsSettings = readFromLocalStorage<any>(STORAGE_KEYS.CARDS_SETTINGS);
  const communitySettings = readFromLocalStorage<any>(STORAGE_KEYS.COMMUNITY_SETTINGS);
  const studentProgress = readFromLocalStorage<any[]>(STORAGE_KEYS.STUDENT_PROGRESS) || [];

  return {
    courses: { count: courses.length, sample: courses.slice(0, 3) },
    modules: { count: modules.length, sample: modules.slice(0, 3) },
    lessons: { count: lessons.length, sample: lessons.slice(0, 3) },
    categories: { count: categories.length, sample: categories.slice(0, 3) },
    tags: { count: tags.length, sample: tags.slice(0, 3) },
    shelves: { count: shelves.length, sample: shelves.slice(0, 3) },
    banner: banner ? { exists: true } : { exists: false },
    secondaryBanners: { count: secondaryBanners.length },
    promoBanners: { count: promoBanners.length },
    users: { count: users.length, sample: users.slice(0, 3).map(u => ({ ...u, password: '***' })) },
    access: { count: access.length },
    notifications: { count: notifications.length },
    webhooks: { count: webhooks.length },
    platformSettings: platformSettings ? { exists: true } : { exists: false },
    cardsSettings: cardsSettings ? { exists: true } : { exists: false },
    communitySettings: communitySettings ? { exists: true } : { exists: false },
    studentProgress: { count: studentProgress.length },
    total: courses.length + modules.length + lessons.length + categories.length + 
           tags.length + shelves.length + users.length + access.length + 
           notifications.length + webhooks.length + secondaryBanners.length + promoBanners.length +
           studentProgress.length,
  };
}

// ============ MIGRAÇÃO IDEMPOTENTE COM UPSERT E IDs PRESERVADOS ============

// Migrar Categorias - PRESERVA IDs
async function migrateCategories(): Promise<MigrationResult> {
  const categories = readFromLocalStorage<any[]>(STORAGE_KEYS.CATEGORIES) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Categorias',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const cat of categories) {
    try {
      // Verifica se já existe
      const { data: existing } = await (supabase
        .from('categories') as any)
        .select('id')
        .eq('id', cat.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[cat.id] = cat.id;
        continue;
      }

      // UPSERT preservando ID original
      const { error } = await (supabase
        .from('categories') as any)
        .upsert({
          id: isValidUUID(cat.id) ? cat.id : undefined,
          nome: cat.nome,
          descricao: cat.descricao || null,
          cor: cat.cor || '#D4AF37',
          ordem: cat.ordem || 0,
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[cat.id] = cat.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Categoria "${cat.nome}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Tags - PRESERVA IDs
async function migrateTags(): Promise<MigrationResult> {
  const tags = readFromLocalStorage<any[]>(STORAGE_KEYS.TAGS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Tags',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const tag of tags) {
    try {
      const { data: existing } = await (supabase
        .from('tags') as any)
        .select('id')
        .eq('id', tag.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[tag.id] = tag.id;
        continue;
      }

      const { error } = await (supabase
        .from('tags') as any)
        .upsert({
          id: isValidUUID(tag.id) ? tag.id : undefined,
          nome: tag.nome,
          descricao: tag.descricao || null,
          cor: tag.cor || '#D4AF37',
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[tag.id] = tag.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Tag "${tag.nome}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Cursos - PRESERVA IDs
async function migrateCourses(categoryIdMap: Record<string, string>): Promise<MigrationResult> {
  const courses = readFromLocalStorage<any[]>(STORAGE_KEYS.COURSES) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Cursos',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const course of courses) {
    try {
      const { data: existing } = await (supabase
        .from('courses') as any)
        .select('id')
        .eq('id', course.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[course.id] = course.id;
        continue;
      }

      const categoriaId = course.categoria && categoryIdMap[course.categoria] 
        ? categoryIdMap[course.categoria] 
        : (course.categoriaId || course.categoria_id || null);

      const { error } = await (supabase
        .from('courses') as any)
        .upsert({
          id: isValidUUID(course.id) ? course.id : undefined,
          titulo: course.titulo,
          descricao: course.descricao || null,
          imagem: course.imagem || null,
          banner: course.banner || null,
          status: course.status || 'Rascunho',
          categoria_id: categoriaId && isValidUUID(categoriaId) ? categoriaId : null,
          checkout_url: course.checkoutUrl || course.checkout_url || null,
          tag_integracao: course.tagIntegracao || course.tag_integracao || null,
          tipo: course.tipo || 'video',
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[course.id] = course.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Curso "${course.titulo}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Course Tags (relacionamento N:N)
async function migrateCourseTags(
  courseIdMap: Record<string, string>,
  tagIdMap: Record<string, string>
): Promise<MigrationResult> {
  const courses = readFromLocalStorage<any[]>(STORAGE_KEYS.COURSES) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Curso-Tags',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const course of courses) {
    if (!course.tags || course.tags.length === 0) continue;

    const courseId = courseIdMap[course.id] || course.id;
    if (!courseId || !isValidUUID(courseId)) continue;

    for (const tagId of course.tags) {
      const resolvedTagId = tagIdMap[tagId] || tagId;
      if (!resolvedTagId || !isValidUUID(resolvedTagId)) continue;

      try {
        // Verifica se já existe
        const { data: existing } = await (supabase
          .from('course_tags') as any)
          .select('id')
          .eq('course_id', courseId)
          .eq('tag_id', resolvedTagId)
          .maybeSingle();

        if (existing) {
          result.skipped++;
          continue;
        }

        const { error } = await (supabase
          .from('course_tags') as any)
          .insert({
            course_id: courseId,
            tag_id: resolvedTagId,
          });

        if (error) throw error;
        result.count++;
      } catch (error: any) {
        result.errors.push(`Course-Tag: ${error.message}`);
      }
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Módulos - PRESERVA IDs
async function migrateModules(courseIdMap: Record<string, string>): Promise<MigrationResult> {
  const modules = readFromLocalStorage<any[]>(STORAGE_KEYS.MODULES) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Módulos',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const module of modules) {
    try {
      const { data: existing } = await (supabase
        .from('modules') as any)
        .select('id')
        .eq('id', module.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[module.id] = module.id;
        continue;
      }

      const courseId = courseIdMap[module.cursoId] || module.cursoId || module.curso_id;
      if (!courseId || !isValidUUID(courseId)) {
        result.errors.push(`Módulo "${module.nome}": curso não encontrado`);
        continue;
      }

      const { error } = await (supabase
        .from('modules') as any)
        .upsert({
          id: isValidUUID(module.id) ? module.id : undefined,
          nome: module.nome,
          descricao: module.descricao || null,
          curso_id: courseId,
          ordem: module.ordem || 0,
          status: module.status || 'Rascunho',
          imagem: module.imagem || null,
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[module.id] = module.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Módulo "${module.nome}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Aulas - PRESERVA IDs
async function migrateLessons(
  courseIdMap: Record<string, string>,
  moduleIdMap: Record<string, string>
): Promise<MigrationResult> {
  const lessons = readFromLocalStorage<any[]>(STORAGE_KEYS.LESSONS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Aulas',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const lesson of lessons) {
    try {
      const { data: existing } = await (supabase
        .from('lessons') as any)
        .select('id')
        .eq('id', lesson.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[lesson.id] = lesson.id;
        continue;
      }

      const courseId = courseIdMap[lesson.cursoId] || lesson.cursoId || lesson.curso_id;
      const moduleId = moduleIdMap[lesson.moduloId] || lesson.moduloId || lesson.modulo_id;

      if (!courseId || !moduleId || !isValidUUID(courseId) || !isValidUUID(moduleId)) {
        result.errors.push(`Aula "${lesson.nome}": curso ou módulo não encontrado`);
        continue;
      }

      const { error } = await (supabase
        .from('lessons') as any)
        .upsert({
          id: isValidUUID(lesson.id) ? lesson.id : undefined,
          nome: lesson.nome,
          descricao: lesson.descricao || null,
          curso_id: courseId,
          modulo_id: moduleId,
          tipo: lesson.tipo || 'video',
          url: lesson.url || null,
          arquivo: lesson.arquivo || null,
          thumbnail: lesson.thumbnail || null,
          ordem: lesson.ordem || 0,
          status: lesson.status || 'Rascunho',
          materiais_extras: lesson.materiaisExtras || lesson.materiais_extras || null,
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[lesson.id] = lesson.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Aula "${lesson.nome}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Shelves - PRESERVA IDs
async function migrateShelves(): Promise<MigrationResult> {
  const shelves = readFromLocalStorage<any[]>(STORAGE_KEYS.SHELVES) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Prateleiras',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const shelf of shelves) {
    try {
      const { data: existing } = await (supabase
        .from('shelves') as any)
        .select('id')
        .eq('id', shelf.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[shelf.id] = shelf.id;
        continue;
      }

      const { error } = await (supabase
        .from('shelves') as any)
        .upsert({
          id: isValidUUID(shelf.id) ? shelf.id : undefined,
          titulo: shelf.titulo,
          ordem: shelf.ordem || 0,
          tipo: shelf.tipo || 'automatica',
          ativo: shelf.ativo !== false,
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[shelf.id] = shelf.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Prateleira "${shelf.titulo}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Shelf Courses
async function migrateShelfCourses(
  shelfIdMap: Record<string, string>,
  courseIdMap: Record<string, string>
): Promise<MigrationResult> {
  const shelves = readFromLocalStorage<any[]>(STORAGE_KEYS.SHELVES) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Prateleira-Cursos',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const shelf of shelves) {
    if (!shelf.cursosIds || shelf.cursosIds.length === 0) continue;

    const shelfId = shelfIdMap[shelf.id] || shelf.id;
    if (!shelfId || !isValidUUID(shelfId)) continue;

    for (let i = 0; i < shelf.cursosIds.length; i++) {
      const oldCourseId = shelf.cursosIds[i];
      const courseId = courseIdMap[oldCourseId] || oldCourseId;
      if (!courseId || !isValidUUID(courseId)) continue;

      try {
        const { data: existing } = await (supabase
          .from('shelf_courses') as any)
          .select('id')
          .eq('shelf_id', shelfId)
          .eq('course_id', courseId)
          .maybeSingle();

        if (existing) {
          result.skipped++;
          continue;
        }

        const { error } = await (supabase
          .from('shelf_courses') as any)
          .insert({
            shelf_id: shelfId,
            course_id: courseId,
            ordem: i,
          });

        if (error) throw error;
        result.count++;
      } catch (error: any) {
        result.errors.push(`Shelf-Course: ${error.message}`);
      }
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Banner Principal
async function migrateBannerPrincipal(): Promise<MigrationResult> {
  const banner = readFromLocalStorage<any>(STORAGE_KEYS.BANNER);
  const result: MigrationResult = {
    success: true,
    entity: 'Banner Principal',
    count: 0,
    errors: [],
    skipped: 0,
  };

  if (!banner) return result;

  try {
    // Verificar se já existe
    const { data: existing } = await (supabase
      .from('banner_principal') as any)
      .select('id')
      .limit(1)
      .maybeSingle();

    if (existing) {
      // Atualizar existente
      const { error } = await (supabase
        .from('banner_principal') as any)
        .update({
          imagem_url: banner.imagemUrl || banner.imagem_url || null,
          exibir: banner.exibir !== false,
          aspect_ratio: banner.aspectRatio || banner.aspect_ratio || '21/9',
          object_fit: banner.objectFit || banner.object_fit || 'cover',
          altura_original: banner.alturaOriginal || banner.altura_original || null,
          largura_original: banner.larguraOriginal || banner.largura_original || null,
        })
        .eq('id', existing.id);

      if (error) throw error;
      result.count = 1;
    } else {
      // Inserir novo
      const { error } = await (supabase
        .from('banner_principal') as any)
        .insert({
          imagem_url: banner.imagemUrl || banner.imagem_url || null,
          exibir: banner.exibir !== false,
          aspect_ratio: banner.aspectRatio || banner.aspect_ratio || '21/9',
          object_fit: banner.objectFit || banner.object_fit || 'cover',
          altura_original: banner.alturaOriginal || banner.altura_original || null,
          largura_original: banner.larguraOriginal || banner.largura_original || null,
        });

      if (error) throw error;
      result.count = 1;
    }
  } catch (error: any) {
    result.errors.push(`Banner Principal: ${error.message}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Banners Secundários
async function migrateSecondaryBanners(): Promise<MigrationResult> {
  const banners = readFromLocalStorage<any[]>(STORAGE_KEYS.SECONDARY_BANNERS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Banners Secundários',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const banner of banners) {
    try {
      const { data: existing } = await (supabase
        .from('banners_secundarios') as any)
        .select('id')
        .eq('id', banner.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const { error } = await (supabase
        .from('banners_secundarios') as any)
        .upsert({
          id: isValidUUID(banner.id) ? banner.id : undefined,
          nome: banner.nome || null,
          imagem_url: banner.imagemUrl || banner.imagem_url || null,
          posicao: banner.posicao || 'antes',
          tipo: banner.tipo || 'estatico',
          ativo: banner.ativo !== false,
          ordem: banner.ordem || 0,
          agendamento_habilitado: banner.agendamentoHabilitado || banner.agendamento_habilitado || false,
          agendamento_data_inicio: banner.agendamentoDataInicio || banner.agendamento_data_inicio || null,
          agendamento_data_fim: banner.agendamentoDataFim || banner.agendamento_data_fim || null,
          agendamento_hora_inicio: banner.agendamentoHoraInicio || banner.agendamento_hora_inicio || null,
          agendamento_hora_fim: banner.agendamentoHoraFim || banner.agendamento_hora_fim || null,
        }, { onConflict: 'id' });

      if (error) throw error;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Banner "${banner.nome}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Promo Banners
async function migratePromoBanners(): Promise<MigrationResult> {
  const banners = readFromLocalStorage<any[]>(STORAGE_KEYS.PROMO_BANNERS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Banners Promocionais',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const banner of banners) {
    try {
      const { data: existing } = await (supabase
        .from('promo_banners') as any)
        .select('id')
        .eq('id', banner.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const { error } = await (supabase
        .from('promo_banners') as any)
        .upsert({
          id: isValidUUID(banner.id) ? banner.id : undefined,
          nome: banner.nome || null,
          imagem_url: banner.imagemUrl || banner.imagem_url || null,
          posicao: banner.posicao || 'antes',
          tipo: banner.tipo || 'estatico',
          ativo: banner.ativo !== false,
          ordem: banner.ordem || 0,
          exibir_vitrine: banner.exibirVitrine ?? banner.exibir_vitrine ?? true,
          exibir_comunidade: banner.exibirComunidade ?? banner.exibir_comunidade ?? false,
          agendamento_habilitado: banner.agendamentoHabilitado || banner.agendamento_habilitado || false,
          agendamento_data_inicio: banner.agendamentoDataInicio || banner.agendamento_data_inicio || null,
          agendamento_data_fim: banner.agendamentoDataFim || banner.agendamento_data_fim || null,
          agendamento_hora_inicio: banner.agendamentoHoraInicio || banner.agendamento_hora_inicio || null,
          agendamento_hora_fim: banner.agendamentoHoraFim || banner.agendamento_hora_fim || null,
        }, { onConflict: 'id' });

      if (error) throw error;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Promo Banner "${banner.nome}": ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Platform Settings
async function migratePlatformSettings(): Promise<MigrationResult> {
  const settings = readFromLocalStorage<any>(STORAGE_KEYS.PLATFORM_SETTINGS) || 
                   readFromLocalStorage<any>(STORAGE_KEYS.SETTINGS);
  const result: MigrationResult = {
    success: true,
    entity: 'Configurações da Plataforma',
    count: 0,
    errors: [],
    skipped: 0,
  };

  if (!settings) return result;

  try {
    const { data: existing } = await (supabase
      .from('platform_settings') as any)
      .select('id')
      .limit(1)
      .maybeSingle();

    const settingsData = {
      platform_name: settings.platformName || settings.platform_name || settings.nomePlataforma || 'MemberHero',
      logo: settings.logo || null,
      favicon: settings.favicon || null,
      primary_color: settings.primaryColor || settings.primary_color || settings.corPrimaria || '#D4AF37',
      background_color: settings.backgroundColor || settings.background_color || settings.corFundo || '#000000',
      surface_color: settings.surfaceColor || settings.surface_color || settings.corSuperficie || '#0A0A0A',
      text_color: settings.textColor || settings.text_color || settings.corTexto || '#FFFFFF',
      footer_text: settings.footerText || settings.footer_text || settings.textoRodape || null,
      welcome_message: settings.welcomeMessage || settings.welcome_message || settings.mensagemBoasVindas || null,
      support_email: settings.supportEmail || settings.support_email || settings.emailSuporte || null,
      allow_registration: settings.allowRegistration ?? settings.allow_registration ?? true,
      maintenance_mode: settings.maintenanceMode ?? settings.maintenance_mode ?? false,
      google_analytics_id: settings.googleAnalyticsId || settings.google_analytics_id || null,
      facebook_pixel_id: settings.facebookPixelId || settings.facebook_pixel_id || null,
    };

    if (existing) {
      const { error } = await (supabase
        .from('platform_settings') as any)
        .update(settingsData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await (supabase
        .from('platform_settings') as any)
        .insert(settingsData);

      if (error) throw error;
    }
    result.count = 1;
  } catch (error: any) {
    result.errors.push(`Platform Settings: ${error.message}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Cards Settings
async function migrateCardsSettings(): Promise<MigrationResult> {
  const settings = readFromLocalStorage<any>(STORAGE_KEYS.CARDS_SETTINGS);
  const result: MigrationResult = {
    success: true,
    entity: 'Configurações de Cards',
    count: 0,
    errors: [],
    skipped: 0,
  };

  if (!settings) return result;

  try {
    const { data: existing } = await (supabase
      .from('cards_settings') as any)
      .select('id')
      .limit(1)
      .maybeSingle();

    const cardsData = {
      layout: settings.layout || 'vertical',
      image_aspect_ratio: settings.imageAspectRatio || settings.image_aspect_ratio || '16/9',
      show_category: settings.showCategory ?? settings.show_category ?? true,
      show_duration: settings.showDuration ?? settings.show_duration ?? false,
      show_progress: settings.showProgress ?? settings.show_progress ?? true,
    };

    if (existing) {
      const { error } = await (supabase
        .from('cards_settings') as any)
        .update(cardsData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await (supabase
        .from('cards_settings') as any)
        .insert(cardsData);

      if (error) throw error;
    }
    result.count = 1;
  } catch (error: any) {
    result.errors.push(`Cards Settings: ${error.message}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Community Settings
async function migrateCommunitySettings(): Promise<MigrationResult> {
  const settings = readFromLocalStorage<any>(STORAGE_KEYS.COMMUNITY_SETTINGS);
  const result: MigrationResult = {
    success: true,
    entity: 'Configurações da Comunidade',
    count: 0,
    errors: [],
    skipped: 0,
  };

  if (!settings) return result;

  try {
    const { data: existing } = await (supabase
      .from('community_settings') as any)
      .select('id')
      .limit(1)
      .maybeSingle();

    const communityData = {
      nome: settings.nome || 'Comunidade',
      descricao: settings.descricao || null,
      icone: settings.icone || '👥',
      imagem_capa: settings.imagemCapa || settings.imagem_capa || null,
      banner_principal: settings.bannerPrincipal || settings.banner_principal || null,
      cor_destaque: settings.corDestaque || settings.cor_destaque || '#D4AF37',
      mensagem_boas_vindas: settings.mensagemBoasVindas || settings.mensagem_boas_vindas || null,
      cursos_vinculados: settings.cursosVinculados || settings.cursos_vinculados || [],
      modulos_vinculados: settings.modulosVinculados || settings.modulos_vinculados || [],
    };

    if (existing) {
      const { error } = await (supabase
        .from('community_settings') as any)
        .update(communityData)
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await (supabase
        .from('community_settings') as any)
        .insert(communityData);

      if (error) throw error;
    }
    result.count = 1;
  } catch (error: any) {
    result.errors.push(`Community Settings: ${error.message}`);
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Webhooks
async function migrateWebhooks(): Promise<MigrationResult> {
  const webhooks = readFromLocalStorage<any[]>(STORAGE_KEYS.WEBHOOKS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Webhooks',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };

  for (const webhook of webhooks) {
    try {
      const { data: existing } = await (supabase
        .from('webhooks') as any)
        .select('id')
        .eq('id', webhook.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        if (result.idMap) result.idMap[webhook.id] = webhook.id;
        continue;
      }

      const courseId = webhook.cursoId || webhook.curso_id;
      if (!courseId || !isValidUUID(courseId)) {
        result.errors.push(`Webhook: curso inválido`);
        continue;
      }

      const { error } = await (supabase
        .from('webhooks') as any)
        .upsert({
          id: isValidUUID(webhook.id) ? webhook.id : undefined,
          plataforma: webhook.plataforma || 'kiwify',
          secret_key: webhook.secretKey || webhook.secret_key || '',
          curso_id: courseId,
          ativo: webhook.ativo !== false,
          checkout_url: webhook.checkoutUrl || webhook.checkout_url || null,
          external_product_id: webhook.externalProductId || webhook.external_product_id || null,
        }, { onConflict: 'id' });

      if (error) throw error;
      if (result.idMap) result.idMap[webhook.id] = webhook.id;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Webhook: ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Course Access (dependente de usuários)
async function migrateCourseAccess(userIdMap: Record<string, string>): Promise<MigrationResult> {
  const accessList = readFromLocalStorage<any[]>(STORAGE_KEYS.ACCESS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Acessos a Cursos',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const access of accessList) {
    try {
      const userId = userIdMap[access.userId || access.user_id] || access.userId || access.user_id;
      const courseId = access.courseId || access.course_id;

      if (!userId || !courseId || !isValidUUID(userId) || !isValidUUID(courseId)) {
        result.skipped++;
        continue;
      }

      const { data: existing } = await (supabase
        .from('course_access') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const { error } = await (supabase
        .from('course_access') as any)
        .insert({
          user_id: userId,
          course_id: courseId,
          granted: access.granted !== false,
          granted_at: access.grantedAt || access.granted_at || new Date().toISOString(),
          expires_at: access.expiresAt || access.expires_at || null,
        });

      if (error) throw error;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Course Access: ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Notificações (dependente de usuários)
async function migrateNotifications(userIdMap: Record<string, string>): Promise<MigrationResult> {
  const notifications = readFromLocalStorage<any[]>(STORAGE_KEYS.NOTIFICATIONS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Notificações',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const notif of notifications) {
    try {
      const { data: existing } = await (supabase
        .from('notifications') as any)
        .select('id')
        .eq('id', notif.id)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const userId = userIdMap[notif.userId || notif.user_id] || notif.userId || notif.user_id;

      const { error } = await (supabase
        .from('notifications') as any)
        .upsert({
          id: isValidUUID(notif.id) ? notif.id : undefined,
          user_id: userId && isValidUUID(userId) ? userId : null,
          titulo: notif.titulo || 'Notificação',
          mensagem: notif.mensagem || '',
          tipo: notif.tipo || 'info',
          lida: notif.lida ?? false,
          curso_id: notif.cursoId && isValidUUID(notif.cursoId) ? notif.cursoId : null,
          modulo_id: notif.moduloId && isValidUUID(notif.moduloId) ? notif.moduloId : null,
          aula_id: notif.aulaId && isValidUUID(notif.aulaId) ? notif.aulaId : null,
        }, { onConflict: 'id' });

      if (error) throw error;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Notificação: ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Migrar Student Progress (dependente de usuários)
async function migrateStudentProgress(
  userIdMap: Record<string, string>,
  courseIdMap: Record<string, string>,
  lessonIdMap: Record<string, string>
): Promise<MigrationResult> {
  const progressList = readFromLocalStorage<any[]>(STORAGE_KEYS.STUDENT_PROGRESS) || 
                       readFromLocalStorage<any[]>(STORAGE_KEYS.LESSON_PROGRESS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Progresso de Alunos',
    count: 0,
    errors: [],
    skipped: 0,
  };

  for (const progress of progressList) {
    try {
      const userId = userIdMap[progress.userId || progress.user_id] || progress.userId || progress.user_id;
      const courseId = courseIdMap[progress.cursoId || progress.curso_id] || progress.cursoId || progress.curso_id;
      const lessonId = lessonIdMap[progress.aulaId || progress.aula_id] || progress.aulaId || progress.aula_id;

      if (!userId || !courseId || !lessonId || 
          !isValidUUID(userId) || !isValidUUID(courseId) || !isValidUUID(lessonId)) {
        result.skipped++;
        continue;
      }

      const { data: existing } = await (supabase
        .from('student_progress') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('aula_id', lessonId)
        .maybeSingle();

      if (existing) {
        result.skipped++;
        continue;
      }

      const { error } = await (supabase
        .from('student_progress') as any)
        .insert({
          user_id: userId,
          curso_id: courseId,
          aula_id: lessonId,
          completed: progress.completed ?? false,
          completed_at: progress.completedAt || progress.completed_at || null,
          progress_percent: progress.progressPercent || progress.progress_percent || 0,
          last_position: progress.lastPosition || progress.last_position || 0,
        });

      if (error) throw error;
      result.count++;
    } catch (error: any) {
      result.errors.push(`Student Progress: ${error.message}`);
    }
  }

  result.success = result.errors.length === 0;
  return result;
}

// Função para migrar usuários via Edge Function
export async function migrateUsers(): Promise<{ result: MigrationResult; userIdMap: Record<string, string> }> {
  const users = readFromLocalStorage<any[]>(STORAGE_KEYS.USERS) || [];
  const result: MigrationResult = {
    success: true,
    entity: 'Usuários',
    count: 0,
    errors: [],
    skipped: 0,
    idMap: {},
  };
  const userIdMap: Record<string, string> = {};

  if (users.length === 0) {
    return { result, userIdMap };
  }

  try {
    const response = await supabase.functions.invoke('migrate-users', {
      body: { users },
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const data = response.data;
    
    if (data.results) {
      for (const userResult of data.results) {
        if (userResult.success) {
          result.count++;
          if (userResult.oldId && userResult.newId) {
            userIdMap[userResult.oldId] = userResult.newId;
            if (result.idMap) result.idMap[userResult.oldId] = userResult.newId;
          }
        } else if (userResult.skipped) {
          result.skipped++;
          if (userResult.oldId && userResult.existingId) {
            userIdMap[userResult.oldId] = userResult.existingId;
            if (result.idMap) result.idMap[userResult.oldId] = userResult.existingId;
          }
        } else {
          result.errors.push(userResult.error || 'Erro desconhecido');
        }
      }
    }
  } catch (error: any) {
    result.errors.push(`Migração de usuários: ${error.message}`);
  }

  result.success = result.errors.length === 0;
  return { result, userIdMap };
}

// Função principal de migração
export async function runFullMigration(
  onProgress: (step: string, progress: number) => void
): Promise<MigrationSummary> {
  const results: MigrationResult[] = [];
  let currentStep = 0;
  const totalSteps = 17;
  let userIdMap: Record<string, string> = {};

  try {
    // 1. Categories
    onProgress('Migrando categorias...', (++currentStep / totalSteps) * 100);
    const categoriesResult = await migrateCategories();
    results.push(categoriesResult);

    // 2. Tags
    onProgress('Migrando tags...', (++currentStep / totalSteps) * 100);
    const tagsResult = await migrateTags();
    results.push(tagsResult);

    // 3. Courses
    onProgress('Migrando cursos...', (++currentStep / totalSteps) * 100);
    const coursesResult = await migrateCourses(categoriesResult.idMap || {});
    results.push(coursesResult);

    // 4. Course Tags
    onProgress('Migrando relações curso-tags...', (++currentStep / totalSteps) * 100);
    const courseTagsResult = await migrateCourseTags(
      coursesResult.idMap || {},
      tagsResult.idMap || {}
    );
    results.push(courseTagsResult);

    // 5. Modules
    onProgress('Migrando módulos...', (++currentStep / totalSteps) * 100);
    const modulesResult = await migrateModules(coursesResult.idMap || {});
    results.push(modulesResult);

    // 6. Lessons
    onProgress('Migrando aulas...', (++currentStep / totalSteps) * 100);
    const lessonsResult = await migrateLessons(
      coursesResult.idMap || {},
      modulesResult.idMap || {}
    );
    results.push(lessonsResult);

    // 7. Shelves
    onProgress('Migrando prateleiras...', (++currentStep / totalSteps) * 100);
    const shelvesResult = await migrateShelves();
    results.push(shelvesResult);

    // 8. Shelf Courses
    onProgress('Migrando relações prateleira-cursos...', (++currentStep / totalSteps) * 100);
    const shelfCoursesResult = await migrateShelfCourses(
      shelvesResult.idMap || {},
      coursesResult.idMap || {}
    );
    results.push(shelfCoursesResult);

    // 9. Banner Principal
    onProgress('Migrando banner principal...', (++currentStep / totalSteps) * 100);
    const bannerResult = await migrateBannerPrincipal();
    results.push(bannerResult);

    // 10. Banners Secundários
    onProgress('Migrando banners secundários...', (++currentStep / totalSteps) * 100);
    const secondaryBannersResult = await migrateSecondaryBanners();
    results.push(secondaryBannersResult);

    // 11. Promo Banners
    onProgress('Migrando banners promocionais...', (++currentStep / totalSteps) * 100);
    const promoBannersResult = await migratePromoBanners();
    results.push(promoBannersResult);

    // 12. Platform Settings
    onProgress('Migrando configurações da plataforma...', (++currentStep / totalSteps) * 100);
    const platformSettingsResult = await migratePlatformSettings();
    results.push(platformSettingsResult);

    // 13. Cards Settings
    onProgress('Migrando configurações de cards...', (++currentStep / totalSteps) * 100);
    const cardsSettingsResult = await migrateCardsSettings();
    results.push(cardsSettingsResult);

    // 14. Community Settings
    onProgress('Migrando configurações da comunidade...', (++currentStep / totalSteps) * 100);
    const communitySettingsResult = await migrateCommunitySettings();
    results.push(communitySettingsResult);

    // 15. Webhooks
    onProgress('Migrando webhooks...', (++currentStep / totalSteps) * 100);
    const webhooksResult = await migrateWebhooks();
    results.push(webhooksResult);

    // 16. Usuários (via Edge Function)
    onProgress('Migrando usuários...', (++currentStep / totalSteps) * 100);
    const { result: usersResult, userIdMap: newUserIdMap } = await migrateUsers();
    results.push(usersResult);
    userIdMap = newUserIdMap;

    // 17. Dados dependentes de usuários
    onProgress('Migrando acessos e progresso...', (++currentStep / totalSteps) * 100);
    
    const courseAccessResult = await migrateCourseAccess(userIdMap);
    results.push(courseAccessResult);
    
    const notificationsResult = await migrateNotifications(userIdMap);
    results.push(notificationsResult);
    
    const progressResult = await migrateStudentProgress(
      userIdMap,
      coursesResult.idMap || {},
      lessonsResult.idMap || {}
    );
    results.push(progressResult);

    onProgress('Migração concluída!', 100);

    const summary = {
      totalMigrated: results.reduce((sum, r) => sum + r.count, 0),
      totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
    };

    return {
      success: summary.totalErrors === 0,
      results,
      summary,
      userIdMap,
    };
  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      success: false,
      results,
      summary: {
        totalMigrated: results.reduce((sum, r) => sum + r.count, 0),
        totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0) + 1,
        totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      },
    };
  }
}

// Limpar localStorage após migração bem-sucedida
export function clearLocalStorageAfterMigration(): void {
  Object.values(STORAGE_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

// Exportar backup do localStorage como JSON
export function exportLocalStorageBackup(): string {
  const backup: Record<string, any> = {};
  Object.entries(STORAGE_KEYS).forEach(([name, key]) => {
    backup[name] = readFromLocalStorage(key);
  });
  return JSON.stringify(backup, null, 2);
}

// Obter lista de usuários do localStorage
export function getUsersFromLocalStorage(): any[] {
  return readFromLocalStorage<any[]>(STORAGE_KEYS.USERS) || [];
}
