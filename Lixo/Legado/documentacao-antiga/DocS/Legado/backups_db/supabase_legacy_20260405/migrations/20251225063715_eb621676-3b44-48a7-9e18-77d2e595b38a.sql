-- ============================================
-- SISTEMA DE WHATSAPP - TABELAS E POLÍTICAS
-- ============================================

-- 1. Tabela de configurações do WhatsApp (multi-provider)
CREATE TABLE public.whatsapp_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  
  -- Provider selecionado
  provider TEXT NOT NULL DEFAULT 'evolution',
  
  -- Evolution API
  evolution_api_url TEXT,
  evolution_api_key TEXT,
  evolution_instance_name TEXT,
  
  -- Z-API (futuro)
  zapi_instance_id TEXT,
  zapi_token TEXT,
  zapi_security_token TEXT,
  
  -- Waha (futuro)
  waha_api_url TEXT,
  waha_session_name TEXT,
  
  -- Meta Cloud API (futuro)
  meta_phone_number_id TEXT,
  meta_access_token TEXT,
  meta_business_account_id TEXT,
  
  -- Configurações gerais
  default_country_code TEXT DEFAULT '55',
  send_typing_indicator BOOLEAN DEFAULT true,
  delay_between_messages INTEGER DEFAULT 1000,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabela de templates de mensagem
CREATE TABLE public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  message TEXT NOT NULL,
  active BOOLEAN DEFAULT true,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Tabela de logs de WhatsApp
CREATE TABLE public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  template_key TEXT,
  message_preview TEXT,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS - whatsapp_settings
CREATE POLICY "Admins manage whatsapp_settings" ON public.whatsapp_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- 6. Políticas RLS - message_templates
CREATE POLICY "Admins manage message_templates" ON public.message_templates
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active templates" ON public.message_templates
  FOR SELECT USING (active = true);

-- 7. Políticas RLS - whatsapp_logs
CREATE POLICY "Admins view whatsapp_logs" ON public.whatsapp_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert whatsapp_logs" ON public.whatsapp_logs
  FOR INSERT WITH CHECK (true);

-- 8. Trigger para updated_at
CREATE TRIGGER update_whatsapp_settings_updated_at
  BEFORE UPDATE ON public.whatsapp_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Índices para performance
CREATE INDEX idx_whatsapp_logs_phone ON public.whatsapp_logs(phone);
CREATE INDEX idx_whatsapp_logs_status ON public.whatsapp_logs(status);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
CREATE INDEX idx_message_templates_key ON public.message_templates(key);
CREATE INDEX idx_message_templates_category ON public.message_templates(category);

-- 10. Dados iniciais - Templates
INSERT INTO public.message_templates (key, title, description, category, message) VALUES
('welcome_new_user', 'Boas-vindas', 'Enviada quando um novo aluno é cadastrado', 'welcome',
'🎉 *Bem-vindo(a), {{user_name}}!*

Sua conta foi criada com sucesso na nossa plataforma.

📧 *Email:* {{user_email}}
🔑 *Senha:* {{temp_password}}

Acesse agora: {{login_url}}

Qualquer dúvida, estamos aqui! 💬'),

('course_access_granted', 'Acesso ao Curso', 'Enviada quando o aluno recebe acesso a um curso', 'notification',
'🎓 *Novo Curso Liberado!*

Olá {{user_name}}!

Você agora tem acesso ao curso:
📚 *{{course_name}}*

Bons estudos! 🚀'),

('lesson_reminder', 'Lembrete de Aula', 'Lembrete para continuar estudando', 'notification',
'📖 *Continue seus estudos!*

Olá {{user_name}}!

Você parou na aula "{{lesson_name}}" do curso "{{course_name}}".

Que tal continuar de onde parou? 💪'),

('payment_confirmed', 'Pagamento Confirmado', 'Enviada quando o pagamento é aprovado', 'payment',
'✅ *Pagamento confirmado!*

Olá {{customer_name}}!

Seu pagamento de *R$ {{amount}}* foi confirmado com sucesso.

📦 *Pedido:* {{order_id}}
💳 *Método:* {{payment_method}}

Em breve você receberá acesso. Obrigado pela compra! 🙏'),

('new_order_admin', 'Nova Venda - Admin', 'Notificação para admin sobre nova venda', 'admin',
'🎉 *Nova venda realizada!*

👤 *Cliente:* {{customer_name}}
📧 *Email:* {{customer_email}}
📱 *Telefone:* {{customer_phone}}

💰 *Valor:* R$ {{amount}}
💳 *Pagamento:* {{payment_method}}
🔢 *ID do Pedido:* {{order_id}}');