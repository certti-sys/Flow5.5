-- ============================================
-- MEMBER HERO - COMPLETE SQL SETUP
-- Supabase FREE Compatible
-- Version: 1.0.0
-- ============================================

-- ============================================
-- 1. CLEANUP (Safe for new projects)
-- ============================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- ============================================
-- 2. TYPES / ENUMS
-- ============================================
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- ============================================
-- 3. CORE TABLES
-- ============================================

-- PROFILES (User profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email text,
    name text,
    avatar text,
    avatar_url text,
    status text DEFAULT 'active',
    last_access_at timestamptz,
    onboarding_email_sent_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- USER ROLES (Separate table for security)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    descricao text,
    cor text DEFAULT '#D4AF37',
    ordem integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- TAGS
CREATE TABLE IF NOT EXISTS public.tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL,
    descricao text,
    cor text DEFAULT '#D4AF37',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- COURSES
CREATE TABLE IF NOT EXISTS public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    descricao text,
    imagem text,
    banner text,
    tipo text DEFAULT 'video',
    status text DEFAULT 'Rascunho',
    categoria_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    tag_integracao text,
    checkout_url text,
    external_product_id text,
    external_product_name text,
    integration_platform text,
    integration_notes text,
    integration_enabled boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- COURSE_TAGS (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.course_tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, tag_id)
);

-- MODULES
CREATE TABLE IF NOT EXISTS public.modules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id uuid NOT NULL,
    nome text NOT NULL,
    descricao text,
    imagem text,
    ordem integer DEFAULT 0,
    status text DEFAULT 'Rascunho',
    created_at timestamptz NOT NULL DEFAULT now()
);

-- LESSONS
CREATE TABLE IF NOT EXISTS public.lessons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id uuid NOT NULL,
    modulo_id uuid NOT NULL,
    nome text NOT NULL,
    descricao text,
    url text,
    arquivo text,
    thumbnail text,
    tipo text DEFAULT 'video',
    ordem integer DEFAULT 0,
    status text DEFAULT 'Rascunho',
    materiais_extras jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- COURSE ACCESS (Matrículas)
CREATE TABLE IF NOT EXISTS public.course_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    granted boolean DEFAULT true,
    granted_at timestamptz DEFAULT now(),
    expires_at timestamptz,
    source text DEFAULT 'admin',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, course_id)
);

-- LESSON PROGRESS
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    lesson_id uuid NOT NULL,
    module_id uuid,
    progress_percent numeric DEFAULT 0,
    watched_seconds integer DEFAULT 0,
    last_position integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, lesson_id)
);

-- STUDENT PROGRESS (Legacy/Alternative)
CREATE TABLE IF NOT EXISTS public.student_progress (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    curso_id uuid NOT NULL,
    aula_id uuid NOT NULL,
    progress_percent numeric DEFAULT 0,
    last_position integer DEFAULT 0,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id, aula_id)
);

-- SHELVES (Prateleiras)
CREATE TABLE IF NOT EXISTS public.shelves (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo text NOT NULL,
    tipo text DEFAULT 'automatica',
    categoria_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    ordem integer DEFAULT 0,
    ativo boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- SHELF COURSES (Many-to-Many)
CREATE TABLE IF NOT EXISTS public.shelf_courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id uuid NOT NULL,
    course_id uuid NOT NULL,
    ordem integer DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (shelf_id, course_id)
);

-- BANNER PRINCIPAL
CREATE TABLE IF NOT EXISTS public.banner_principal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    imagem_url text,
    exibir boolean DEFAULT true,
    aspect_ratio text DEFAULT '21/9',
    object_fit text DEFAULT 'cover',
    largura_original integer,
    altura_original integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- BANNERS SECUNDÁRIOS
CREATE TABLE IF NOT EXISTS public.banners_secundarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text,
    posicao text NOT NULL,
    imagem_url text,
    tipo text DEFAULT 'estatico',
    ordem integer DEFAULT 0,
    ativo boolean DEFAULT true,
    agendamento_habilitado boolean DEFAULT false,
    agendamento_data_inicio date,
    agendamento_hora_inicio time,
    agendamento_data_fim date,
    agendamento_hora_fim time,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROMO BANNERS
