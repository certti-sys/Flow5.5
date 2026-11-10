-- Criar tabela para configurações de notificações de admin
CREATE TABLE IF NOT EXISTS public.admin_notifications_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_alerts BOOLEAN DEFAULT true,
  alert_on_error BOOLEAN DEFAULT true,
  alert_on_multiple_failures BOOLEAN DEFAULT true,
  failure_threshold INTEGER DEFAULT 3,
  platforms_to_monitor TEXT[] DEFAULT ARRAY['hotmart', 'kiwify', 'monetizze', 'eduzz', 'bripe'],
  alert_email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.admin_notifications_settings ENABLE ROW LEVEL SECURITY;

-- Políticas: apenas admins podem gerenciar suas próprias configurações
CREATE POLICY "Admins can manage own notification settings"
  ON public.admin_notifications_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id)
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_admin_notifications_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_admin_notifications_settings_updated_at
  BEFORE UPDATE ON public.admin_notifications_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_notifications_settings_updated_at();
