-- =====================================================
-- MEMBERHERO - MIGRAÇÃO COMPLETA PARA SUPABASE
-- =====================================================

-- 1. CRIAR ENUMS
-- =====================================================
CREATE TYPE course_status AS ENUM ('Publicado', 'Rascunho');
CREATE TYPE lesson_type AS ENUM ('video', 'pdf', 'arquivo', 'externo');
CREATE TYPE student_status AS ENUM ('ativo', 'inativo', 'bloqueado');
CREATE TYPE shelf_type AS ENUM ('automatica', 'manual');
CREATE TYPE app_role AS ENUM ('admin', 'student');

-- 2. CRIAR TABELAS
-- =====================================================

-- 2.1 Profiles (vinculado ao auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  status student_status DEFAULT 'ativo',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_access_at TIMESTAMPTZ
);

-- 2.2 User Roles (CRÍTICO PARA SEGURANÇA)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 2.3 Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#D4AF37',
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Tags
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cor TEXT DEFAULT '#D4AF37',
  descricao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Courses
CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  status course_status DEFAULT 'Rascunho',
  imagem TEXT,
  banner TEXT,
  categoria_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  checkout_url TEXT,
  tag_integracao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Course Tags (N:N)
CREATE TABLE public.course_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  UNIQUE (course_id, tag_id)
);

-- 2.7 Modules
CREATE TABLE public.modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curso_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  imagem TEXT,
  ordem INTEGER DEFAULT 0,
  status course_status DEFAULT 'Rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  curso_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo lesson_type DEFAULT 'video',
  url TEXT,
  thumbnail TEXT,
  arquivo TEXT,
  materiais_extras TEXT[],
  ordem INTEGER DEFAULT 0,
  status course_status DEFAULT 'Rascunho',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 Shelves (Prateleiras)
CREATE TABLE public.shelves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  tipo shelf_type DEFAULT 'automatica',
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.10 Shelf Courses (N:N)
CREATE TABLE public.shelf_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shelf_id UUID REFERENCES public.shelves(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  ordem INTEGER DEFAULT 0,
  UNIQUE (shelf_id, course_id)
);

-- 2.11 Course Access (Acesso dos Alunos)
CREATE TABLE public.course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  granted BOOLEAN DEFAULT true,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

-- 2.12 Lesson Progress
CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES public.modules(id) ON DELETE CASCADE NOT NULL,
  completed BOOLEAN DEFAULT false,
  watched_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

-- 2.13 App Settings
CREATE TABLE public.app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FUNÇÕES DE SEGURANÇA
-- =====================================================

-- 3.1 Função para Verificar Role (SECURITY DEFINER)
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
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 3.2 Função para Criar Profile Automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  
  -- Por padrão, novos usuários são students
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$;

-- 3.3 Trigger para Criar Profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- 4.1 Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.2 User Roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.3 Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins manage categories"
  ON public.categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.4 Tags
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read tags"
  ON public.tags FOR SELECT
  USING (true);

CREATE POLICY "Admins manage tags"
  ON public.tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.5 Courses
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published courses"
  ON public.courses FOR SELECT
  USING (status = 'Publicado');

CREATE POLICY "Admins can view all courses"
  ON public.courses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage courses"
  ON public.courses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.6 Course Tags
ALTER TABLE public.course_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read course tags"
  ON public.course_tags FOR SELECT
  USING (true);

CREATE POLICY "Admins manage course tags"
  ON public.course_tags FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.7 Modules
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View modules of published courses"
  ON public.modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = modules.curso_id 
      AND courses.status = 'Publicado'
    )
  );

CREATE POLICY "Admins can view all modules"
  ON public.modules FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage modules"
  ON public.modules FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.8 Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View lessons of published courses"
  ON public.lessons FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.courses 
      WHERE courses.id = lessons.curso_id 
      AND courses.status = 'Publicado'
    )
  );

CREATE POLICY "Admins can view all lessons"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage lessons"
  ON public.lessons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.9 Shelves
ALTER TABLE public.shelves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active shelves"
  ON public.shelves FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admins can view all shelves"
  ON public.shelves FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage shelves"
  ON public.shelves FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.10 Shelf Courses
ALTER TABLE public.shelf_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read shelf courses"
  ON public.shelf_courses FOR SELECT
  USING (true);

CREATE POLICY "Admins manage shelf courses"
  ON public.shelf_courses FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.11 Course Access
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own access"
  ON public.course_access FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own access"
  ON public.course_access FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all access"
  ON public.course_access FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage course access"
  ON public.course_access FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4.12 Lesson Progress
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progress"
  ON public.lesson_progress FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all progress"
  ON public.lesson_progress FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4.13 App Settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins manage settings"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. STORAGE BUCKET
-- =====================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true);

-- RLS para Storage
CREATE POLICY "Public read media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'media');

CREATE POLICY "Admins upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'media' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins update media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins delete media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'media' 
    AND public.has_role(auth.uid(), 'admin')
  );