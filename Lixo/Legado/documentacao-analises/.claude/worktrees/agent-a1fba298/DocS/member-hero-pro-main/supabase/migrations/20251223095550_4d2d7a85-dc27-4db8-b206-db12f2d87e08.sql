-- Atualizar a configuração mostrarCadeado para true
UPDATE showcase_settings 
SET value = jsonb_set(COALESCE(value, '{}'::jsonb), '{mostrarCadeado}', 'true'::jsonb),
    updated_at = now()
WHERE key = 'cards_settings';

-- Caso não exista o registro, inserir com a configuração correta
INSERT INTO showcase_settings (key, value, updated_at)
SELECT 'cards_settings', 
       '{"exibirTitulo": true, "exibirDescricao": true, "exibirCategoria": true, "mostrarProgresso": true, "mostrarCadeado": true, "efeitoHover": true, "limiteGlobal": 20, "mostrarBorda": true, "opacidadeGradienteCard": 60, "opacidadeGradienteVitrine": 80}'::jsonb,
       now()
WHERE NOT EXISTS (SELECT 1 FROM showcase_settings WHERE key = 'cards_settings');