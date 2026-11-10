-- Inserir registro inicial para banner principal se não existir
INSERT INTO showcase_settings (key, value) 
VALUES (
  'banner_principal',
  '{"imagemUrl": null, "exibir": true, "aspectRatio": "21/9", "objectFit": "cover"}'::jsonb
)
ON CONFLICT (key) DO NOTHING;