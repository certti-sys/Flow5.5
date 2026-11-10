-- Flow 5.1 - Seed Data
-- Last Export: 2026-04-06

-- 1. Courses
INSERT INTO public.courses (id, title, thumbnail, category, instructor, duration, description, show_card_overlay, checkout_url)
VALUES 
('02bfa637-dbd7-4a34-b158-564617255015', 'Criando Modulos', 'https://lznckhxqbkqldedlmbfb.supabase.co/storage/v1/object/public/course-thumbnails/ea36fe9d-ee7e-4cef-acfd-3a6a97c30744.png', 'Desenvolvimento Web', 'Flow Members', '30min', 'Crie modulos para seu curso', true, 'https://pay.flowmembers.app/checkouts/flowmembers/'),
('7cff2930-cfd0-45d6-87fd-6454d3f21c58', 'Configurando acesso ao curso', 'https://lznckhxqbkqldedlmbfb.supabase.co/storage/v1/object/public/course-thumbnails/b78378ef-feb6-4694-8eb7-46e110b8233a.png', 'Desenvolvimento Web', 'Flow Members', '8h', '', true, 'https://pay.flowmembers.app/checkouts/flowmembers/'),
('550e8400-e29b-41d4-a716-446655440001', 'Fundamentos do React', 'https://lznckhxqbkqldedlmbfb.supabase.co/storage/v1/object/public/course-thumbnails/ba11f036-6e3d-4a15-92f4-c470b074efa2.png', 'Desenvolvimento Web', 'João Silva', '8h', 'Aprenda os fundamentos do React, incluindo componentes, hooks e estado.', false, ''),
('550e8400-e29b-41d4-a716-446655440003', 'Design UI/UX Avançado', 'https://lznckhxqbkqldedlmbfb.supabase.co/storage/v1/object/public/course-thumbnails/f72644b3-f23f-42cd-bfc7-14743a0a86dd.webp', 'Design', 'Pedro Costa', '10h', 'Crie interfaces incríveis com princípios avançados de UI/UX Design.', false, ''),
('dc17d040-9c18-4fb9-aace-c049054049ee', 'Instalando a Flow Members', 'https://lznckhxqbkqldedlmbfb.supabase.co/storage/v1/object/public/course-thumbnails/8ca59d50-c621-484f-addf-f3c79ad19f5b.jpg', 'Desenvolvimento Web', 'Flow Members', '8h', 'Instalação simples, sem complicaçoes', true, 'https://pay.flowmembers.app/checkouts/flowmembers/'),
('550e8400-e29b-41d4-a716-446655440002', 'Python para Data Science', 'https://lznckhxqbkqldedlmbfb.supabase.co/storage/v1/object/public/course-thumbnails/b529abbd-1895-46af-9d21-8c75ff41f0ab.png', 'Data Science', 'Maria Santos', '12h', 'Domine Python e suas bibliotecas para análise e visualização de dados.', true, '')
ON CONFLICT (id) DO NOTHING;

-- 2. Platform Settings
INSERT INTO public.platform_settings (id, logo_text, banner_title_line1, banner_title_line2, banner_subtitle, is_active)
VALUES 
('9e8837e2-406f-4559-b3e8-8086f301f3fe', 'Flow 5.1', 'Inspire-se,', 'Cresça.', 'Acesse cursos premium e transforme seu conhecimento em resultados.', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Theme Settings (Active)
INSERT INTO public.theme_settings (id, primary_color, color_palette, is_active)
VALUES 
('3535f517-798c-43d9-b2fd-a6135d44d30a', '#802dd2', '{"50": "270 59% 97%", "100": "270 62% 94%", "200": "270 64% 87%", "300": "270 65% 77%", "400": "270 65% 62%", "500": "270 65% 50%", "600": "270 62% 45%", "700": "270 59% 38%", "800": "270 55% 28%", "900": "270 52% 21%", "950": "270 49% 12%"}', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Anonymized Profiles (Examples)
-- Note: In a real restore, auth.users must be created first via Supabase Auth API
-- These are for the public.profiles table reference
INSERT INTO public.profiles (id, name, email, whatsapp, status)
VALUES 
('5a96d5f4-131d-4ff9-b1ac-c6fd6866f024', 'Aluno Teste 1', 'aluno1@example.com', '5511999999999', 'active'),
('9376bccd-c926-4e4e-9b65-7a146b08f9ff', 'Aluno Teste 2', 'aluno2@example.com', '5511888888888', 'active')
ON CONFLICT (id) DO NOTHING;

-- 5. Lessons (Partial)
INSERT INTO public.lessons (id, title, duration, video_url, order_index, is_public)
VALUES
('750e8400-e29b-41d4-a716-446655440001', 'O que é React?', '12:30', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 1, true),
('750e8400-e29b-41d4-a716-446655440002', 'Configurando o Ambiente', '15:45', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 2, true)
ON CONFLICT (id) DO NOTHING;