CREATE TABLE IF NOT EXISTS public.promo_banners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text,
    posicao text NOT NULL DEFAULT 'antes',
    imagem_url text,
    tipo text DEFAULT 'estatico',
    ordem integer DEFAULT 0,
    ativo boolean DEFAULT true,
    exibir_vitrine boolean DEFAULT true,
    exibir_comunidade boolean DEFAULT false,
    agendamento_habilitado boolean DEFAULT false,
    agendamento_data_inicio date,
    agendamento_hora_inicio time,
    agendamento_data_fim date,
    agendamento_hora_fim time,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- SHOWCASE SETTINGS
CREATE TABLE IF NOT EXISTS public.showcase_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- CARDS SETTINGS
CREATE TABLE IF NOT EXISTS public.cards_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    layout text DEFAULT 'vertical',
    image_aspect_ratio text DEFAULT '16/9',
    show_progress boolean DEFAULT true,
    show_category boolean DEFAULT true,
    show_duration boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- COMMUNITIES
CREATE TABLE IF NOT EXISTS public.communities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    image_url text,
    ativo boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- COMMUNITY ACCESS
CREATE TABLE IF NOT EXISTS public.community_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    has_access boolean DEFAULT false,
    granted_at timestamptz DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- COMMUNITY MEMBERS
CREATE TABLE IF NOT EXISTS public.community_members (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (community_id, user_id)
);

-- COMMUNITY SETTINGS
CREATE TABLE IF NOT EXISTS public.community_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nome text NOT NULL DEFAULT 'Comunidade',
    descricao text,
    icone text DEFAULT '👥',
    cor_destaque text DEFAULT '#D4AF37',
    banner_principal text,
    imagem_capa text,
    mensagem_boas_vindas text,
    cursos_vinculados uuid[] DEFAULT '{}'::uuid[],
    modulos_vinculados uuid[] DEFAULT '{}'::uuid[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- WEBHOOKS
CREATE TABLE IF NOT EXISTS public.webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id uuid NOT NULL,
    plataforma text NOT NULL,
    secret_key text NOT NULL,
    external_product_id text,
    checkout_url text,
    ativo boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- WEBHOOK CONFIGS
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL,
    platform text NOT NULL,
    secret_key text NOT NULL DEFAULT gen_random_uuid()::text,
    external_product_id text,
    checkout_url text,
    active boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- WEBHOOK LOGS
CREATE TABLE IF NOT EXISTS public.webhook_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid,
    curso_id uuid,
    plataforma text NOT NULL,
    evento text NOT NULL,
    status text NOT NULL,
    mensagem text,
    payload jsonb DEFAULT '{}'::jsonb,
    buyer_name text,
    buyer_email text,
    transaction_id text,
    external_product_id text,
    course_matched boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- PLATFORM SETTINGS
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name text DEFAULT 'MemberHero',
    logo text,
    favicon text,
    primary_color text DEFAULT '#D4AF37',
    background_color text DEFAULT '#000000',
    surface_color text DEFAULT '#0A0A0A',
    text_color text DEFAULT '#FFFFFF',
    welcome_message text DEFAULT 'Bem-vindo à sua área de membros!',
    footer_text text DEFAULT '© 2024 MemberHero. Todos os direitos reservados.',
    support_email text DEFAULT 'suporte@memberhero.com',
    google_analytics_id text,
    facebook_pixel_id text,
    maintenance_mode boolean DEFAULT false,
    allow_registration boolean DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- APP SETTINGS
CREATE TABLE IF NOT EXISTS public.app_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL UNIQUE,
    value jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ADMIN NOTIFICATIONS SETTINGS
CREATE TABLE IF NOT EXISTS public.admin_notifications_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    email_alerts boolean DEFAULT true,
    daily_digest boolean DEFAULT false,
    alert_on_new_student boolean DEFAULT true,
    alert_on_success boolean DEFAULT false,
    alert_on_error boolean DEFAULT true,
    alert_email text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid,
    tipo text NOT NULL,
    titulo text NOT NULL,
    mensagem text NOT NULL,
    curso_id uuid,
    modulo_id uuid,
    aula_id uuid,
    lida boolean DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- LESSON COMMENTS
CREATE TABLE IF NOT EXISTS public.lesson_comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id uuid NOT NULL,
    user_id uuid NOT NULL,
    parent_id uuid,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- 4. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_categoria_id ON public.courses(categoria_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.courses(status);
CREATE INDEX IF NOT EXISTS idx_modules_curso_id ON public.modules(curso_id);
CREATE INDEX IF NOT EXISTS idx_lessons_curso_id ON public.lessons(curso_id);
CREATE INDEX IF NOT EXISTS idx_lessons_modulo_id ON public.lessons(modulo_id);
CREATE INDEX IF NOT EXISTS idx_course_access_user_id ON public.course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_course_access_course_id ON public.course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_id ON public.lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_lesson_id ON public.lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at);

-- ============================================
-- 5. FUNCTIONS
-- ============================================

-- HAS_ROLE: Check if user has specific role (Security Definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- UPDATE_UPDATED_AT: Auto-update timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- HANDLE_NEW_USER: Auto-create profile and role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (user_id, email, name, status)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)), 
        'active'
    )
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Create default role as student
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'student')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- 6. TRIGGERS
-- ============================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW 
    EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
    BEFORE UPDATE ON public.student_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banner_principal_updated_at
    BEFORE UPDATE ON public.banner_principal
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_secundarios_updated_at
    BEFORE UPDATE ON public.banners_secundarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promo_banners_updated_at
    BEFORE UPDATE ON public.promo_banners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_showcase_settings_updated_at
    BEFORE UPDATE ON public.showcase_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_settings_updated_at
    BEFORE UPDATE ON public.cards_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON public.communities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_community_settings_updated_at
    BEFORE UPDATE ON public.community_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_configs_updated_at
    BEFORE UPDATE ON public.webhook_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_notifications_settings_updated_at
    BEFORE UPDATE ON public.admin_notifications_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_comments_updated_at
    BEFORE UPDATE ON public.lesson_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_principal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners_secundarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.showcase_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- PROFILES
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- USER ROLES
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CATEGORIES
CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (has_role(auth.uid(), 'admin'));

