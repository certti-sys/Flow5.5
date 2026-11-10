-- Create platform_settings table for branding customization
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Banner settings
  banner_badge_text TEXT DEFAULT '✨ Nova Experiência de Aprendizado',
  banner_title_line1 TEXT DEFAULT 'Inspire-se,',
  banner_title_line2 TEXT DEFAULT 'Aprenda,',
  banner_title_line3 TEXT DEFAULT 'Cresça.',
  banner_subtitle TEXT DEFAULT 'Acesse cursos premium, aprenda no seu ritmo e transforme seu conhecimento em resultados reais.',
  banner_button_primary_text TEXT DEFAULT 'Explorar Cursos',
  banner_button_secondary_text TEXT DEFAULT 'Meu Progresso',
  banner_background_url TEXT,
  banner_show_stats_card BOOLEAN DEFAULT false,
  
  -- Logo settings
  logo_text TEXT DEFAULT 'EduStream',
  logo_image_url TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active settings"
ON public.platform_settings
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins manage settings"
ON public.platform_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for platform assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('platform-assets', 'platform-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public can view platform assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'platform-assets');

CREATE POLICY "Admins can upload platform assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'platform-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'platform-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete platform assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'platform-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.platform_settings (is_active) VALUES (true)
ON CONFLICT DO NOTHING;