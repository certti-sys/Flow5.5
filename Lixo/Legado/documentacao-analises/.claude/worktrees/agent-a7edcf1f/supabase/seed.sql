-- ============================================
-- SQL PARA POPULAR O BANCO COM CURSOS DE EXEMPLO
-- ============================================

-- INSERIR CURSOS
INSERT INTO public.courses (id, title, thumbnail, category, instructor, duration, description, created_at, updated_at)
VALUES
  (
    '550e8400-e29b-41d4-a716-446655440001'::uuid,
    'Fundamentos do React',
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=1200&fit=crop',
    'Desenvolvimento Web',
    'João Silva',
    '8h',
    'Aprenda os fundamentos do React, incluindo componentes, hooks e estado.',
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440002'::uuid,
    'Python para Data Science',
    'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=800&h=1200&fit=crop',
    'Data Science',
    'Maria Santos',
    '12h',
    'Domine Python e suas bibliotecas para análise e visualização de dados.',
    NOW(),
    NOW()
  ),
  (
    '550e8400-e29b-41d4-a716-446655440003'::uuid,
    'Design UI/UX Avançado',
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=1200&fit=crop',
    'Design',
    'Pedro Costa',
    '10h',
    'Crie interfaces incríveis com princípios avançados de UI/UX Design.',
    NOW(),    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- INSERIR MÓDULOS
INSERT INTO public.modules (id, course_id, title, order_index, created_at)
VALUES
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Introdução ao React', 1, NOW()),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Componentes e Props', 2, NOW()),
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'Fundamentos do Python', 1, NOW()),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'Análise de Dados', 2, NOW()),
  ('650e8400-e29b-41d4-a716-446655440005'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'Princípios de Design', 1, NOW()),
  ('650e8400-e29b-41d4-a716-446655440006'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'Prototipagem Avançada', 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- INSERIR AULAS
INSERT INTO public.lessons (id, module_id, title, duration, video_url, order_index, created_at)
VALUES
  ('750e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'O que é React?', '12:30', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Configurando o Ambiente', '15:45', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Primeiro Componente', '18:20', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW())
ON CONFLICT (id) DO NOTHING;
