-- Add login background image field to platform_settings
ALTER TABLE platform_settings
ADD COLUMN login_background_url TEXT DEFAULT NULL;

COMMENT ON COLUMN platform_settings.login_background_url IS 'URL da imagem de fundo personalizada para a tela de login';