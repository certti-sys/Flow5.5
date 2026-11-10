-- Add cards_per_view_tablet column to carousels table
ALTER TABLE public.carousels 
ADD COLUMN cards_per_view_tablet INTEGER NOT NULL DEFAULT 3;