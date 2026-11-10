import { DollarSign, Users, BookOpen, Clock, Bell, Plus, Settings } from "lucide-react";
import { MetricCard } from "@/components/admin/MetricCard";
import { SalesChart } from "@/components/admin/SalesChart";
import { TopCoursesCard } from "@/components/admin/TopCoursesCard";
import { dashboardMetrics } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { QuickSearch } from "@/components/admin/QuickSearch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { SyncIndicator } from "@/components/admin/SyncIndicator";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
export default function Dashboard() {
  const navigate = useNavigate();
  const {
    user,
    signOut
  } = useSupabaseAuth();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0
    }).format(value);
  };
  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };
  return <div className="space-y-6">
      {/* Header Customizado Premium */}
      <div className="glass-card p-6 rounded-xl border border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Lado Esquerdo - Título e Saudação */}
          <div className="flex-1 min-w-[250px]">
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Bem-vindo de volta! Aqui está um resumo da sua plataforma.
            </p>
          </div>

          {/* Centro - Busca Funcional */}
          <div className="hidden md:block">
            <QuickSearch />
          </div>

          {/* Lado Direito - Ações Rápidas */}
          <div className="flex items-center gap-2">
            {/* Atalho: Novo Curso */}
            <Button onClick={() => navigate('/admin/courses/new')} className="bg-primary hover:bg-primary/90 gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Novo Curso</span>
            </Button>

            {/* Configurações */}
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')} className="hover:bg-white/5 hover:text-primary">
              <Settings className="h-5 w-5" />
            </Button>

            {/* Sync Indicator */}
            <div className="hidden lg:flex">
              
            </div>

            {/* Notificações */}
            <Button variant="ghost" size="icon" className="relative hover:bg-white/5 hover:text-primary">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-primary rounded-full animate-pulse" />
            </Button>

            {/* Avatar com Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-9 w-9 cursor-pointer border-2 border-primary/30 hover:border-primary transition-colors">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                    {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'A'}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-black/95 border-white/10">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">
                    {user?.user_metadata?.name || 'Administrador'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={() => navigate('/admin/settings')} className="cursor-pointer focus:bg-white/5">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/admin/profile')} className="cursor-pointer focus:bg-white/5">
                  <Users className="h-4 w-4 mr-2" />
                  Minha Conta
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer focus:bg-red-500/10 text-red-400">
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mini-métricas inline */}
        <div className="flex items-center gap-6 mt-6 pt-6 border-t border-white/10 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-base">R$</span>
            <span className="text-white/60 text-sm">Receita:</span>
            <span className="text-primary font-bold text-lg">
              {formatCurrency(dashboardMetrics.totalRevenue)}
            </span>
          </div>
          <div className="h-6 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-white/60 text-sm">Alunos:</span>
            <span className="text-primary font-bold text-lg">
              {dashboardMetrics.registeredStudents.toLocaleString()}
            </span>
          </div>
          <div className="h-6 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-white/60 text-sm">Cursos:</span>
            <span className="text-primary font-bold text-lg">
              {dashboardMetrics.activeCourses}
            </span>
          </div>
          <div className="h-6 w-px bg-white/20 hidden sm:block" />
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-white/60 text-sm">Pendentes:</span>
            <span className="text-primary font-bold text-lg">
              {dashboardMetrics.pendingEnrollments}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Receita Total" value={formatCurrency(dashboardMetrics.totalRevenue)} change={dashboardMetrics.revenueChange} changeLabel="em relação ao mês anterior" icon={DollarSign} />
        <MetricCard title="Alunos Registrados" value={dashboardMetrics.registeredStudents.toLocaleString()} change={dashboardMetrics.studentsChange} changeLabel="em relação ao mês anterior" icon={Users} />
        <MetricCard title="Cursos Ativos" value={dashboardMetrics.activeCourses} change={dashboardMetrics.coursesChange} changeLabel="em relação ao mês anterior" icon={BookOpen} />
        <MetricCard title="Matrículas Pendentes" value={dashboardMetrics.pendingEnrollments} change={dashboardMetrics.pendingChange} changeLabel="requerem ação" icon={Clock} />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SalesChart />
        </div>
        <div className="lg:col-span-1">
          <TopCoursesCard />
        </div>
      </div>
    </div>;
}