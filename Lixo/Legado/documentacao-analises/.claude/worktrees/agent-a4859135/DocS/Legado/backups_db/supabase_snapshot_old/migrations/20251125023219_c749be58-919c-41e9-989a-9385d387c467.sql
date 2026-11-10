-- Add login overlay opacity control to platform_settings
ALTER TABLE platform_settings
ADD COLUMN login_overlay_opacity INTEGER DEFAULT 50
CHECK (login_overlay_opacity >= 0 AND login_overlay_opacity <= 100);

COMMENT ON COLUMN platform_settings.login_overlay_opacity IS 'Opacity percentage (0-100) for the dark overlay on login background image';