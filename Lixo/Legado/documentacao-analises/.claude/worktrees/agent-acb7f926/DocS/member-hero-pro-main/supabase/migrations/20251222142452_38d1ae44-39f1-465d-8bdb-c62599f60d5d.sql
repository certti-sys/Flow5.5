-- Insert profiles for existing users
INSERT INTO profiles (user_id, email, name, status)
VALUES 
  ('3a8fb5ab-4f54-4f54-a0b8-3419134119d4', 'admin@memberhero.com', 'Administrador Teste', 'active'),
  ('1069815c-8c62-44ae-9ce3-135ecf8b5abd', 'aluno@memberhero.com', 'Aluno Teste', 'active')
ON CONFLICT (user_id) DO NOTHING;

-- Insert roles for existing users
INSERT INTO user_roles (user_id, role)
VALUES 
  ('3a8fb5ab-4f54-4f54-a0b8-3419134119d4', 'admin'),
  ('1069815c-8c62-44ae-9ce3-135ecf8b5abd', 'student')
ON CONFLICT (user_id, role) DO NOTHING;