// Utilitário para criar dados de teste no localStorage
// Usado antes da migração para garantir que há dados para testar

export function createTestData() {
  const categories = [
    {
      id: 'cat-1',
      nome: 'Desenvolvimento Web',
      descricao: 'Cursos de programação e desenvolvimento',
      cor: '#D4AF37',
      ordem: 1,
    },
    {
      id: 'cat-2',
      nome: 'Design',
      descricao: 'Cursos de design e UX/UI',
      cor: '#F5D46E',
      ordem: 2,
    },
  ];

  const tags = [
    {
      id: 'tag-1',
      nome: 'JavaScript',
      descricao: 'Linguagem de programação',
      cor: '#D4AF37',
    },
    {
      id: 'tag-2',
      nome: 'React',
      descricao: 'Framework frontend',
      cor: '#F5D46E',
    },
  ];

  const courses = [
    {
      id: 'course-1',
      titulo: 'React Avançado',
      descricao: 'Aprenda React do zero ao avançado',
      imagem: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400',
      banner: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1200',
      status: 'Publicado',
      categoria: 'cat-1',
      tags: ['tag-1', 'tag-2'],
      checkoutUrl: 'https://exemplo.com/checkout/react-avancado',
      tagIntegracao: 'hotmart_react_avancado',
    },
    {
      id: 'course-2',
      titulo: 'UI/UX Design Completo',
      descricao: 'Domine design de interfaces modernas',
      imagem: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400',
      banner: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200',
      status: 'Publicado',
      categoria: 'cat-2',
      tags: [],
      checkoutUrl: 'https://exemplo.com/checkout/design',
      tagIntegracao: 'hotmart_design',
    },
  ];

  const modules = [
    {
      id: 'mod-1',
      nome: 'Módulo 1 - Fundamentos',
      descricao: 'Aprenda os fundamentos do React',
      cursoId: 'course-1',
      ordem: 1,
      status: 'Publicado',
      imagem: null,
    },
    {
      id: 'mod-2',
      nome: 'Módulo 2 - Hooks Avançados',
      descricao: 'Domine os hooks do React',
      cursoId: 'course-1',
      ordem: 2,
      status: 'Publicado',
      imagem: null,
    },
    {
      id: 'mod-3',
      nome: 'Módulo 1 - Introdução ao Design',
      descricao: 'Conceitos básicos de design',
      cursoId: 'course-2',
      ordem: 1,
      status: 'Publicado',
      imagem: null,
    },
  ];

  const lessons = [
    {
      id: 'lesson-1',
      nome: 'Aula 1 - O que é React?',
      descricao: 'Introdução ao React e seus conceitos',
      cursoId: 'course-1',
      moduloId: 'mod-1',
      tipo: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      arquivo: null,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300',
      ordem: 1,
      status: 'Publicado',
      materiaisExtras: null,
    },
    {
      id: 'lesson-2',
      nome: 'Aula 2 - Componentes',
      descricao: 'Criando seus primeiros componentes',
      cursoId: 'course-1',
      moduloId: 'mod-1',
      tipo: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      arquivo: null,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300',
      ordem: 2,
      status: 'Publicado',
      materiaisExtras: null,
    },
    {
      id: 'lesson-3',
      nome: 'Aula 1 - useState',
      descricao: 'Gerenciamento de estado com useState',
      cursoId: 'course-1',
      moduloId: 'mod-2',
      tipo: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      arquivo: null,
      thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=300',
      ordem: 1,
      status: 'Publicado',
      materiaisExtras: null,
    },
    {
      id: 'lesson-4',
      nome: 'Aula 1 - Princípios do Design',
      descricao: 'Fundamentos do design de interfaces',
      cursoId: 'course-2',
      moduloId: 'mod-3',
      tipo: 'video',
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      arquivo: null,
      thumbnail: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=300',
      ordem: 1,
      status: 'Publicado',
      materiaisExtras: null,
    },
  ];

  const shelves = [
    {
      id: 'shelf-1',
      titulo: 'Cursos em Destaque',
      ordem: 1,
      tipo: 'manual',
      ativo: true,
      cursosIds: ['course-1', 'course-2'],
    },
    {
      id: 'shelf-2',
      titulo: 'Desenvolvimento',
      ordem: 2,
      tipo: 'manual',
      ativo: true,
      cursosIds: ['course-1'],
    },
  ];

  const banner = {
    imagemUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=1920',
    exibir: true,
  };

  // Salvar no localStorage
  localStorage.setItem('memberhero_categories', JSON.stringify(categories));
  localStorage.setItem('memberhero_tags', JSON.stringify(tags));
  localStorage.setItem('mh_courses', JSON.stringify(courses));
  localStorage.setItem('memberhero_modulos', JSON.stringify(modules));
  localStorage.setItem('memberhero_aulas', JSON.stringify(lessons));
  localStorage.setItem('mh_shelves', JSON.stringify(shelves));
  localStorage.setItem('mh_banner_principal', JSON.stringify(banner));

  return {
    categories: categories.length,
    tags: tags.length,
    courses: courses.length,
    modules: modules.length,
    lessons: lessons.length,
    shelves: shelves.length,
    banner: 1,
  };
}

export function hasLocalStorageData(): boolean {
  const courses = localStorage.getItem('mh_courses');
  const modules = localStorage.getItem('memberhero_modulos');
  const lessons = localStorage.getItem('memberhero_aulas');
  
  try {
    const coursesData = courses ? JSON.parse(courses) : [];
    const modulesData = modules ? JSON.parse(modules) : [];
    const lessonsData = lessons ? JSON.parse(lessons) : [];
    
    return coursesData.length > 0 || modulesData.length > 0 || lessonsData.length > 0;
  } catch {
    return false;
  }
}

export function clearTestData() {
  const keys = [
    'memberhero_categories',
    'memberhero_tags',
    'mh_courses',
    'memberhero_modulos',
    'memberhero_aulas',
    'mh_shelves',
    'mh_banner_principal',
  ];
  
  keys.forEach(key => localStorage.removeItem(key));
}
