-- Create user_course_categories table for category-based access control
CREATE TABLE public.user_course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, category)
);

-- Enable RLS
ALTER TABLE public.user_course_categories ENABLE ROW LEVEL SECURITY;

-- Users can view their own category access
CREATE POLICY "Users can view own course categories"
ON public.user_course_categories FOR SELECT
USING (auth.uid() = user_id);

-- Admins can manage all category access
CREATE POLICY "Admins can manage user_course_categories"
ON public.user_course_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create index for performance
CREATE INDEX idx_user_course_categories_user_id ON public.user_course_categories(user_id);
CREATE INDEX idx_user_course_categories_category ON public.user_course_categories(category);