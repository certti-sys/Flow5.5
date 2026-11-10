// Mock Users para autenticação
export const mockUsers = [
  {
    id: "admin-1",
    name: "Admin MemberHero",
    email: "admin@memberhero.com",
    password: "admin123",
    role: "admin" as const,
    avatar: null
  },
  {
    id: "student-1",
    name: "João Silva",
    email: "joao@email.com",
    password: "123456",
    role: "student" as const,
    avatar: null
  }
];

export const dashboardMetrics = {
  totalRevenue: 48920,
  registeredStudents: 1204,
  activeCourses: 56,
  pendingEnrollments: 12,
  revenueChange: 5.2,
  studentsChange: 2.1,
  coursesChange: 3.5,
  pendingChange: -2,
};

export const salesData = [
  { day: "1", sales: 2400 },
  { day: "3", sales: 1800 },
  { day: "5", sales: 3200 },
  { day: "7", sales: 2800 },
  { day: "9", sales: 3600 },
  { day: "11", sales: 3100 },
  { day: "13", sales: 2900 },
  { day: "15", sales: 4200 },
  { day: "17", sales: 3800 },
  { day: "19", sales: 4500 },
  { day: "21", sales: 4100 },
  { day: "23", sales: 3700 },
  { day: "25", sales: 4800 },
  { day: "27", sales: 5200 },
  { day: "29", sales: 4900 },
  { day: "30", sales: 5100 },
];

export const topCourses = [
  {
    id: "1",
    name: "Desenvolvimento Web Avançado",
    thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=100&h=60&fit=crop",
    students: 450,
    revenue: 12500,
  },
  {
    id: "2",
    name: "Data Science Intensivo",
    thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=60&fit=crop",
    students: 320,
    revenue: 9800,
  },
  {
    id: "3",
    name: "Masterclass de UI/UX Design",
    thumbnail: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=100&h=60&fit=crop",
    students: 280,
    revenue: 8400,
  },
  {
    id: "4",
    name: "Marketing Digital Pro",
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=100&h=60&fit=crop",
    students: 210,
    revenue: 6300,
  },
  {
    id: "5",
    name: "Python para Iniciantes",
    thumbnail: "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=100&h=60&fit=crop",
    students: 180,
    revenue: 5400,
  },
];

export const recentActivities = [
  { id: 1, type: "enrollment", message: "New student enrolled in Advanced Web Development", time: "2 min ago" },
  { id: 2, type: "sale", message: "New sale: Data Science Bootcamp - $299", time: "15 min ago" },
  { id: 3, type: "completion", message: "Student completed UI/UX Design Masterclass", time: "1 hour ago" },
  { id: 4, type: "enrollment", message: "New student enrolled in Python for Beginners", time: "2 hours ago" },
];

// Sales metrics for sales page
export const salesMetrics = {
  totalRevenue: "R$ 87.450",
  revenueChange: 12.5,
  monthlySales: 156,
  salesChange: 8.3,
  averageTicket: "R$ 560",
  ticketChange: 4.2,
  conversionRate: "3.2%",
  conversionChange: 0.8,
};

// Revenue over time data
export const revenueOverTime = [
  { month: "Jan", revenue: 12500 },
  { month: "Fev", revenue: 15300 },
  { month: "Mar", revenue: 18200 },
  { month: "Abr", revenue: 16800 },
  { month: "Mai", revenue: 21400 },
  { month: "Jun", revenue: 19600 },
  { month: "Jul", revenue: 24700 },
  { month: "Ago", revenue: 22900 },
  { month: "Set", revenue: 26500 },
  { month: "Out", revenue: 28300 },
  { month: "Nov", revenue: 31200 },
  { month: "Dez", revenue: 34500 },
];

// Sales by source/platform
export const salesBySource = [
  { name: "Hotmart", value: 35200 },
  { name: "Eduzz", value: 22500 },
  { name: "Monetizze", value: 15800 },
  { name: "Kiwify", value: 9450 },
  { name: "Outros", value: 4500 },
];

// Transactions data
export const transactions = [
  {
    id: "TXN-2024-0156",
    student: "João Silva",
    course: "Web Design Avançado",
    amount: "R$ 497,00",
    status: "Pago",
    method: "Cartão de Crédito",
    date: "15/01/2024",
  },
  {
    id: "TXN-2024-0155",
    student: "Maria Santos",
    course: "Marketing Digital",
    amount: "R$ 697,00",
    status: "Pago",
    method: "PIX",
    date: "15/01/2024",
  },
  {
    id: "TXN-2024-0154",
    student: "Pedro Costa",
    course: "React Fundamentos",
    amount: "R$ 397,00",
    status: "Pendente",
    method: "Boleto",
    date: "14/01/2024",
  },
  {
    id: "TXN-2024-0153",
    student: "Ana Paula",
    course: "Python para Iniciantes",
    amount: "R$ 297,00",
    status: "Pago",
    method: "Cartão de Crédito",
    date: "14/01/2024",
  },
  {
    id: "TXN-2024-0152",
    student: "Carlos Eduardo",
    course: "UX/UI Design",
    amount: "R$ 597,00",
    status: "Cancelado",
    method: "Cartão de Crédito",
    date: "13/01/2024",
  },
  {
    id: "TXN-2024-0151",
    student: "Juliana Ferreira",
    course: "Marketing Digital",
    amount: "R$ 697,00",
    status: "Pago",
    method: "PIX",
    date: "13/01/2024",
  },
  {
    id: "TXN-2024-0150",
    student: "Roberto Alves",
    course: "Web Design Avançado",
    amount: "R$ 497,00",
    status: "Reembolsado",
    method: "Cartão de Crédito",
    date: "12/01/2024",
  },
  {
    id: "TXN-2024-0149",
    student: "Fernanda Lima",
    course: "React Fundamentos",
    amount: "R$ 397,00",
    status: "Pago",
    method: "Cartão de Débito",
    date: "12/01/2024",
  },
  {
    id: "TXN-2024-0148",
    student: "Lucas Mendes",
    course: "Python para Iniciantes",
    amount: "R$ 297,00",
    status: "Pago",
    method: "PIX",
    date: "11/01/2024",
  },
  {
    id: "TXN-2024-0147",
    student: "Patrícia Souza",
    course: "UX/UI Design",
    amount: "R$ 597,00",
    status: "Pago",
    method: "Cartão de Crédito",
    date: "11/01/2024",
  },
  {
    id: "TXN-2024-0146",
    student: "Ricardo Pereira",
    course: "Marketing Digital",
    amount: "R$ 697,00",
    status: "Pendente",
    method: "Boleto",
    date: "10/01/2024",
  },
  {
    id: "TXN-2024-0145",
    student: "Camila Rodrigues",
    course: "Web Design Avançado",
    amount: "R$ 497,00",
    status: "Pago",
    method: "PIX",
    date: "10/01/2024",
  },
  {
    id: "TXN-2024-0144",
    student: "Bruno Oliveira",
    course: "React Fundamentos",
    amount: "R$ 397,00",
    status: "Pago",
    method: "Cartão de Crédito",
    date: "09/01/2024",
  },
  {
    id: "TXN-2024-0143",
    student: "Daniela Costa",
    course: "Python para Iniciantes",
    amount: "R$ 297,00",
    status: "Cancelado",
    method: "Cartão de Crédito",
    date: "09/01/2024",
  },
  {
    id: "TXN-2024-0142",
    student: "Felipe Santos",
    course: "UX/UI Design",
    amount: "R$ 597,00",
    status: "Pago",
    method: "PIX",
    date: "08/01/2024",
  },
];
