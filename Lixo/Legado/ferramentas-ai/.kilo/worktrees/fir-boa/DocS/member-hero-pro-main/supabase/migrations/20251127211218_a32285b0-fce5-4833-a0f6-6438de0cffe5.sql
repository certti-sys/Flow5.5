-- Inserir categoria de exemplo se não existir
INSERT INTO categories (id, nome, descricao, cor, ordem)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Marketing Digital', 'Cursos de marketing e vendas online', '#D4AF37', 1),
  ('22222222-2222-2222-2222-222222222222', 'Desenvolvimento', 'Cursos de programação e tecnologia', '#F5D46E', 2)
ON CONFLICT (id) DO NOTHING;

-- Inserir cursos de exemplo
INSERT INTO courses (id, titulo, descricao, status, categoria_id, imagem, banner, checkout_url, tag_integracao)
VALUES 
  (
    '33333333-3333-3333-3333-333333333333',
    'Marketing Digital Avançado',
    'Aprenda estratégias avançadas de marketing digital para alavancar seu negócio online. Inclui SEO, tráfego pago, email marketing e muito mais.',
    'Publicado',
    '11111111-1111-1111-1111-111111111111',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=400&fit=crop',
    'https://pay.hotmart.com/exemplo-marketing',
    'HOTMART-MKT-001'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Desenvolvimento Web Full Stack',
    'Do zero ao avançado em desenvolvimento web. Aprenda HTML, CSS, JavaScript, React, Node.js e bancos de dados.',
    'Publicado',
    '22222222-2222-2222-2222-222222222222',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&h=400&fit=crop',
    'https://pay.kiwify.com.br/exemplo-dev',
    'KIWIFY-DEV-002'
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Gestão de Negócios Online',
    'Aprenda a gerenciar e escalar seu negócio digital. Estratégias de vendas, gestão de equipes e automações.',
    'Publicado',
    '11111111-1111-1111-1111-111111111111',
    'https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&h=400&fit=crop',
    'https://pay.eduzz.com/exemplo-gestao',
    'EDUZZ-GES-003'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir módulos para o curso de Marketing Digital
INSERT INTO modules (id, curso_id, nome, descricao, ordem, status, imagem)
VALUES 
  (
    '66666666-6666-6666-6666-666666666666',
    '33333333-3333-3333-3333-333333333333',
    'Fundamentos do Marketing Digital',
    'Aprenda os conceitos fundamentais do marketing digital moderno',
    1,
    'Publicado',
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=300&fit=crop'
  ),
  (
    '77777777-7777-7777-7777-777777777777',
    '33333333-3333-3333-3333-333333333333',
    'Tráfego Pago e Conversões',
    'Domine as estratégias de anúncios pagos e otimização de conversões',
    2,
    'Publicado',
    'https://images.unsplash.com/photo-1557838923-2985c318be48?w=400&h=300&fit=crop'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir módulos para o curso de Desenvolvimento Web
INSERT INTO modules (id, curso_id, nome, descricao, ordem, status, imagem)
VALUES 
  (
    '88888888-8888-8888-8888-888888888888',
    '44444444-4444-4444-4444-444444444444',
    'HTML, CSS e JavaScript',
    'Base sólida em desenvolvimento front-end',
    1,
    'Publicado',
    'https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&h=300&fit=crop'
  ),
  (
    '99999999-9999-9999-9999-999999999999',
    '44444444-4444-4444-4444-444444444444',
    'React e Desenvolvimento Moderno',
    'Construa aplicações modernas com React',
    2,
    'Publicado',
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=300&fit=crop'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir módulo para o curso de Gestão
INSERT INTO modules (id, curso_id, nome, descricao, ordem, status)
VALUES 
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '55555555-5555-5555-5555-555555555555',
    'Estratégias de Crescimento',
    'Técnicas para escalar seu negócio digital',
    1,
    'Publicado'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir aulas para o módulo Fundamentos do Marketing
INSERT INTO lessons (id, curso_id, modulo_id, nome, descricao, tipo, url, ordem, status, thumbnail)
VALUES 
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666',
    'Bem-vindo ao Curso',
    'Introdução ao curso e apresentação do conteúdo',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1,
    'Publicado',
    'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&h=225&fit=crop'
  ),
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666',
    'O que é Marketing Digital',
    'Conceitos fundamentais e pilares do marketing digital',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    2,
    'Publicado',
    'https://images.unsplash.com/photo-1432888622747-4eb9a8f2c293?w=400&h=225&fit=crop'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '33333333-3333-3333-3333-333333333333',
    '66666666-6666-6666-6666-666666666666',
    'Material Complementar - PDF',
    'Guia completo de marketing digital para download',
    'pdf',
    'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    3,
    'Publicado',
    'https://images.unsplash.com/photo-1544396821-4dd40b938ad3?w=400&h=225&fit=crop'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir aulas para o módulo Tráfego Pago
INSERT INTO lessons (id, curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
VALUES 
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '33333333-3333-3333-3333-333333333333',
    '77777777-7777-7777-7777-777777777777',
    'Introdução ao Tráfego Pago',
    'Como funcionam os anúncios pagos',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1,
    'Publicado'
  ),
  (
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '33333333-3333-3333-3333-333333333333',
    '77777777-7777-7777-7777-777777777777',
    'Configurando sua Primeira Campanha',
    'Passo a passo para criar anúncios eficientes',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    2,
    'Publicado'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir aulas para o módulo HTML, CSS e JavaScript
INSERT INTO lessons (id, curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
VALUES 
  (
    '10101010-1010-1010-1010-101010101010',
    '44444444-4444-4444-4444-444444444444',
    '88888888-8888-8888-8888-888888888888',
    'Introdução ao HTML5',
    'Estrutura básica e tags essenciais',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1,
    'Publicado'
  ),
  (
    '20202020-2020-2020-2020-202020202020',
    '44444444-4444-4444-4444-444444444444',
    '88888888-8888-8888-8888-888888888888',
    'CSS Moderno e Flexbox',
    'Estilização e layouts responsivos',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    2,
    'Publicado'
  ),
  (
    '30303030-3030-3030-3030-303030303030',
    '44444444-4444-4444-4444-444444444444',
    '88888888-8888-8888-8888-888888888888',
    'JavaScript Fundamentals',
    'Programação básica e manipulação do DOM',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    3,
    'Publicado'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir aulas para o módulo React
INSERT INTO lessons (id, curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
VALUES 
  (
    '40404040-4040-4040-4040-404040404040',
    '44444444-4444-4444-4444-444444444444',
    '99999999-9999-9999-9999-999999999999',
    'Introdução ao React',
    'Componentes, props e state',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1,
    'Publicado'
  ),
  (
    '50505050-5050-5050-5050-505050505050',
    '44444444-4444-4444-4444-444444444444',
    '99999999-9999-9999-9999-999999999999',
    'Hooks e Gerenciamento de Estado',
    'useState, useEffect e Context API',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    2,
    'Publicado'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir aula para o módulo Gestão
INSERT INTO lessons (id, curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
VALUES 
  (
    '60606060-6060-6060-6060-606060606060',
    '55555555-5555-5555-5555-555555555555',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Planejamento Estratégico',
    'Como criar um plano de crescimento sustentável',
    'video',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    1,
    'Publicado'
  )
ON CONFLICT (id) DO NOTHING;

-- Inserir shelves (prateleiras)
INSERT INTO shelves (id, titulo, tipo, ativo, ordem)
VALUES 
  (
    '70707070-7070-7070-7070-707070707070',
    'Cursos em Destaque',
    'automatica',
    true,
    1
  ),
  (
    '80808080-8080-8080-8080-808080808080',
    'Continue Aprendendo',
    'manual',
    true,
    2
  )
ON CONFLICT (id) DO NOTHING;

-- Vincular cursos à shelf manual
INSERT INTO shelf_courses (shelf_id, course_id, ordem)
VALUES 
  ('80808080-8080-8080-8080-808080808080', '33333333-3333-3333-3333-333333333333', 1),
  ('80808080-8080-8080-8080-808080808080', '44444444-4444-4444-4444-444444444444', 2)
ON CONFLICT DO NOTHING;

-- Conceder acesso ao aluno de teste para todos os cursos
INSERT INTO course_access (user_id, course_id, granted, granted_at)
SELECT 
  p.id,
  c.id::uuid,
  true,
  now()
FROM profiles p
CROSS JOIN (
  VALUES 
    ('33333333-3333-3333-3333-333333333333'),
    ('44444444-4444-4444-4444-444444444444'),
    ('55555555-5555-5555-5555-555555555555')
) AS c(id)
WHERE p.email = 'aluno@memberhero.com'
ON CONFLICT (user_id, course_id) DO UPDATE 
SET granted = true, granted_at = now();