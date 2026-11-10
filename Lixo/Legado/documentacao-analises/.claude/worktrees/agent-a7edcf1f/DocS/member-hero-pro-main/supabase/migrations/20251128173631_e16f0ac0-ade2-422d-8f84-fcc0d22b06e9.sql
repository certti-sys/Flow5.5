-- Inserir registro inicial de platform_settings na tabela app_settings
INSERT INTO app_settings (key, value) 
VALUES ('platform_settings', '{
  "platformName": "MemberHero",
  "logo": null,
  "favicon": null,
  "primaryColor": "#D4AF37",
  "backgroundColor": "#000000",
  "surfaceColor": "#0A0A0A",
  "textColor": "#FFFFFF",
  "welcomeMessage": "Bem-vindo à sua área de membros!",
  "footerText": "© 2024 MemberHero. Todos os direitos reservados.",
  "supportEmail": "suporte@memberhero.com",
  "googleAnalyticsId": "",
  "facebookPixelId": "",
  "maintenanceMode": false,
  "allowRegistration": true
}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Criar tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nova_aula', 'novo_modulo', 'curso_atualizado', 'acesso_liberado')),
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  curso_id UUID,
  modulo_id UUID,
  aula_id UUID,
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications" ON notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_lida ON notifications(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);