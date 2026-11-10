-- Tabela de configurações da comunidade
CREATE TABLE IF NOT EXISTS community_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL DEFAULT 'Comunidade Premium',
  descricao text DEFAULT '',
  imagem_capa text,
  banner_principal text,
  cor_destaque text DEFAULT '#D4AF37',
  mensagem_boas_vindas text DEFAULT '',
  icone text DEFAULT '🏛️',
  cursos_vinculados uuid[] DEFAULT '{}',
  modulos_vinculados uuid[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de acessos manuais à comunidade
CREATE TABLE IF NOT EXISTS community_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  granted boolean DEFAULT true,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid,
  UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE community_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_access ENABLE ROW LEVEL SECURITY;

-- Policies para community_settings
CREATE POLICY "Admins manage community settings"
ON community_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read community settings"
ON community_settings
FOR SELECT
USING (true);

-- Policies para community_access
CREATE POLICY "Admins manage community access"
ON community_access
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own access"
ON community_access
FOR SELECT
USING (auth.uid() = user_id);

-- Inserir configuração padrão se não existir
INSERT INTO community_settings (nome, descricao, icone)
VALUES ('Comunidade Premium', 'Acesso exclusivo para membros', '🏛️')
ON CONFLICT DO NOTHING;