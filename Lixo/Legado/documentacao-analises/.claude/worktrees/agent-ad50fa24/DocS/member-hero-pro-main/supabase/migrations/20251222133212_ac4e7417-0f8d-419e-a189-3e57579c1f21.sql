-- =============================================
-- CRIAR TABELAS FALTANTES
-- =============================================

-- 1. Tabela de configurações de comunidade
CREATE TABLE IF NOT EXISTS public.community_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL DEFAULT 'Comunidade',
    descricao TEXT,
    imagem_capa TEXT,
    banner_principal TEXT,
    cor_destaque TEXT DEFAULT '#D4AF37',
    mensagem_boas_vindas TEXT,
    icone TEXT DEFAULT '👥',
    cursos_vinculados UUID[] DEFAULT '{}',
    modulos_vinculados UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Tabela de acesso à comunidade
CREATE TABLE IF NOT EXISTS public.community_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    has_access BOOLEAN DEFAULT false,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id)
);

-- 3. Tabela de comentários de aulas
CREATE TABLE IF NOT EXISTS public.lesson_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    parent_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Adicionar colunas faltantes em promo_banners/banners_secundarios
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS exibir_vitrine BOOLEAN DEFAULT true;
ALTER TABLE public.promo_banners ADD COLUMN IF NOT EXISTS exibir_comunidade BOOLEAN DEFAULT false;

-- 5. Adicionar relação categories -> courses
ALTER TABLE public.courses ADD CONSTRAINT fk_courses_categories 
    FOREIGN KEY (categoria_id) REFERENCES public.categories(id) ON DELETE SET NULL;

-- Habilitar RLS
ALTER TABLE public.community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view community settings" ON public.community_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage community settings" ON public.community_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own community access" ON public.community_access FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage community access" ON public.community_access FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view lesson comments" ON public.lesson_comments FOR SELECT USING (true);
CREATE POLICY "Users can create own comments" ON public.lesson_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.lesson_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.lesson_comments FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all comments" ON public.lesson_comments FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Triggers
CREATE TRIGGER update_community_settings_updated_at
    BEFORE UPDATE ON public.community_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lesson_comments_updated_at
    BEFORE UPDATE ON public.lesson_comments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configuração padrão de comunidade
INSERT INTO public.community_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;