-- Add source column to track enrollment origin
ALTER TABLE public.course_access 
ADD COLUMN source text DEFAULT 'admin';

-- Add comment for documentation
COMMENT ON COLUMN public.course_access.source IS 'Origin of enrollment: webhook, admin, import';