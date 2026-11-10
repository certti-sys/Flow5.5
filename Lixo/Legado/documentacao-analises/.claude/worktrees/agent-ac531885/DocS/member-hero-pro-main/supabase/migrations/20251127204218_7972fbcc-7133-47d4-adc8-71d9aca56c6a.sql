-- Atualiza o role do usuário admin@memberhero.com para 'admin'
UPDATE user_roles 
SET role = 'admin' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@memberhero.com');

-- Se não existe role para esse usuário, insere
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM profiles
WHERE email = 'admin@memberhero.com'
AND NOT EXISTS (
  SELECT 1 FROM user_roles WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@memberhero.com')
);