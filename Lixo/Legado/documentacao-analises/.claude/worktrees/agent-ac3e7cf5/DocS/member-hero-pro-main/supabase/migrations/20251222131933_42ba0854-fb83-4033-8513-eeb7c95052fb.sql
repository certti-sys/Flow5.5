-- =============================================
-- CORREÇÃO: Adicionar colunas e tabelas faltantes
-- =============================================

-- 1. Adicionar colunas faltantes em profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS last_access_at TIMESTAMP WITH TIME ZONE;

-- 2. Criar tabela showcase_settings
CREATE TABLE IF NOT EXISTS public.showcase_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.showcase_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view showcase settings" ON public.showcase_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage showcase settings" ON public.showcase_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 3. Criar tabela admin_notifications_settings
CREATE TABLE IF NOT EXISTS public.admin_notifications_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email_alerts BOOLEAN DEFAULT true,
    alert_email TEXT,
    alert_on_error BOOLEAN DEFAULT true,
    alert_on_success BOOLEAN DEFAULT false,
    alert_on_new_student BOOLEAN DEFAULT true,
    daily_digest BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.admin_notifications_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification settings" ON public.admin_notifications_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification settings" ON public.admin_notifications_settings
    FOR ALL USING (auth.uid() = user_id);

-- 4. Criar tabela lesson_progress (caso não exista)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID NOT NULL,
    course_id UUID NOT NULL,
    completed BOOLEAN DEFAULT false,
    progress_percent DECIMAL(5,2) DEFAULT 0,
    last_position INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own lesson progress" ON public.lesson_progress
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all lesson progress" ON public.lesson_progress
    FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 5. Criar tabela course_access (caso não exista com a estrutura correta)
CREATE TABLE IF NOT EXISTS public.course_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    course_id UUID NOT NULL,
    granted BOOLEAN DEFAULT true,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, course_id)
);

ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own course access" ON public.course_access
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all course access" ON public.course_access
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. Triggers para updated_at nas novas tabelas
CREATE TRIGGER update_showcase_settings_updated_at
    BEFORE UPDATE ON public.showcase_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_notifications_settings_updated_at
    BEFORE UPDATE ON public.admin_notifications_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_progress_updated_at
    BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();