-- TAGS
CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COURSES
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COURSE_TAGS
CREATE POLICY "Anyone can view course_tags" ON public.course_tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage course_tags" ON public.course_tags FOR ALL USING (has_role(auth.uid(), 'admin'));

-- MODULES
CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (has_role(auth.uid(), 'admin'));

-- LESSONS
CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COURSE ACCESS
CREATE POLICY "Users can view own course access" ON public.course_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all course access" ON public.course_access FOR ALL USING (has_role(auth.uid(), 'admin'));

-- LESSON PROGRESS
CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all lesson progress" ON public.lesson_progress FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- STUDENT PROGRESS
CREATE POLICY "Users can view own progress" ON public.student_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own progress" ON public.student_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all progress" ON public.student_progress FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- SHELVES
CREATE POLICY "Anyone can view shelves" ON public.shelves FOR SELECT USING (true);
CREATE POLICY "Admins can manage shelves" ON public.shelves FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SHELF COURSES
CREATE POLICY "Anyone can view shelf_courses" ON public.shelf_courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage shelf_courses" ON public.shelf_courses FOR ALL USING (has_role(auth.uid(), 'admin'));

-- BANNER PRINCIPAL
CREATE POLICY "Anyone can view banner" ON public.banner_principal FOR SELECT USING (true);
CREATE POLICY "Admins can manage banner" ON public.banner_principal FOR ALL USING (has_role(auth.uid(), 'admin'));

-- BANNERS SECUNDÁRIOS
CREATE POLICY "Anyone can view secondary banners" ON public.banners_secundarios FOR SELECT USING (true);
CREATE POLICY "Admins can manage secondary banners" ON public.banners_secundarios FOR ALL USING (has_role(auth.uid(), 'admin'));

-- PROMO BANNERS
CREATE POLICY "Anyone can view promo_banners" ON public.promo_banners FOR SELECT USING (true);
CREATE POLICY "Admins can manage promo_banners" ON public.promo_banners FOR ALL USING (has_role(auth.uid(), 'admin'));

