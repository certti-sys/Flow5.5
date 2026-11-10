-- Criar tabela de configurações de webhook
CREATE TABLE IF NOT EXISTS public.webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('hotmart', 'kiwify', 'monetizze', 'eduzz', 'bripe', 'outro')),
  secret_key TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  external_product_id TEXT,
  checkout_url TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(course_id)
);

-- Criar tabela de logs de webhook
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_config_id UUID REFERENCES public.webhook_configs(id) ON DELETE SET NULL,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'processing')),
  message TEXT,
  buyer_email TEXT,
  buyer_name TEXT,
  transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webhook_configs
CREATE POLICY "Admins can manage webhook configs"
ON public.webhook_configs
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read webhook configs for processing"
ON public.webhook_configs
FOR SELECT
TO anon
USING (active = true);

-- RLS Policies for webhook_logs
CREATE POLICY "Admins can view all webhook logs"
ON public.webhook_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert webhook logs"
ON public.webhook_logs
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role can insert webhook logs"
ON public.webhook_logs
FOR INSERT
TO anon
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_webhook_configs_course_id ON public.webhook_configs(course_id);
CREATE INDEX idx_webhook_configs_active ON public.webhook_configs(active);
CREATE INDEX idx_webhook_logs_webhook_config_id ON public.webhook_logs(webhook_config_id);
CREATE INDEX idx_webhook_logs_course_id ON public.webhook_logs(course_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_buyer_email ON public.webhook_logs(buyer_email);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_webhook_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_webhook_configs_updated_at
BEFORE UPDATE ON public.webhook_configs
FOR EACH ROW
EXECUTE FUNCTION update_webhook_configs_updated_at();