-- ============================================
-- WEBHOOK HUB COM AUTO DISCOVERY - FASE 1
-- ============================================

-- 1. Criar tabela webhook_schemas para auto discovery
CREATE TABLE IF NOT EXISTS public.webhook_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES public.webhook_platforms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  fields_json JSONB NOT NULL DEFAULT '[]',
  sample_payload JSONB,
  sample_event_id UUID REFERENCES public.webhook_transactions(id) ON DELETE SET NULL,
  is_learned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(platform_id, event_type)
);

-- 2. Criar tabela webhook_field_mappings (mais robusta que platform_field_mappings)
CREATE TABLE IF NOT EXISTS public.webhook_field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id UUID REFERENCES public.webhook_platforms(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT,
  source_path TEXT NOT NULL,
  internal_field TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  transform_type TEXT DEFAULT 'direct',
  transform_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_webhook_schemas_platform_event 
  ON public.webhook_schemas(platform_id, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_field_mappings_platform 
  ON public.webhook_field_mappings(platform_id, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_transactions_platform_status 
  ON public.webhook_transactions(platform_id, status);

-- 4. Habilitar RLS
ALTER TABLE public.webhook_schemas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_field_mappings ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para webhook_schemas
CREATE POLICY "Admins manage webhook_schemas" ON public.webhook_schemas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert webhook_schemas" ON public.webhook_schemas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update webhook_schemas" ON public.webhook_schemas
  FOR UPDATE
  USING (true);

-- 6. Políticas RLS para webhook_field_mappings
CREATE POLICY "Admins manage webhook_field_mappings" ON public.webhook_field_mappings
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_webhook_schemas_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_webhook_schemas_timestamp
  BEFORE UPDATE ON public.webhook_schemas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webhook_schemas_updated_at();

CREATE TRIGGER update_webhook_field_mappings_timestamp
  BEFORE UPDATE ON public.webhook_field_mappings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_webhook_schemas_updated_at();