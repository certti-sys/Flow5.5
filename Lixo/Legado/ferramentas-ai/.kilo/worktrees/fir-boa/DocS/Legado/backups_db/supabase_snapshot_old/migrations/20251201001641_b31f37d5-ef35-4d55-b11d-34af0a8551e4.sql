-- Add navigation layout configuration to platform_settings
ALTER TABLE platform_settings 
ADD COLUMN navigation_layout TEXT DEFAULT 'horizontal' 
CHECK (navigation_layout IN ('horizontal', 'sidebar', 'both'));

ALTER TABLE platform_settings 
ADD COLUMN sidebar_default_collapsed BOOLEAN DEFAULT false;

COMMENT ON COLUMN platform_settings.navigation_layout IS 'Navigation layout type: horizontal (navbar only), sidebar (sidebar only), or both (navbar + sidebar)';
COMMENT ON COLUMN platform_settings.sidebar_default_collapsed IS 'Whether the sidebar starts collapsed by default';