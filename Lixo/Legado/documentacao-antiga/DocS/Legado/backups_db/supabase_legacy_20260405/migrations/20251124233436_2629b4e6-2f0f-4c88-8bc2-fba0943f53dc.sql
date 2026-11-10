-- Add show_card_overlay column to courses table
ALTER TABLE public.courses 
ADD COLUMN show_card_overlay BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.courses.show_card_overlay IS 'Controls whether to display title and instructor overlay on course cards. Set to false when thumbnail already contains this information.';