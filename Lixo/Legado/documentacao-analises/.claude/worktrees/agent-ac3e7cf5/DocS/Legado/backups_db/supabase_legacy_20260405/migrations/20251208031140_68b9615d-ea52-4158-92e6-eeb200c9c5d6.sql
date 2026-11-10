-- Remover FK existente que aponta para auth.users
ALTER TABLE public.comments
DROP CONSTRAINT IF EXISTS comments_user_id_fkey;

-- Criar FK que aponta para public.profiles (necessário para JOINs do Supabase)
ALTER TABLE public.comments
ADD CONSTRAINT comments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;