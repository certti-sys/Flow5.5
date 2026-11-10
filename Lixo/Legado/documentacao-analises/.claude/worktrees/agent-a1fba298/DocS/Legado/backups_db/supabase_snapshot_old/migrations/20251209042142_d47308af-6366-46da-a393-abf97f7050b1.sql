-- Atualizar políticas RLS da tabela profiles para maior privacidade
-- Usuários só podem ver seu próprio perfil, exceto admins que podem ver todos

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile or admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Nota: As políticas de UPDATE já estão corretas (users update own, admins update any)
-- Não é necessário alterar as políticas de UPDATE