-- Create function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create carousels table
CREATE TABLE public.carousels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('auto', 'manual')),
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  cards_per_view_desktop INTEGER NOT NULL DEFAULT 5,
  cards_per_view_mobile INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create carousel_courses junction table for manual carousels
CREATE TABLE public.carousel_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES public.carousels(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(carousel_id, course_id)
);

-- Enable RLS
ALTER TABLE public.carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_courses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for carousels
CREATE POLICY "Anyone can view active carousels"
  ON public.carousels
  FOR SELECT
  USING (is_active = true OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage carousels"
  ON public.carousels
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for carousel_courses
CREATE POLICY "Anyone can view carousel courses"
  ON public.carousel_courses
  FOR SELECT
  USING (true);

CREATE POLICY "Admins manage carousel courses"
  ON public.carousel_courses
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_carousels_order ON public.carousels(order_index);
CREATE INDEX idx_carousels_active ON public.carousels(is_active);
CREATE INDEX idx_carousel_courses_carousel ON public.carousel_courses(carousel_id);
CREATE INDEX idx_carousel_courses_order ON public.carousel_courses(carousel_id, order_index);

-- Create trigger for updated_at
CREATE TRIGGER update_carousels_updated_at
  BEFORE UPDATE ON public.carousels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();