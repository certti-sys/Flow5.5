-- ============================================
-- SQL PARA POPULAR O BANCO COM CURSOS DE EXEMPLO
-- Execute este SQL no SQL Editor do Supabase
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
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- INSERIR MÓDULOS
INSERT INTO public.modules (id, course_id, title, order_index, created_at)
VALUES
  -- Módulos do Curso 1: React
  ('650e8400-e29b-41d4-a716-446655440001'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Introdução ao React', 1, NOW()),
  ('650e8400-e29b-41d4-a716-446655440002'::uuid, '550e8400-e29b-41d4-a716-446655440001'::uuid, 'Componentes e Props', 2, NOW()),
  
  -- Módulos do Curso 2: Python
  ('650e8400-e29b-41d4-a716-446655440003'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'Fundamentos do Python', 1, NOW()),
  ('650e8400-e29b-41d4-a716-446655440004'::uuid, '550e8400-e29b-41d4-a716-446655440002'::uuid, 'Análise de Dados', 2, NOW()),
  
  -- Módulos do Curso 3: Design
  ('650e8400-e29b-41d4-a716-446655440005'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'Princípios de Design', 1, NOW()),
  ('650e8400-e29b-41d4-a716-446655440006'::uuid, '550e8400-e29b-41d4-a716-446655440003'::uuid, 'Prototipagem Avançada', 2, NOW())
ON CONFLICT (id) DO NOTHING;

-- INSERIR AULAS
INSERT INTO public.lessons (id, module_id, title, duration, video_url, order_index, created_at)
VALUES
  -- Aulas do Módulo 1 (Introdução ao React)
  ('750e8400-e29b-41d4-a716-446655440001'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'O que é React?', '12:30', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440002'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Configurando o Ambiente', '15:45', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440003'::uuid, '650e8400-e29b-41d4-a716-446655440001'::uuid, 'Primeiro Componente', '18:20', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW()),
  
  -- Aulas do Módulo 2 (Componentes e Props)
  ('750e8400-e29b-41d4-a716-446655440004'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, 'Entendendo Props', '14:15', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440005'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, 'State vs Props', '16:30', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440006'::uuid, '650e8400-e29b-41d4-a716-446655440002'::uuid, 'Composição de Componentes', '20:10', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW()),
  
  -- Aulas do Módulo 3 (Fundamentos do Python)
  ('750e8400-e29b-41d4-a716-446655440007'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 'Introdução ao Python', '10:25', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440008'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 'Estruturas de Dados', '22:40', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440009'::uuid, '650e8400-e29b-41d4-a716-446655440003'::uuid, 'Funções e Módulos', '19:15', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW()),
  
  -- Aulas do Módulo 4 (Análise de Dados)
  ('750e8400-e29b-41d4-a716-446655440010'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, 'Pandas Básico', '25:30', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440011'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, 'Visualização com Matplotlib', '21:45', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440012'::uuid, '650e8400-e29b-41d4-a716-446655440004'::uuid, 'Machine Learning Introdução', '28:20', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW()),
  
  -- Aulas do Módulo 5 (Princípios de Design)
  ('750e8400-e29b-41d4-a716-446655440013'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, 'Fundamentos do Design', '13:50', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440014'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, 'Teoria das Cores', '17:35', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440015'::uuid, '650e8400-e29b-41d4-a716-446655440005'::uuid, 'Tipografia Avançada', '19:40', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW()),
  
  -- Aulas do Módulo 6 (Prototipagem)
  ('750e8400-e29b-41d4-a716-446655440016'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, 'Wireframes e Sketches', '16:20', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, NOW()),
  ('750e8400-e29b-41d4-a716-446655440017'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, 'Prototipagem no Figma', '24:55', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, NOW()),
  ('750e8400-e29b-41d4-a716-446655440018'::uuid, '650e8400-e29b-41d4-a716-446655440006'::uuid, 'Testes de Usabilidade', '22:30', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 3, NOW())
ON CONFLICT (id) DO NOTHING;

-- Verificar os dados inseridos
SELECT 
  (SELECT COUNT(*) FROM public.courses) as total_courses,
  (SELECT COUNT(*) FROM public.modules) as total_modules,
  (SELECT COUNT(*) FROM public.lessons) as total_lessons;
