-- Add checkout_url column to courses table for external checkout links
ALTER TABLE courses ADD COLUMN checkout_url TEXT DEFAULT NULL;

COMMENT ON COLUMN courses.checkout_url IS 'External checkout URL (Hotmart, Eduzz, Kiwify, etc.) for course purchase';