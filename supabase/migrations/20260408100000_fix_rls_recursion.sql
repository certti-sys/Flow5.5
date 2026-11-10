-- ======================================================
-- 20260408100000_fix_rls_recursion.sql
-- Descrição: Correção de Recursão Infinita em RLS e Limpeza de Duplicatas.
-- Tabelas afetadas: profiles, user_roles, comments.
-- ======================================================

BEGIN;

-- 1. Limpeza e Otimização da tabela 'user_roles'
-- Evita que a política de Admin chame a função has_role (que consulta a própria tabela)
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

-- Usuários podem Ver seus próprios papéis (Essencial para o check de admin funcionar via subquery)
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admins podem gerenciar tudo (usando subquery direta para evitar recursão)
CREATE POLICY "Admins manage roles" ON public.user_roles
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        )
    );

-- 2. Limpeza e Otimização da tabela 'profiles'
-- Removemos TODAS as políticas de SELECT antigas para garantir que não haja conflito
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Única política de SELECT: Dono vê o seu OU Admin vê todos (usando subquery direta)
CREATE POLICY "Profiles select policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (
        (auth.uid() = id) OR 
        (EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        ))
    );

-- Políticas de UPDATE (também sem has_role)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

CREATE POLICY "Profiles update policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (
        (auth.uid() = id) OR 
        (EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        ))
    );

-- 3. Estabilização da tabela 'comments'
-- Garante que admins possam deletar sem recursão
DROP POLICY IF EXISTS "Admins delete any comment" ON public.comments;
CREATE POLICY "Admins delete any comment" ON public.comments
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'::app_role
        )
    );

-- Garante que o SELECT seja público para autenticados (já deve estar certo, mas reforçamos)
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments" ON public.comments
    FOR SELECT TO authenticated
    USING (true);

COMMIT;
