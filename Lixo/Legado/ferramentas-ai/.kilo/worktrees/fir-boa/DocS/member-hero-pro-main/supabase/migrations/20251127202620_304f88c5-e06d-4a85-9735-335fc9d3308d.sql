-- Função para promover usuário a admin
CREATE OR REPLACE FUNCTION promote_to_admin(user_email TEXT)
RETURNS void AS $$
BEGIN
  UPDATE user_roles 
  SET role = 'admin' 
  WHERE user_id = (SELECT id FROM profiles WHERE email = user_email);
  
  -- Se não existe role para esse usuário, insere
  IF NOT FOUND THEN
    INSERT INTO user_roles (user_id, role)
    SELECT id, 'admin'::app_role
    FROM profiles
    WHERE email = user_email;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Promover automaticamente admin@memberhero.com se existir
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM profiles WHERE email = 'admin@memberhero.com') THEN
    PERFORM promote_to_admin('admin@memberhero.com');
  END IF;
END $$;