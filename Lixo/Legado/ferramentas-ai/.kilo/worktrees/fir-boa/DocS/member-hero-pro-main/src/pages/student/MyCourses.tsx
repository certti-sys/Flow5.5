import { useState, useMemo } from "react";
import { Search, BookOpen, Clock, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourses } from "@/hooks/useCourses";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useModules } from "@/hooks/useModules";
import { useLessons } from "@/hooks/useLessons";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function MyCourses() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  
  const { cursos, isLoading: loadingCourses } = useCourses();
  const { getAccessedCourses } = useStudentAccess();
  const { getCourseCompletionPercentage } = useStudentProgress();
  const { obterModulosPorCurso } = useModules();
  const { obterAulasPorModulo } = useLessons();
  
  const accessedCourseIds = getAccessedCourses();

  const filteredCourses = useMemo(() => {
    return cursos
      .filter(course => accessedCourseIds.includes(course.id))
      .filter(course => {
        const matchesSearch = course.titulo.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        const progress = getCourseCompletionPercentage(course.id, course.aulas || 0);
        if (statusFilter === "em-andamento") {
          return progress > 0 && progress < 100;
        } else if (statusFilter === "concluidos") {
          return progress === 100;
        }
        return true;
      });
  }, [cursos, accessedCourseIds, searchQuery, statusFilter, getCourseCompletionPercentage]);

  const stats = useMemo(() => {
    const total = accessedCourseIds.length;
    let inProgress = 0;
    let completed = 0;

    accessedCourseIds.forEach(courseId => {
      const course = cursos.find(c => c.id === courseId);
      if (!course) return;
      
      const progress = getCourseCompletionPercentage(courseId, course.aulas || 0);
      if (progress === 100) completed++;
      else if (progress > 0) inProgress++;
    });

    return { total, inProgress, completed };
  }, [accessedCourseIds, cursos, getCourseCompletionPercentage]);

  const obterPrimeiraAulaDoCurso = (courseId: string) => {
    const modulosDoCurso = obterModulosPorCurso(courseId)
      .filter(m => m.status === 'Publicado')
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    for (const modulo of modulosDoCurso) {
      const aulasDomModulo = obterAulasPorModulo(modulo.id)
        .filter(a => a.status === 'Publicado')
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      
      if (aulasDomModulo.length > 0) {
        return aulasDomModulo[0];
      }
    }
    
    return null;
  };

  const handleCourseClick = (courseId: string) => {
    const primeiraAula = obterPrimeiraAulaDoCurso(courseId);
    if (primeiraAula) {
      navigate(`/student/lesson/${primeiraAula.id}`);
    } else {
      toast.info("Este curso ainda não possui aulas disponíveis");
    }
  };

  // Skeleton loader
  if (loadingCourses) {
    return (
      <div className="min-h-screen bg-background pb-20 sm:pb-0">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl space-y-6">
          {/* Header skeleton */}
          <div>
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          
          {/* Stats skeleton */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-3 sm:p-4 rounded-xl">
                <Skeleton className="h-3 w-12 mb-2" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </div>
          
          {/* Filters skeleton */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="h-12 flex-1" />
            <Skeleton className="h-12 w-48" />
          </div>
          
          {/* Course cards skeleton */}
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass-card p-6 rounded-xl">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Skeleton className="w-full sm:w-28 md:w-40 h-24 sm:h-28 rounded-lg" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2 flex items-center gap-2 sm:gap-3">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary shrink-0" />
            Meus Cursos
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            Todos os cursos que você tem acesso
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <Card className="glass-card border-white/10">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-primary">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                Andamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-blue-400">{stats.inProgress}</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10">
            <CardHeader className="p-3 sm:p-4 pb-1 sm:pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
                Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-2xl sm:text-3xl font-bold text-green-400">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar curso..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12 bg-surface border-white/10"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[200px] h-12 bg-surface border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="em-andamento">Em andamento</SelectItem>
              <SelectItem value="concluidos">Concluídos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Courses List */}
        {filteredCourses.length === 0 ? (
          <Card className="glass-card border-white/10">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Nenhum curso encontrado
              </h3>
              <p className="text-muted-foreground text-center">
                {searchQuery ? "Tente ajustar os filtros de busca" : "Você ainda não tem cursos liberados"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 stagger-fade-in">
            {filteredCourses.map((course) => {
              const progress = getCourseCompletionPercentage(course.id, course.aulas || 0);
              const isCompleted = progress === 100;

              return (
                <Card key={course.id} className="glass-card border-white/10 hover:border-primary/50 transition-all">
                  <CardContent className="p-6">
                   <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6">
                      {/* Thumbnail */}
                      <div className="w-full sm:w-28 md:w-40 lg:w-48 h-24 sm:h-28 md:h-32 rounded-lg overflow-hidden bg-surface flex items-center justify-center shrink-0">
                        {course.imagem ? (
                          <OptimizedImage 
                            src={course.imagem} 
                            alt={course.titulo}
                            className="w-full h-full object-cover"
                            sizes="(max-width: 640px) 100vw, 200px"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <BookOpen className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-1 sm:mb-2">
                            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground line-clamp-2">
                              {course.titulo}
                            </h3>
                            {isCompleted && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 shrink-0 text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                <span className="hidden sm:inline">Concluído</span>
                                <span className="sm:hidden">✓</span>
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2 sm:mb-4 line-clamp-1 sm:line-clamp-2">
                            {course.descricao}
                          </p>
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-4">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              {course.modulos || 0} mód.
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              {course.aulas || 0} aulas
                            </span>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="space-y-1.5 sm:space-y-2">
                          <div className="flex items-center justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="text-primary font-semibold">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-1.5 sm:h-2 bg-white/10" />
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex items-center sm:justify-end mt-2 sm:mt-0">
                        <Button 
                          onClick={() => handleCourseClick(course.id)}
                          className="gold-button w-full sm:w-auto min-h-[44px] text-sm sm:text-base font-semibold"
                        >
                          {progress === 0 ? "Começar" : "Continuar"} →
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
