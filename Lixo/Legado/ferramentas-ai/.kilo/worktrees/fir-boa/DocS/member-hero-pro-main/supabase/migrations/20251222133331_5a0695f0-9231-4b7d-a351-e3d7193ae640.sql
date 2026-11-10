-- =============================================
-- CORREÇÃO: Adicionar colunas e tabelas faltantes
-- =============================================

-- 1. Adicionar colunas faltantes em lesson_progress
ALTER TABLE public.lesson_progress 
ADD COLUMN IF NOT EXISTS module_id UUID,
ADD COLUMN IF NOT EXISTS watched_seconds INTEGER DEFAULT 0;

-- 2. Criar tabela app_settings para configurações gerais
CREATE TABLE IF NOT EXISTS public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT NOT NULL UNIQUE,
    value JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app settings" ON public.app_settings
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage app settings" ON public.app_settings
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Criar tabela webhook_configs (diferente de webhooks)
CREATE TABLE IF NOT EXISTS public.webhook_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL,
    platform TEXT NOT NULL,
    secret_key TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    external_product_id TEXT,
    checkout_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage webhook configs" ON public.webhook_configs
    FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_webhook_configs_updated_at
    BEFORE UPDATE ON public.webhook_configs
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();