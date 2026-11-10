-- Add gradient color customization fields to platform_settings table
ALTER TABLE public.platform_settings 
ADD COLUMN gradient_start_color TEXT DEFAULT '#FF4136',
ADD COLUMN gradient_end_color TEXT DEFAULT '#FF851B';