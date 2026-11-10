-- Criar tabela promo_banners
CREATE TABLE promo_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT,
  imagem_url TEXT NOT NULL,
  posicao TEXT NOT NULL DEFAULT 'antes',
  tipo TEXT NOT NULL DEFAULT 'estatico',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  
  -- Onde exibir
  exibir_vitrine BOOLEAN NOT NULL DEFAULT true,
  exibir_comunidade BOOLEAN NOT NULL DEFAULT false,
  
  -- Agendamento
  agendamento_habilitado BOOLEAN NOT NULL DEFAULT false,
  agendamento_data_inicio TIMESTAMPTZ,
  agendamento_data_fim TIMESTAMPTZ,
  agendamento_hora_inicio TIME,
  agendamento_hora_fim TIME,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_promo_banners_ativo ON promo_banners(ativo);
CREATE INDEX idx_promo_banners_vitrine ON promo_banners(exibir_vitrine) WHERE ativo = true;
CREATE INDEX idx_promo_banners_comunidade ON promo_banners(exibir_comunidade) WHERE ativo = true;

-- RLS Policies
ALTER TABLE promo_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage promo banners" ON promo_banners
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public read active promo banners" ON promo_banners
  FOR SELECT USING (ativo = true);