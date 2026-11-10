-- Create theme_settings table for storing custom color themes
CREATE TABLE IF NOT EXISTS public.theme_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_color text NOT NULL,
  color_palette jsonb NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage themes
CREATE POLICY "Admins manage themes" 
ON public.theme_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view active themes
CREATE POLICY "Anyone can view active theme" 
ON public.theme_settings 
FOR SELECT 
USING (is_active = true);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_theme_settings_updated_at
BEFORE UPDATE ON public.theme_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();