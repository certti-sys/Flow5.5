-- =============================================
-- CORREÇÃO: Criar tabelas faltantes do schema original
-- =============================================

-- 1. Tabela de cursos (caso não exista)
CREATE TABLE IF NOT EXISTS public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    descricao TEXT,
    status TEXT DEFAULT 'Rascunho',
    tipo TEXT DEFAULT 'video',
    imagem TEXT,
    banner TEXT,
    categoria_id UUID,
    checkout_url TEXT,
    tag_integracao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Tabela de módulos (caso não exista)
CREATE TABLE IF NOT EXISTS public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    imagem TEXT,
    ordem INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Rascunho',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 3. Tabela de aulas (caso não exista)
CREATE TABLE IF NOT EXISTS public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modulo_id UUID NOT NULL,
    curso_id UUID NOT NULL,
    nome TEXT NOT NULL,
    descricao TEXT,
    tipo TEXT DEFAULT 'video',
    url TEXT,
    thumbnail TEXT,
    arquivo TEXT,
    materiais_extras JSONB DEFAULT '[]',
    status TEXT DEFAULT 'Rascunho',
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 4. Tabela de categorias
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#D4AF37',
    descricao TEXT,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 5. Tabela de tags
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cor TEXT DEFAULT '#D4AF37',
    descricao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 6. Tabela de associação curso-tags
CREATE TABLE IF NOT EXISTS public.course_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (course_id, tag_id)
);

-- 7. Tabela de prateleiras
CREATE TABLE IF NOT EXISTS public.shelves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    ordem INTEGER DEFAULT 0,
    tipo TEXT DEFAULT 'automatica',
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 8. Tabela de associação prateleira-cursos
CREATE TABLE IF NOT EXISTS public.shelf_courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shelf_id UUID NOT NULL,
    course_id UUID NOT NULL,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (shelf_id, course_id)
);

-- 9. Tabela de promo_banners (banners promocionais)
CREATE TABLE IF NOT EXISTS public.promo_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT,
    imagem_url TEXT,
    posicao TEXT NOT NULL DEFAULT 'antes',
    tipo TEXT DEFAULT 'estatico',
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

-- 10. Tabela de comunidades
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 11. Tabela de membros de comunidade
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (community_id, user_id)
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelf_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

-- Policies para leitura pública e admin para escrita
CREATE POLICY "Anyone can view courses" ON public.courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view lessons" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "Admins can manage lessons" ON public.lessons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view tags" ON public.tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage tags" ON public.tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view course_tags" ON public.course_tags FOR SELECT USING (true);
CREATE POLICY "Admins can manage course_tags" ON public.course_tags FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view shelves" ON public.shelves FOR SELECT USING (true);
CREATE POLICY "Admins can manage shelves" ON public.shelves FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view shelf_courses" ON public.shelf_courses FOR SELECT USING (true);
CREATE POLICY "Admins can manage shelf_courses" ON public.shelf_courses FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view promo_banners" ON public.promo_banners FOR SELECT USING (true);
CREATE POLICY "Admins can manage promo_banners" ON public.promo_banners FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can view communities" ON public.communities FOR SELECT USING (true);
CREATE POLICY "Admins can manage communities" ON public.communities FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their community memberships" ON public.community_members FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all community members" ON public.community_members FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Trigger para promo_banners updated_at
CREATE TRIGGER update_promo_banners_updated_at
    BEFORE UPDATE ON public.promo_banners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON public.communities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();