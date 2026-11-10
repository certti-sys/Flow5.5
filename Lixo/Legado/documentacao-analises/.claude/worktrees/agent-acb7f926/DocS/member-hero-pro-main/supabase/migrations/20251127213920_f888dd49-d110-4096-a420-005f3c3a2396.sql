-- ==========================================
-- MIGRATION: 30 Novos Cursos Completos
-- 30 cursos + 150 módulos + 750 aulas + 4 shelves
-- ==========================================

-- Variáveis para armazenar IDs
DO $$
DECLARE
  v_cat_marketing uuid;
  v_cat_dev uuid;
  v_cat_design uuid;
  v_cat_financas uuid;
  v_cat_produtividade uuid;
  v_cat_conteudo uuid;
  v_student_id uuid;
  
  -- Arrays para armazenar IDs dos cursos
  v_curso_ids uuid[];
  v_modulo_ids uuid[];
  
  v_curso_id uuid;
  v_modulo_id uuid;
  i integer;
  j integer;
  k integer;
  ordem_aula integer;
BEGIN
  -- Obter IDs das categorias existentes
  SELECT id INTO v_cat_marketing FROM categories WHERE nome = 'Marketing Digital' LIMIT 1;
  SELECT id INTO v_cat_dev FROM categories WHERE nome = 'Desenvolvimento' LIMIT 1;
  SELECT id INTO v_cat_design FROM categories WHERE nome = 'Design' LIMIT 1;
  SELECT id INTO v_cat_financas FROM categories WHERE nome = 'Finanças' LIMIT 1;
  SELECT id INTO v_cat_produtividade FROM categories WHERE nome = 'Produtividade' LIMIT 1;
  SELECT id INTO v_cat_conteudo FROM categories WHERE nome = 'Criação de Conteúdo' LIMIT 1;
  
  -- Obter ID do aluno de teste
  SELECT id INTO v_student_id FROM profiles WHERE email = 'aluno@memberhero.com' LIMIT 1;

  -- ==========================================
  -- CATEGORIA: MARKETING DIGITAL (5 cursos)
  -- ==========================================
  
  -- Curso 1: SEO Avançado
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'SEO Avançado para Negócios',
    'Domine técnicas avançadas de SEO e ranqueie seu site no Google',
    'Publicado',
    v_cat_marketing,
    'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?w=800',
    'https://pay.example.com/seo-avancado'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 2: Email Marketing
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Email Marketing que Converte',
    'Aprenda a criar campanhas de email que realmente vendem',
    'Publicado',
    v_cat_marketing,
    'https://images.unsplash.com/photo-1596526131083-e8c633c948d2?w=800',
    'https://pay.example.com/email-marketing'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 3: Copywriting
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Copywriting Persuasivo',
    'Escreva textos que convencem e vendem mais',
    'Publicado',
    v_cat_marketing,
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=800',
    'https://pay.example.com/copywriting'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 4: Tráfego Pago
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Tráfego Pago: Google e Meta Ads',
    'Domine as principais plataformas de anúncios pagos',
    'Publicado',
    v_cat_marketing,
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
    'https://pay.example.com/trafego-pago'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 5: Social Media
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Social Media Marketing',
    'Estratégias completas para redes sociais',
    'Publicado',
    v_cat_marketing,
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800',
    'https://pay.example.com/social-media'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);

  -- ==========================================
  -- CATEGORIA: DESENVOLVIMENTO (5 cursos)
  -- ==========================================
  
  -- Curso 6: JavaScript
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'JavaScript Moderno ES6+',
    'Aprenda JavaScript com as melhores práticas atuais',
    'Publicado',
    v_cat_dev,
    'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=800',
    'https://pay.example.com/javascript'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 7: React
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'React do Zero ao Avançado',
    'Construa aplicações web modernas com React',
    'Publicado',
    v_cat_dev,
    'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    'https://pay.example.com/react'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 8: Node.js
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Node.js e APIs REST',
    'Desenvolva backends escaláveis com Node.js',
    'Publicado',
    v_cat_dev,
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    'https://pay.example.com/nodejs'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 9: SQL
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'SQL e Banco de Dados',
    'Domine bancos de dados relacionais e SQL',
    'Publicado',
    v_cat_dev,
    'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=800',
    'https://pay.example.com/sql'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 10: Git
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Git e GitHub Profissional',
    'Controle de versão e colaboração em equipe',
    'Publicado',
    v_cat_dev,
    'https://images.unsplash.com/photo-1556075798-4825dfaaf498?w=800',
    'https://pay.example.com/git'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);

  -- ==========================================
  -- CATEGORIA: DESIGN & CRIATIVO (5 cursos)
  -- ==========================================
  
  -- Curso 11: Illustrator
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Adobe Illustrator Completo',
    'Crie ilustrações vetoriais profissionais',
    'Publicado',
    v_cat_design,
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800',
    'https://pay.example.com/illustrator'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 12: After Effects
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'After Effects para Motion',
    'Domine motion graphics e animações',
    'Publicado',
    v_cat_design,
    'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800',
    'https://pay.example.com/after-effects'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 13: Canva Pro
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Canva Pro para Negócios',
    'Design rápido e profissional sem complicação',
    'Publicado',
    v_cat_design,
    'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800',
    'https://pay.example.com/canva'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 14: Design de Logos
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Design de Logos e Identidade',
    'Crie identidades visuais memoráveis',
    'Publicado',
    v_cat_design,
    'https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=800',
    'https://pay.example.com/logos'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 15: Branding
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Branding e Posicionamento',
    'Construa marcas fortes e diferenciadas',
    'Publicado',
    v_cat_design,
    'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=800',
    'https://pay.example.com/branding'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);

  -- ==========================================
  -- CATEGORIA: FINANÇAS (5 cursos)
  -- ==========================================
  
  -- Curso 16: Day Trade
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Day Trade para Iniciantes',
    'Aprenda a operar na bolsa de valores',
    'Publicado',
    v_cat_financas,
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
    'https://pay.example.com/daytrade'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 17: Criptomoedas
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Criptomoedas e Blockchain',
    'Invista com segurança no mercado cripto',
    'Publicado',
    v_cat_financas,
    'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=800',
    'https://pay.example.com/cripto'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 18: Fundos Imobiliários
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Fundos Imobiliários na Prática',
    'Renda passiva com FIIs',
    'Publicado',
    v_cat_financas,
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
    'https://pay.example.com/fiis'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 19: Planejamento Financeiro
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Planejamento Financeiro Familiar',
    'Organize suas finanças e construa patrimônio',
    'Publicado',
    v_cat_financas,
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    'https://pay.example.com/planejamento'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 20: Imposto de Renda
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Imposto de Renda Sem Complicação',
    'Declare seu IR corretamente e economize',
    'Publicado',
    v_cat_financas,
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800',
    'https://pay.example.com/imposto'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);

  -- ==========================================
  -- CATEGORIA: PRODUTIVIDADE (5 cursos)
  -- ==========================================
  
  -- Curso 21: Notion
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Notion para Organização Total',
    'Organize toda sua vida com Notion',
    'Publicado',
    v_cat_produtividade,
    'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800',
    'https://pay.example.com/notion'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 22: Google Workspace
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Google Workspace Avançado',
    'Domine todas as ferramentas Google',
    'Publicado',
    v_cat_produtividade,
    'https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800',
    'https://pay.example.com/google'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 23: Gestão de Projetos
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Gestão de Projetos Ágeis',
    'Metodologias ágeis na prática',
    'Publicado',
    v_cat_produtividade,
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    'https://pay.example.com/projetos'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 24: Liderança
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Liderança e Gestão de Equipes',
    'Seja um líder inspirador e eficaz',
    'Publicado',
    v_cat_produtividade,
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800',
    'https://pay.example.com/lideranca'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 25: Oratória
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Oratória e Apresentações',
    'Fale em público com confiança',
    'Publicado',
    v_cat_produtividade,
    'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800',
    'https://pay.example.com/oratoria'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);

  -- ==========================================
  -- CATEGORIA: CRIAÇÃO DE CONTEÚDO (5 cursos)
  -- ==========================================
  
  -- Curso 26: TikTok
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'TikTok para Negócios',
    'Crie conteúdo viral no TikTok',
    'Publicado',
    v_cat_conteudo,
    'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=800',
    'https://pay.example.com/tiktok'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 27: Instagram Reels
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Instagram Reels que Viralizam',
    'Domine o algoritmo dos Reels',
    'Publicado',
    v_cat_conteudo,
    'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800',
    'https://pay.example.com/reels'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 28: Podcast
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Como Criar um Podcast de Sucesso',
    'Do planejamento à monetização',
    'Publicado',
    v_cat_conteudo,
    'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=800',
    'https://pay.example.com/podcast'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 29: Edição de Vídeo
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Edição de Vídeo com Premiere',
    'Edite vídeos profissionais',
    'Publicado',
    v_cat_conteudo,
    'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800',
    'https://pay.example.com/premiere'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);
  
  -- Curso 30: Streaming
  INSERT INTO courses (titulo, descricao, status, categoria_id, imagem, checkout_url)
  VALUES (
    'Streaming e Lives Profissionais',
    'Configure seu setup de streaming',
    'Publicado',
    v_cat_conteudo,
    'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?w=800',
    'https://pay.example.com/streaming'
  ) RETURNING id INTO v_curso_id;
  v_curso_ids := array_append(v_curso_ids, v_curso_id);

  -- ==========================================
  -- CRIAR MÓDULOS E AULAS (150 módulos + 750 aulas)
  -- ==========================================
  
  FOR i IN 1..30 LOOP
    v_curso_id := v_curso_ids[i];
    
    -- Criar 5 módulos para cada curso
    FOR j IN 1..5 LOOP
      INSERT INTO modules (
        nome,
        descricao,
        curso_id,
        ordem,
        status
      ) VALUES (
        'Módulo ' || j || ' - ' || 
        CASE j
          WHEN 1 THEN 'Fundamentos'
          WHEN 2 THEN 'Conceitos Intermediários'
          WHEN 3 THEN 'Técnicas Avançadas'
          WHEN 4 THEN 'Projetos Práticos'
          WHEN 5 THEN 'Masterclass e Cases'
        END,
        'Conteúdo detalhado do módulo ' || j,
        v_curso_id,
        j,
        'Publicado'
      ) RETURNING id INTO v_modulo_id;
      
      -- Criar 5 aulas para cada módulo
      FOR k IN 1..5 LOOP
        INSERT INTO lessons (
          nome,
          descricao,
          tipo,
          url,
          curso_id,
          modulo_id,
          ordem,
          status
        ) VALUES (
          'Aula ' || k || ' - ' ||
          CASE k
            WHEN 1 THEN 'Introdução ao Tema'
            WHEN 2 THEN 'Conceitos Essenciais'
            WHEN 3 THEN 'Aplicação Prática'
            WHEN 4 THEN 'Exercícios e Desafios'
            WHEN 5 THEN 'Revisão e Próximos Passos'
          END,
          'Conteúdo completo da aula ' || k || ' do módulo ' || j,
          'video',
          'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          v_curso_id,
          v_modulo_id,
          k,
          'Publicado'
        );
      END LOOP;
    END LOOP;
  END LOOP;

  -- ==========================================
  -- CRIAR NOVAS SHELVES TEMÁTICAS
  -- ==========================================
  
  INSERT INTO shelves (titulo, tipo, ordem, ativo)
  VALUES 
    ('Desenvolvimento & Tech', 'automatica', 5, true),
    ('Negócios & Marketing', 'automatica', 6, true),
    ('Criatividade & Design', 'automatica', 7, true),
    ('Mais Populares', 'manual', 8, true);

  -- ==========================================
  -- CONCEDER ACESSO AO ALUNO DE TESTE
  -- ==========================================
  
  FOR i IN 1..30 LOOP
    INSERT INTO course_access (user_id, course_id, granted, granted_at)
    VALUES (v_student_id, v_curso_ids[i], true, now());
  END LOOP;

  RAISE NOTICE 'Migration completa: 30 cursos, 150 módulos, 750 aulas, 4 shelves criados!';
END $$;