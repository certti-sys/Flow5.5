-- ============================================
-- STUDENT MANAGEMENT SYSTEM - DATABASE STRUCTURE
-- Etapa 1: Tabelas, Campos e Políticas RLS
-- ============================================

-- 1. Criar tabela de controle de acesso aos cursos
CREATE TABLE IF NOT EXISTS public.user_course_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_id)
);

COMMENT ON TABLE public.user_course_access IS 'Controls which courses each user has access to';
COMMENT ON COLUMN public.user_course_access.granted_by IS 'Admin user ID who granted this access';

-- 2. Adicionar campos de status e suspensão à tabela profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

COMMENT ON COLUMN public.profiles.status IS 'User account status: active or suspended';
COMMENT ON COLUMN public.profiles.suspended_at IS 'Timestamp when user was suspended';
COMMENT ON COLUMN public.profiles.suspended_by IS 'Admin user ID who suspended this account';
COMMENT ON COLUMN public.profiles.suspension_reason IS 'Reason provided for account suspension';

-- 3. Ativar RLS na nova tabela
ALTER TABLE public.user_course_access ENABLE ROW LEVEL SECURITY;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_course_access_user_id ON public.user_course_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_course_access_course_id ON public.user_course_access(course_id);
CREATE INDEX IF NOT EXISTS idx_user_course_access_granted_by ON public.user_course_access(granted_by);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);

-- 5. POLÍTICAS RLS - user_course_access

-- Admins podem gerenciar todos os acessos
CREATE POLICY "Admins manage all course access" 
ON public.user_course_access
FOR ALL 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Usuários podem visualizar seus próprios acessos
CREATE POLICY "Users view own course access" 
ON public.user_course_access
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 6. ATUALIZAR POLÍTICAS RLS - profiles

-- Remover política antiga se existir e criar nova permitindo admins verem todos
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles
FOR SELECT 
TO authenticated
USING (
  auth.uid() = id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Permitir admins atualizarem qualquer perfil
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" 
ON public.profiles
FOR UPDATE 
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 7. ATUALIZAR POLÍTICAS RLS - courses

-- Remover política antiga de visualização de cursos
DROP POLICY IF EXISTS "Anyone can view courses" ON public.courses;

-- Nova política: Usuários veem cursos atribuídos a eles OU todos os cursos se forem admin
CREATE POLICY "Users view assigned courses or admins view all" 
ON public.courses
FOR SELECT 
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.user_course_access
    WHERE user_id = auth.uid()
    AND course_id = courses.id
  )
);

-- 8. Criar trigger para atualizar updated_at em profiles (se não existir)
CREATE OR REPLACE FUNCTION public.update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profiles_updated_at();