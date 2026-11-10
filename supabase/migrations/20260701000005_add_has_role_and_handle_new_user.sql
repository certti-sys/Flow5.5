-- Migração para adicionar funções Postgres essenciais que não estavam nas migrations iniciais
-- Estas funções são necessárias para as políticas RLS funcionarem corretamente

-- 1. Função has_role - utilizada nas políticas RLS de admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$function$;

-- 2. Função handle_new_user - trigger para criar perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    'active'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::app_role);

  RETURN NEW;
END;
$function$;

-- 3. Trigger para criar perfil automaticamente quando novo usuário é cadastrado no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
