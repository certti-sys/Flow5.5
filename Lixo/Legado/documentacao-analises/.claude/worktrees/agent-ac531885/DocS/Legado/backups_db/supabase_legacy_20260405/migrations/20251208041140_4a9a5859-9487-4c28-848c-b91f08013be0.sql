-- Permitir que usuários autenticados vejam perfis de outros usuários
-- Isso é necessário para exibir nomes de autores em comentários
-- A tabela profiles contém apenas dados públicos (nome, avatar) - não há dados sensíveis

-- Primeiro, vamos dropar as políticas existentes de SELECT que podem conflitar
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Criar nova política que permite visualização de perfis por todos usuários autenticados
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);