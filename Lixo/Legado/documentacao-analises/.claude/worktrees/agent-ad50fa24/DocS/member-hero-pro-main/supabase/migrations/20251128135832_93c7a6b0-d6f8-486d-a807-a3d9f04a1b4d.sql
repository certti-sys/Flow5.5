-- Corrigir a função para ter search_path correto
CREATE OR REPLACE FUNCTION update_admin_notifications_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;