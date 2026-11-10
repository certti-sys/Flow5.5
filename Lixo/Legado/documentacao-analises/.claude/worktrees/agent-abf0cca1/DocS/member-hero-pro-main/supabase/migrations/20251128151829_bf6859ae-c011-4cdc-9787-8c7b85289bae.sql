-- Criar tabela showcase_settings para armazenar configurações globais
CREATE TABLE IF NOT EXISTS public.showcase_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir configuração padrão de cards
INSERT INTO public.showcase_settings (key, value) VALUES (
  'cards_settings',
  '{"exibirTitulo": true, "exibirDescricao": true, "exibirCategoria": true, "mostrarProgresso": true, "mostrarCadeado": true, "efeitoHover": true, "limiteGlobal": 20}'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Habilitar RLS
ALTER TABLE public.showcase_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem ler showcase_settings
CREATE POLICY "Todos podem ler showcase_settings" ON public.showcase_settings
  FOR SELECT USING (true);

-- Policy: Admin pode atualizar showcase_settings
CREATE POLICY "Admin pode atualizar showcase_settings" ON public.showcase_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Admin pode inserir showcase_settings
CREATE POLICY "Admin pode inserir showcase_settings" ON public.showcase_settings
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));