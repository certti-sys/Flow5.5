import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Edit, BarChart3, Users, BookOpen, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Admin = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if user is admin
  const { data: isAdmin, isLoading: isCheckingAdmin } = useQuery({
    queryKey: ["isAdmin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      return !!data;
    },
    enabled: !!user,
  });

  // Redirect if not admin
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      toast.error("Acesso negado. Você precisa ser administrador.");
      navigate("/dashboard");
    }
  }, [isAdmin, isCheckingAdmin, navigate]);

  // Fetch courses
  const { data: courses = [] } = useQuery({
    queryKey: ["adminCourses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  // Fetch total students (users)
  const { data: totalStudents = 0 } = useQuery({
    queryKey: ["totalStudents"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
  });

  // Fetch active students (with progress)
  const { data: activeStudents = 0 } = useQuery({
    queryKey: ["activeStudents"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("user_progress")
        .select("user_id", { count: "distinct", head: true });
      
      if (error) throw error;
      return count || 0;
    },
    enabled: isAdmin,
  });

  // Fetch general completion rate
  const { data: completionRate = 0 } = useQuery({
    queryKey: ["completionRate"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("progress_percent");
      
      if (error) throw error;
      if (!data || data.length === 0) return 0;
      
      const total = data.reduce((sum, item) => sum + (item.progress_percent || 0), 0);
      return Math.round(total / data.length);
    },
    enabled: isAdmin,
  });

  const handleEditCourse = (courseId: string) => {
    toast.info(`Editar curso ${courseId} (em desenvolvimento)`);
  };

  const handleAddCourse = () => {
    toast.info("Adicionar novo curso (em desenvolvimento)");
  };

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Painel Administrativo
            </h1>
            <p className="text-muted-foreground">
              Gerencie cursos, alunos e acompanhe o progresso
            </p>
          </div>

          <Button
            onClick={handleAddCourse}
            className="gradient-primary text-white hover:opacity-90 gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Curso
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Cursos
              </CardTitle>
              <BookOpen className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{courses.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Cursos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Alunos
              </CardTitle>
              <Users className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{totalStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Usuários cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alunos Ativos
              </CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeStudents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {totalStudents > 0 ? Math.round((activeStudents / totalStudents) * 100) : 0}% do total
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conclusão
              </CardTitle>
              <BarChart3 className="w-4 h-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{completionRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Média geral
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Courses Table */}
        <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-xl font-bold">Gerenciar Cursos</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold">
                    Curso
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold hidden md:table-cell">
                    Categoria
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold hidden lg:table-cell">
                    Instrutor
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold hidden sm:table-cell">
                    Duração
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {courses.map((course: any) => (
                  <tr
                    key={course.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-16 h-9 object-cover rounded"
                        />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{course.title}</p>
                          <p className="text-sm text-muted-foreground md:hidden">
                            {course.category}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded-full">
                        {course.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden lg:table-cell">
                      {course.instructor}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                      {course.duration}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCourse(course.id)}
                          className="hover:bg-white/5"
                        >
                          <Edit className="w-4 h-4" />
                          <span className="hidden sm:inline ml-2">Editar</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Admin;
