-- 1. Create lesson_materials table for supplementary content
CREATE TABLE public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('link', 'text', 'download', 'embed')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Make video_url and duration optional in lessons table
ALTER TABLE public.lessons 
  ALTER COLUMN video_url DROP NOT NULL,
  ALTER COLUMN duration DROP NOT NULL;

-- 3. Enable RLS on lesson_materials
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
CREATE POLICY "Anyone can view lesson materials" 
ON public.lesson_materials 
FOR SELECT 
USING (true);

CREATE POLICY "Admins manage lesson materials" 
ON public.lesson_materials 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Create index for performance
CREATE INDEX idx_lesson_materials_lesson_id ON public.lesson_materials(lesson_id);
CREATE INDEX idx_lesson_materials_order ON public.lesson_materials(lesson_id, order_index);