export interface Course {
  id: string;
  title: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  category: string;
  instructor: string;
  duration: string;
  show_card_overlay?: boolean;
  show_category_badge?: boolean;
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  videoUrl: string;
  moduleId: string;
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  content: string;
  date: string;
}

export const mockCourses: Course[] = [
  {
    id: "1",
    title: "React Avançado - Do Zero ao Profissional",
    thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=450&fit=crop",
    progress: 65,
    totalLessons: 42,
    completedLessons: 27,
    category: "Desenvolvimento Web",
    instructor: "João Silva",
    duration: "12h 30min"
  },
  {
    id: "2",
    title: "UI/UX Design System Completo",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=450&fit=crop",
    progress: 40,
    totalLessons: 35,
    completedLessons: 14,
    category: "Design",
    instructor: "Maria Santos",
    duration: "10h 15min"
  },
  {
    id: "3",
    title: "TypeScript: Do Básico ao Avançado",
    thumbnail: "https://images.unsplash.com/photo-1587620962725-abab7fe55159?w=800&h=450&fit=crop",
    progress: 80,
    totalLessons: 28,
    completedLessons: 22,
    category: "Programação",
    instructor: "Carlos Mendes",
    duration: "8h 45min"
  },
  {
    id: "4",
    title: "Node.js & APIs RESTful",
    thumbnail: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&h=450&fit=crop",
    progress: 25,
    totalLessons: 38,
    completedLessons: 9,
    category: "Backend",
    instructor: "Ana Costa",
    duration: "14h 20min"
  },
  {
    id: "5",
    title: "Marketing Digital para Desenvolvedores",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=450&fit=crop",
    progress: 50,
    totalLessons: 24,
    completedLessons: 12,
    category: "Marketing",
    instructor: "Pedro Oliveira",
    duration: "6h 30min"
  },
  {
    id: "6",
    title: "Arquitetura de Software na Prática",
    thumbnail: "https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800&h=450&fit=crop",
    progress: 15,
    totalLessons: 45,
    completedLessons: 7,
    category: "Arquitetura",
    instructor: "Rafael Torres",
    duration: "16h 10min"
  }
];

export const mockModules: Record<string, Module[]> = {
  "1": [
    {
      id: "m1",
      title: "Fundamentos do React",
      lessons: [
        {
          id: "l1",
          title: "Introdução ao React e JSX",
          duration: "15:30",
          completed: true,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m1"
        },
        {
          id: "l2",
          title: "Components e Props",
          duration: "22:45",
          completed: true,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m1"
        },
        {
          id: "l3",
          title: "State e Lifecycle",
          duration: "28:15",
          completed: true,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m1"
        }
      ]
    },
    {
      id: "m2",
      title: "Hooks Avançados",
      lessons: [
        {
          id: "l4",
          title: "useState e useEffect na Prática",
          duration: "32:20",
          completed: true,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m2"
        },
        {
          id: "l5",
          title: "useContext e useReducer",
          duration: "38:50",
          completed: false,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m2"
        },
        {
          id: "l6",
          title: "Custom Hooks",
          duration: "25:30",
          completed: false,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m2"
        }
      ]
    },
    {
      id: "m3",
      title: "Performance e Otimização",
      lessons: [
        {
          id: "l7",
          title: "React.memo e useMemo",
          duration: "20:15",
          completed: false,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m3"
        },
        {
          id: "l8",
          title: "Code Splitting e Lazy Loading",
          duration: "26:40",
          completed: false,
          videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
          moduleId: "m3"
        }
      ]
    }
  ]
};

export const mockComments: Record<string, Comment[]> = {
  "l1": [
    {
      id: "c1",
      userName: "Lucas Ferreira",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lucas",
      content: "Excelente aula! Muito bem explicado, consegui entender todos os conceitos de JSX.",
      date: "2 dias atrás"
    },
    {
      id: "c2",
      userName: "Julia Martins",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Julia",
      content: "Poderia fazer um exemplo mais prático sobre props? Obrigada!",
      date: "1 dia atrás"
    },
    {
      id: "c3",
      userName: "Roberto Santos",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto",
      content: "Top demais! Já estou aplicando no meu projeto pessoal 🚀",
      date: "5 horas atrás"
    }
  ],
  "l4": [
    {
      id: "c4",
      userName: "Carla Souza",
      userAvatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carla",
      content: "Finalmente entendi a diferença entre useState e useEffect! Obrigada!",
      date: "3 dias atrás"
    }
  ]
};

export const mockUser = {
  name: "João Silva",
  email: "joao.silva@email.com",
  whatsapp: "+5511999999999",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Joao",
  role: "student",
  memberSince: "2024-01-15",
  stats: {
    completedCourses: 8,
    inProgressCourses: 3,
    totalLessonsWatched: 147,
    totalHoursWatched: 42
  }
};

export const mockAdminStats = {
  totalCourses: 24,
  totalStudents: 1847,
  activeStudents: 432,
  completionRate: 68
};
