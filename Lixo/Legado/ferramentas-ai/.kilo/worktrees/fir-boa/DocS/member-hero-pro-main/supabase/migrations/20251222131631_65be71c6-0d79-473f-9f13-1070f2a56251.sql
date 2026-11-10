-- =============================================
-- FASE 1: CRIAÇÃO DE TABELAS PARA MIGRAÇÃO
-- Tabelas que ainda usam localStorage
-- =============================================

-- 1. Enum para roles (seguindo boas práticas de segurança)
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- 2. Tabela de perfis de usuários (separada de auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    name TEXT,
    email TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Tabela de roles (separada para segurança - evita privilege escalation)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- 4. Tabela de configurações da plataforma
CREATE TABLE public.platform_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform_name TEXT DEFAULT 'MemberHero',
    logo TEXT,
    favicon TEXT,
    primary_color TEXT DEFAULT '#D4AF37',
    background_color TEXT DEFAULT '#000000',
    surface_color TEXT DEFAULT '#0A0A0A',
    text_color TEXT DEFAULT '#FFFFFF',
    welcome_message TEXT DEFAULT 'Bem-vindo à sua área de membros!',
    footer_text TEXT DEFAULT '© 2024 MemberHero. Todos os direitos reservados.',
    support_email TEXT DEFAULT 'suporte@memberhero.com',
    google_analytics_id TEXT,
    facebook_pixel_id TEXT,
    maintenance_mode BOOLEAN DEFAULT false,
    allow_registration BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Tabela de notificações
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL CHECK (tipo IN ('nova_aula', 'novo_modulo', 'curso_atualizado', 'acesso_liberado')),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    curso_id UUID,
    modulo_id UUID,
    aula_id UUID,
    lida BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. Tabela de webhooks
CREATE TABLE public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID NOT NULL,
    plataforma TEXT NOT NULL CHECK (plataforma IN ('hotmart', 'monetizze', 'eduzz', 'kiwify', 'bripe', 'outro')),
    secret_key TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    external_product_id TEXT,
    checkout_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 7. Tabela de logs de webhooks
CREATE TABLE public.webhook_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES public.webhooks(id) ON DELETE SET NULL,
    curso_id UUID NOT NULL,
    plataforma TEXT NOT NULL,
    evento TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    status TEXT NOT NULL CHECK (status IN ('sucesso', 'erro', 'processando')),
    mensagem TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Tabela de banner principal
CREATE TABLE public.banner_principal (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imagem_url TEXT,
    exibir BOOLEAN DEFAULT true,
    aspect_ratio TEXT DEFAULT '21/9',
    object_fit TEXT DEFAULT 'cover' CHECK (object_fit IN ('cover', 'contain')),
    largura_original INTEGER,
    altura_original INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 9. Tabela de banners secundários
CREATE TABLE public.banners_secundarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT,
    imagem_url TEXT,
    posicao TEXT NOT NULL CHECK (posicao IN ('antes', 'entre', 'depois')),
    tipo TEXT DEFAULT 'estatico' CHECK (tipo IN ('estatico', 'carrossel')),
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    agendamento_habilitado BOOLEAN DEFAULT false,
    agendamento_data_inicio DATE,
    agendamento_hora_inicio TIME,
    agendamento_data_fim DATE,
    agendamento_hora_fim TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 10. Tabela de progresso do estudante
CREATE TABLE public.student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    curso_id UUID NOT NULL,
    aula_id UUID NOT NULL,
    completed BOOLEAN DEFAULT false,
    progress_percent DECIMAL(5,2) DEFAULT 0,
    last_position INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, aula_id)
);

-- 11. Tabela de configurações de cards
CREATE TABLE public.cards_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    layout TEXT DEFAULT 'vertical' CHECK (layout IN ('vertical', 'horizontal', 'grid')),
    show_progress BOOLEAN DEFAULT true,
    show_category BOOLEAN DEFAULT true,
    show_duration BOOLEAN DEFAULT false,
    image_aspect_ratio TEXT DEFAULT '16/9',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_principal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banners_secundarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards_settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNÇÃO SECURITY DEFINER PARA VERIFICAR ROLE
-- =============================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
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

-- =============================================
-- RLS POLICIES
-- =============================================

-- Profiles: usuário vê seu próprio perfil, admins veem todos
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: apenas admins podem gerenciar roles
CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Platform settings: todos podem ler, apenas admins podem modificar
CREATE POLICY "Anyone can view settings" ON public.platform_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage settings" ON public.platform_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Notifications: usuário vê suas próprias, admins veem todas
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Webhooks: apenas admins
CREATE POLICY "Admins can manage webhooks" ON public.webhooks
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Webhook logs: apenas admins
CREATE POLICY "Admins can view webhook logs" ON public.webhook_logs
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert webhook logs" ON public.webhook_logs
    FOR INSERT WITH CHECK (true);

-- Banner principal: todos podem ler, apenas admins modificam
CREATE POLICY "Anyone can view banner" ON public.banner_principal
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage banner" ON public.banner_principal
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Banners secundários: todos podem ler, apenas admins modificam
CREATE POLICY "Anyone can view secondary banners" ON public.banners_secundarios
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage secondary banners" ON public.banners_secundarios
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Student progress: usuário gerencia seu próprio progresso
CREATE POLICY "Users can view own progress" ON public.student_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own progress" ON public.student_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress" ON public.student_progress
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Cards settings: todos podem ler, apenas admins modificam
CREATE POLICY "Anyone can view cards settings" ON public.cards_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage cards settings" ON public.cards_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- TRIGGERS PARA UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_settings_updated_at
    BEFORE UPDATE ON public.platform_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banner_principal_updated_at
    BEFORE UPDATE ON public.banner_principal
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_banners_secundarios_updated_at
    BEFORE UPDATE ON public.banners_secundarios
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
    BEFORE UPDATE ON public.student_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cards_settings_updated_at
    BEFORE UPDATE ON public.cards_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- INSERIR CONFIGURAÇÕES PADRÃO
-- =============================================

INSERT INTO public.platform_settings (id) VALUES (gen_random_uuid());
INSERT INTO public.banner_principal (id) VALUES (gen_random_uuid());
INSERT INTO public.cards_settings (id) VALUES (gen_random_uuid());