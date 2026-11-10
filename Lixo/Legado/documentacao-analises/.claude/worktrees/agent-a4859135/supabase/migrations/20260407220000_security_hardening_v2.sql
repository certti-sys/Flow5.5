-- ======================================================
-- 20260407220000_security_hardening_v2.sql
-- Descrição: Consolidação do Hardening de Segurança (Fase 2.1)
-- Inclui: Saneamento de RLS, Restrição de Acesso Public/Anon e 
-- Correções para listagem de Comentários no Admin.
-- ======================================================

BEGIN;

-- 1. Hardening da tabela 'profiles'
-- Permite que usuários vejam o próprio e Admins vejam todos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING ( (auth.uid() = id) OR (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role)) );

-- 2. Consolidação da tabela 'orders'
-- Remover duplicatas e versões 'public' não autorizadas
DROP POLICY IF EXISTS "User create orders" ON public.orders;
DROP POLICY IF EXISTS "User view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin view all orders" ON public.orders;
-- NOTA: Mantemos "Users can create own orders" e "Users can view own orders" (FOR authenticated)

-- 3. Hardening da tabela 'lesson_progress'
-- Migrar de public para authenticated
DROP POLICY IF EXISTS "Users can view own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can insert own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Users can update own lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admins can manage all lesson progress" ON public.lesson_progress;
DROP POLICY IF EXISTS "Admins can view all lesson progress" ON public.lesson_progress;

CREATE POLICY "Users can view own lesson progress" ON public.lesson_progress
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress" ON public.lesson_progress
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress" ON public.lesson_progress
    FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all lesson progress" ON public.lesson_progress
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- 4. Hardening da tabela 'comments'
-- Garantir que listagem funcione para todos os usuários logados
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments" ON public.comments
    FOR SELECT TO authenticated USING (true);

-- 5. Correção de 'order_items'
-- Remover acesso anon indevido e versões public
DROP POLICY IF EXISTS "Anon can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Anon can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Admin view all order items" ON public.order_items;
DROP POLICY IF EXISTS "User view own order items" ON public.order_items;

-- 6. Saneamento de 'user_stats'
-- Migrar de public para authenticated
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Admins view all user stats" ON public.user_stats;
DROP POLICY IF EXISTS "System can insert user stats" ON public.user_stats;

CREATE POLICY "Users can view own stats" ON public.user_stats
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all user stats" ON public.user_stats
    FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- 7. Audit Logs
DROP POLICY IF EXISTS "Admin view audit logs" ON public.audit_logs;

COMMIT;
