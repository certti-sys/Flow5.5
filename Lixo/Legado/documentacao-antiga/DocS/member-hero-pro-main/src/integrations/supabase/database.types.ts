/**
 * Tipos customizados para as tabelas do Supabase
 * Este arquivo contorna as limitações do types.ts auto-gerado
 */

export interface DbProfile {
  id: string;
  user_id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  avatar_url: string | null;
  status: string | null;
  last_access_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'student';
  created_at: string;
}

export interface DbCourse {
  id: string;
  titulo: string;
  descricao: string | null;
  status: string;
  tipo: string;
  imagem: string | null;
  banner: string | null;
  categoria_id: string | null;
  checkout_url: string | null;
  tag_integracao: string | null;
  created_at: string;
}

export interface DbModule {
  id: string;
  curso_id: string;
  nome: string;
  descricao: string | null;
  imagem: string | null;
  ordem: number;
  status: string;
  created_at: string;
}

export interface DbLesson {
  id: string;
  modulo_id: string;
  curso_id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  url: string | null;
  thumbnail: string | null;
  arquivo: string | null;
  materiais_extras: string[] | null;
  status: string;
  ordem: number;
  created_at: string;
}

export interface DbCategory {
  id: string;
  nome: string;
  cor: string;
  descricao: string | null;
  ordem: number;
  created_at: string;
}

export interface DbTag {
  id: string;
  nome: string;
  cor: string;
  descricao: string | null;
  created_at: string;
}

export interface DbCourseTag {
  id: string;
  course_id: string;
  tag_id: string;
  created_at: string;
}

export interface DbShelf {
  id: string;
  titulo: string;
  ordem: number;
  tipo: string;
  ativo: boolean;
  created_at: string;
}

export interface DbShelfCourse {
  id: string;
  shelf_id: string;
  course_id: string;
  ordem: number;
  created_at: string;
}

export interface DbCourseAccess {
  id: string;
  user_id: string;
  course_id: string;
  granted: boolean;
  granted_at: string;
  expires_at: string | null;
  created_at: string;
}

export interface DbLessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  course_id: string;
  completed: boolean;
  progress_percent: number;
  last_position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPromoBanner {
  id: string;
  nome: string | null;
  imagem_url: string | null;
  posicao: string;
  tipo: string;
  ativo: boolean;
  ordem: number;
  agendamento_habilitado: boolean;
  agendamento_data_inicio: string | null;
  agendamento_hora_inicio: string | null;
  agendamento_data_fim: string | null;
  agendamento_hora_fim: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbBannerPrincipal {
  id: string;
  imagem_url: string | null;
  exibir: boolean;
  aspect_ratio: string;
  object_fit: string;
  largura_original: number | null;
  altura_original: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbShowcaseSettings {
  id: string;
  key: string;
  value: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbPlatformSettings {
  id: string;
  platform_name: string;
  logo: string | null;
  favicon: string | null;
  primary_color: string;
  background_color: string;
  surface_color: string;
  text_color: string;
  welcome_message: string;
  footer_text: string;
  support_email: string;
  google_analytics_id: string | null;
  facebook_pixel_id: string | null;
  maintenance_mode: boolean;
  allow_registration: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string | null;
  tipo: string;
  titulo: string;
  mensagem: string;
  curso_id: string | null;
  modulo_id: string | null;
  aula_id: string | null;
  lida: boolean;
  created_at: string;
}

export interface DbWebhook {
  id: string;
  curso_id: string;
  plataforma: string;
  secret_key: string;
  ativo: boolean;
  external_product_id: string | null;
  checkout_url: string | null;
  created_at: string;
}

export interface DbWebhookLog {
  id: string;
  webhook_id: string | null;
  curso_id: string;
  plataforma: string;
  evento: string;
  payload: Record<string, unknown>;
  status: string;
  mensagem: string | null;
  created_at: string;
}

export interface DbAdminNotificationSettings {
  id: string;
  user_id: string;
  email_alerts: boolean;
  alert_email: string | null;
  alert_on_error: boolean;
  alert_on_success: boolean;
  alert_on_new_student: boolean;
  daily_digest: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCommunity {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCommunityMember {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  created_at: string;
}
