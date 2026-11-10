-- ============================================
-- ESTRUTURA COMPLETA DO BANCO DE DADOS
-- Execute este SQL no SQL Editor do Supabase
-- ============================================

-- 1. Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Criar tabela de perfis
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    whatsapp TEXT,
    avatar_url TEXT,
    member_since TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Criar tabela de roles (SEPARADA por segurança)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- 4. Criar tabela de cursos
CREATE TABLE public.courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    category TEXT NOT NULL,
    instructor TEXT NOT NULL,
    duration TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Criar tabela de módulos
CREATE TABLE public.modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Criar tabela de aulas
CREATE TABLE public.lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    duration TEXT NOT NULL,
    video_url TEXT NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Criar tabela de progresso
CREATE TABLE public.user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

-- 8. Criar tabela de comentários
CREATE TABLE public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Ativar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 10. Criar função de verificação de role (previne recursão RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 11. Criar função para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Novo Usuário'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- 12. Criar trigger para novos usuários
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. POLÍTICAS RLS - Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 14. POLÍTICAS RLS - User Roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 15. POLÍTICAS RLS - Courses
CREATE POLICY "Anyone can view courses" ON public.courses
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage courses" ON public.courses
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 16. POLÍTICAS RLS - Modules
CREATE POLICY "Anyone can view modules" ON public.modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage modules" ON public.modules
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 17. POLÍTICAS RLS - Lessons
CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage lessons" ON public.lessons
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 18. POLÍTICAS RLS - User Progress
CREATE POLICY "Users view own progress" ON public.user_progress
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own progress" ON public.user_progress
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own progress" ON public.user_progress
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all progress" ON public.user_progress
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 19. POLÍTICAS RLS - Comments
CREATE POLICY "Anyone can view comments" ON public.comments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users create comments" ON public.comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own comments" ON public.comments
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own comments" ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins delete any comment" ON public.comments
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 20. Criar índices para performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_modules_course_id ON public.modules(course_id);
CREATE INDEX idx_lessons_module_id ON public.lessons(module_id);
CREATE INDEX idx_user_progress_user_id ON public.user_progress(user_id);
CREATE INDEX idx_user_progress_lesson_id ON public.user_progress(lesson_id);
CREATE INDEX idx_comments_lesson_id ON public.comments(lesson_id);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