-- SHOWCASE SETTINGS
CREATE POLICY "Anyone can view showcase settings" ON public.showcase_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage showcase settings" ON public.showcase_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- CARDS SETTINGS
CREATE POLICY "Anyone can view cards settings" ON public.cards_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage cards settings" ON public.cards_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COMMUNITIES
CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Admins can manage communities" ON public.communities FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COMMUNITY ACCESS
CREATE POLICY "Users can view own community access" ON public.community_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage community access" ON public.community_access FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COMMUNITY MEMBERS
CREATE POLICY "Users can view their community memberships" ON public.community_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all community members" ON public.community_members FOR ALL USING (has_role(auth.uid(), 'admin'));

-- COMMUNITY SETTINGS
CREATE POLICY "Anyone can view community settings" ON public.community_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage community settings" ON public.community_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- WEBHOOKS
CREATE POLICY "Admins can manage webhooks" ON public.webhooks FOR ALL USING (has_role(auth.uid(), 'admin'));

-- WEBHOOK CONFIGS
CREATE POLICY "Admins can manage webhook configs" ON public.webhook_configs FOR ALL USING (has_role(auth.uid(), 'admin'));

-- WEBHOOK LOGS (Special: Allow inserts from webhooks/service role)
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs FOR SELECT USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "System can insert webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- PLATFORM SETTINGS
CREATE POLICY "Anyone can view settings" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON public.platform_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- APP SETTINGS
CREATE POLICY "Anyone can view app settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage app settings" ON public.app_settings FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ADMIN NOTIFICATIONS SETTINGS
CREATE POLICY "Users can view own notification settings" ON public.admin_notifications_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own notification settings" ON public.admin_notifications_settings FOR ALL USING (auth.uid() = user_id);

-- NOTIFICATIONS
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all notifications" ON public.notifications FOR ALL USING (has_role(auth.uid(), 'admin'));

-- LESSON COMMENTS
CREATE POLICY "Anyone can view lesson comments" ON public.lesson_comments FOR SELECT USING (true);
CREATE POLICY "Users can create own comments" ON public.lesson_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.lesson_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.lesson_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all comments" ON public.lesson_comments FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============================================
-- 9. STORAGE BUCKET
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media bucket
CREATE POLICY "Anyone can view media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Admins can upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media' AND has_role(auth.uid(), 'admin'));

-- ============================================
-- 10. SEED DATA (Minimal)
-- ============================================

-- Default platform settings
INSERT INTO public.platform_settings (
    platform_name,
    primary_color,
    background_color,
    surface_color,
    text_color,
    welcome_message,
    footer_text,
    support_email,
    maintenance_mode,
    allow_registration
) VALUES (
    'MemberHero',
    '#D4AF37',
    '#000000',
    '#0A0A0A',
    '#FFFFFF',
    'Bem-vindo à sua área de membros!',
    '© 2024 MemberHero. Todos os direitos reservados.',
    'suporte@memberhero.com',
    false,
    true
) ON CONFLICT DO NOTHING;

-- Default cards settings
INSERT INTO public.cards_settings (
    layout,
    image_aspect_ratio,
    show_progress,
    show_category,
    show_duration
) VALUES (
    'vertical',
    '16/9',
    true,
    true,
    false
) ON CONFLICT DO NOTHING;

-- Default community settings
INSERT INTO public.community_settings (
    nome,
    descricao,
    icone,
    cor_destaque
) VALUES (
    'Comunidade',
    'Bem-vindo à nossa comunidade!',
    '👥',
    '#D4AF37'
) ON CONFLICT DO NOTHING;

-- Default banner principal
INSERT INTO public.banner_principal (
    exibir,
    aspect_ratio,
    object_fit
) VALUES (
    false,
    '21/9',
    'cover'
) ON CONFLICT DO NOTHING;

-- ============================================
-- COMPLETE! 🎉
-- ============================================
-- Your Member Hero database is now ready.
-- 
-- Next steps:
-- 1. Create your first admin user via Supabase Auth
-- 2. Manually add admin role: INSERT INTO user_roles (user_id, role) VALUES ('your-user-id', 'admin');
-- 3. Connect your Lovable project
-- ============================================
