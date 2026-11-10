-- Corrigir função do trigger para incluir search_path
CREATE OR REPLACE FUNCTION update_lesson_comments_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;