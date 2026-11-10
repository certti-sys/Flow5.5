-- =====================================================
-- MIGRATION: Adicionar Cursos Diversificados
-- Adiciona 4 categorias, 7 cursos, módulos, aulas, 2 shelves e acessos
-- =====================================================

-- 1. NOVAS CATEGORIAS (usando gen_random_uuid)
INSERT INTO categories (nome, descricao, cor, ordem) VALUES
  ('Design & Criativo', 'Cursos de design gráfico, UI/UX e criação visual', '#9B87F5', 3),
  ('Finanças & Investimentos', 'Educação financeira e investimentos', '#22C55E', 4),
  ('Produtividade', 'Gestão de tempo e organização', '#F97316', 5),
  ('Criação de Conteúdo', 'YouTube, podcasting e redes sociais', '#EC4899', 6);

-- 2. NOVOS CURSOS
INSERT INTO courses (titulo, descricao, categoria_id, status, imagem, banner, checkout_url) VALUES
  -- UI/UX Design Completo
  ('UI/UX Design Completo', 
   'Domine Figma, princípios de design e prototipagem profissional', 
   (SELECT id FROM categories WHERE nome = 'Design & Criativo' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1561070791-2526d30994b5',
   'https://images.unsplash.com/photo-1561070791-2526d30994b5',
   'https://checkout.example.com/uiux-design'),

  -- Photoshop do Zero ao Profissional
  ('Photoshop do Zero ao Profissional',
   'Edição de imagens, composição e efeitos avançados',
   (SELECT id FROM categories WHERE nome = 'Design & Criativo' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1572044162444-ad60f128bdea',
   'https://images.unsplash.com/photo-1572044162444-ad60f128bdea',
   'https://checkout.example.com/photoshop'),

  -- Investimentos para Iniciantes
  ('Investimentos para Iniciantes',
   'Renda fixa, ações e fundos imobiliários explicados',
   (SELECT id FROM categories WHERE nome = 'Finanças & Investimentos' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
   'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3',
   'https://checkout.example.com/investimentos'),

  -- Finanças Pessoais e Organização
  ('Finanças Pessoais e Organização',
   'Controle financeiro, planejamento e economia doméstica',
   (SELECT id FROM categories WHERE nome = 'Finanças & Investimentos' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f',
   'https://images.unsplash.com/photo-1554224155-6726b3ff858f',
   'https://checkout.example.com/financas-pessoais'),

  -- Produtividade Extrema
  ('Produtividade Extrema',
   'GTD, Pomodoro e gestão eficaz de projetos',
   (SELECT id FROM categories WHERE nome = 'Produtividade' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b',
   'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b',
   'https://checkout.example.com/produtividade'),

  -- YouTube de Sucesso
  ('YouTube de Sucesso',
   'Edição de vídeos, SEO e estratégias de monetização',
   (SELECT id FROM categories WHERE nome = 'Criação de Conteúdo' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0',
   'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0',
   'https://checkout.example.com/youtube'),

  -- Python para Iniciantes
  ('Python para Iniciantes',
   'Lógica de programação, automação e projetos práticos',
   (SELECT id FROM categories WHERE nome = 'Desenvolvimento' LIMIT 1),
   'Publicado',
   'https://images.unsplash.com/photo-1526379095098-d400fd0bf935',
   'https://images.unsplash.com/photo-1526379095098-d400fd0bf935',
   'https://checkout.example.com/python');

-- 3. MÓDULOS E AULAS

-- UI/UX Design Completo - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Fundamentos de UI/UX', 'Princípios básicos de design de interface', 1, 'Publicado'
FROM courses WHERE titulo = 'UI/UX Design Completo';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Figma na Prática', 'Dominando a ferramenta Figma', 2, 'Publicado'
FROM courses WHERE titulo = 'UI/UX Design Completo';

-- UI/UX Design Completo - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id,
  m.id,
  'O que é UI/UX?',
  'Introdução aos conceitos',
  'video',
  'https://www.youtube.com/watch?v=example1',
  1,
  'Publicado'
FROM courses c
JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'UI/UX Design Completo' AND m.nome = 'Fundamentos de UI/UX';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id,
  m.id,
  'Psicologia das Cores',
  'Teoria das cores aplicada',
  'video',
  'https://www.youtube.com/watch?v=example2',
  2,
  'Publicado'
FROM courses c
JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'UI/UX Design Completo' AND m.nome = 'Fundamentos de UI/UX';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id,
  m.id,
  'Interface do Figma',
  'Conhecendo o Figma',
  'video',
  'https://www.youtube.com/watch?v=example3',
  1,
  'Publicado'
FROM courses c
JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'UI/UX Design Completo' AND m.nome = 'Figma na Prática';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id,
  m.id,
  'Criando seu Primeiro Design',
  'Projeto prático',
  'video',
  'https://www.youtube.com/watch?v=example4',
  2,
  'Publicado'
FROM courses c
JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'UI/UX Design Completo' AND m.nome = 'Figma na Prática';

-- Photoshop - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Photoshop Básico', 'Ferramentas essenciais', 1, 'Publicado'
FROM courses WHERE titulo = 'Photoshop do Zero ao Profissional';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Edição Avançada', 'Técnicas profissionais', 2, 'Publicado'
FROM courses WHERE titulo = 'Photoshop do Zero ao Profissional';

-- Photoshop - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Introdução ao Photoshop', 'Conhecendo a interface', 'video',
  'https://www.youtube.com/watch?v=example5', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Photoshop do Zero ao Profissional' AND m.nome = 'Photoshop Básico';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Camadas e Máscaras', 'Trabalhando com camadas', 'video',
  'https://www.youtube.com/watch?v=example6', 2, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Photoshop do Zero ao Profissional' AND m.nome = 'Photoshop Básico';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Retoques Profissionais', 'Técnicas de retoque', 'video',
  'https://www.youtube.com/watch?v=example7', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Photoshop do Zero ao Profissional' AND m.nome = 'Edição Avançada';

-- Investimentos - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Conceitos Básicos', 'Fundamentos de investimentos', 1, 'Publicado'
FROM courses WHERE titulo = 'Investimentos para Iniciantes';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Renda Variável', 'Ações e fundos', 2, 'Publicado'
FROM courses WHERE titulo = 'Investimentos para Iniciantes';

-- Investimentos - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Por onde começar?', 'Primeiros passos', 'video',
  'https://www.youtube.com/watch?v=example8', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Investimentos para Iniciantes' AND m.nome = 'Conceitos Básicos';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Renda Fixa', 'Tesouro Direto e CDBs', 'video',
  'https://www.youtube.com/watch?v=example9', 2, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Investimentos para Iniciantes' AND m.nome = 'Conceitos Básicos';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Bolsa de Valores', 'Como investir em ações', 'video',
  'https://www.youtube.com/watch?v=example10', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Investimentos para Iniciantes' AND m.nome = 'Renda Variável';

-- Finanças Pessoais - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Controle Financeiro', 'Organizando suas finanças', 1, 'Publicado'
FROM courses WHERE titulo = 'Finanças Pessoais e Organização';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Planejamento', 'Metas e objetivos', 2, 'Publicado'
FROM courses WHERE titulo = 'Finanças Pessoais e Organização';

-- Finanças Pessoais - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Fluxo de Caixa', 'Controlando entradas e saídas', 'video',
  'https://www.youtube.com/watch?v=example11', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Finanças Pessoais e Organização' AND m.nome = 'Controle Financeiro';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Planilhas Financeiras', 'Ferramentas práticas', 'video',
  'https://www.youtube.com/watch?v=example12', 2, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Finanças Pessoais e Organização' AND m.nome = 'Controle Financeiro';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Reserva de Emergência', 'Como criar sua reserva', 'video',
  'https://www.youtube.com/watch?v=example13', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Finanças Pessoais e Organização' AND m.nome = 'Planejamento';

-- Produtividade - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Gestão de Tempo', 'Técnicas de produtividade', 1, 'Publicado'
FROM courses WHERE titulo = 'Produtividade Extrema';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Ferramentas', 'Apps e metodologias', 2, 'Publicado'
FROM courses WHERE titulo = 'Produtividade Extrema';

-- Produtividade - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Método Pomodoro', 'Técnica de foco', 'video',
  'https://www.youtube.com/watch?v=example14', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Produtividade Extrema' AND m.nome = 'Gestão de Tempo';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'GTD - Getting Things Done', 'Sistema de organização', 'video',
  'https://www.youtube.com/watch?v=example15', 2, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Produtividade Extrema' AND m.nome = 'Gestão de Tempo';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Notion para Produtividade', 'Organizando projetos', 'video',
  'https://www.youtube.com/watch?v=example16', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Produtividade Extrema' AND m.nome = 'Ferramentas';

-- YouTube - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Criando Conteúdo', 'Planejamento e gravação', 1, 'Publicado'
FROM courses WHERE titulo = 'YouTube de Sucesso';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Crescimento', 'SEO e monetização', 2, 'Publicado'
FROM courses WHERE titulo = 'YouTube de Sucesso';

-- YouTube - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Equipamento Inicial', 'O que você precisa', 'video',
  'https://www.youtube.com/watch?v=example17', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'YouTube de Sucesso' AND m.nome = 'Criando Conteúdo';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Roteiro e Gravação', 'Como gravar vídeos', 'video',
  'https://www.youtube.com/watch?v=example18', 2, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'YouTube de Sucesso' AND m.nome = 'Criando Conteúdo';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'SEO para YouTube', 'Rankeando seus vídeos', 'video',
  'https://www.youtube.com/watch?v=example19', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'YouTube de Sucesso' AND m.nome = 'Crescimento';

-- Python - Módulos
INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Python Básico', 'Fundamentos da linguagem', 1, 'Publicado'
FROM courses WHERE titulo = 'Python para Iniciantes';

INSERT INTO modules (curso_id, nome, descricao, ordem, status) 
SELECT id, 'Projetos Práticos', 'Aplicações reais', 2, 'Publicado'
FROM courses WHERE titulo = 'Python para Iniciantes';

-- Python - Aulas
INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Instalação e Setup', 'Preparando o ambiente', 'video',
  'https://www.youtube.com/watch?v=example20', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Python para Iniciantes' AND m.nome = 'Python Básico';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Variáveis e Tipos', 'Conceitos básicos', 'video',
  'https://www.youtube.com/watch?v=example21', 2, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Python para Iniciantes' AND m.nome = 'Python Básico';

INSERT INTO lessons (curso_id, modulo_id, nome, descricao, tipo, url, ordem, status)
SELECT 
  c.id, m.id, 'Automação com Python', 'Scripts úteis', 'video',
  'https://www.youtube.com/watch?v=example22', 1, 'Publicado'
FROM courses c JOIN modules m ON m.curso_id = c.id
WHERE c.titulo = 'Python para Iniciantes' AND m.nome = 'Projetos Práticos';

-- 4. NOVAS SHELVES
INSERT INTO shelves (titulo, tipo, ordem, ativo) VALUES
  ('Novidades', 'automatica', 3, true),
  ('Aprenda uma Nova Habilidade', 'manual', 4, true);

-- 5. CURSOS NA SHELF MANUAL (Aprenda uma Nova Habilidade)
INSERT INTO shelf_courses (shelf_id, course_id, ordem)
SELECT 
  s.id,
  c.id,
  CASE c.titulo
    WHEN 'UI/UX Design Completo' THEN 1
    WHEN 'Investimentos para Iniciantes' THEN 2
    WHEN 'Produtividade Extrema' THEN 3
    WHEN 'YouTube de Sucesso' THEN 4
    WHEN 'Python para Iniciantes' THEN 5
  END
FROM shelves s
CROSS JOIN courses c
WHERE s.titulo = 'Aprenda uma Nova Habilidade'
  AND c.titulo IN (
    'UI/UX Design Completo',
    'Investimentos para Iniciantes',
    'Produtividade Extrema',
    'YouTube de Sucesso',
    'Python para Iniciantes'
  );

-- 6. CONCEDER ACESSO AO ALUNO DE TESTE (aluno@memberhero.com)
INSERT INTO course_access (user_id, course_id, granted, granted_at)
SELECT 
  p.id,
  c.id,
  true,
  now()
FROM profiles p
CROSS JOIN courses c
WHERE p.email = 'aluno@memberhero.com'
  AND c.titulo IN (
    'UI/UX Design Completo',
    'Photoshop do Zero ao Profissional',
    'Investimentos para Iniciantes',
    'Finanças Pessoais e Organização',
    'Produtividade Extrema',
    'YouTube de Sucesso',
    'Python para Iniciantes'
  )
ON CONFLICT (user_id, course_id) DO NOTHING;