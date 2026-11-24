import { useParams, Link, useNavigate } from "react-router-dom";
import { LessonSidebar } from "@/components/LessonSidebar";
import { PageContainer } from "@/components/layout/PageContainer";
import { ArrowLeft, BookOpen, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasAccessToCourse } from "@/hooks/useHasAccessToCourse";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isLessonCompleted } = useUserProgress();

  // Scroll to top when page loads or courseId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [courseId]);

  // Fetch course with modules and lessons
  const { data: course, isLoading } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          modules (
            *,
            lessons (*)
          )
        `)
        .eq("id", courseId)
        .order("order_index", { foreignTable: "modules", ascending: true })
        .order("order_index", { foreignTable: "modules.lessons", ascending: true })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const modules = course?.modules || [];

  // Calculate course progress
  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);
  const completedLessons = modules.reduce((completed, module) => {
    return completed + (module.lessons?.filter((lesson: any) =>
      isLessonCompleted(lesson.id)
    ).length || 0);
  }, 0);
  const progressPercentage = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Check if user has access to this course
  const { hasAccess, loading: loadingAccess, failed: accessCheckFailed } = useHasAccessToCourse(courseId || null);

  // Módulos sem aulas não servem de ponto de entrada: a primeira aula pode
  // estar num módulo posterior. Antes, `modules[0]` vazio fazia o curso com
  // 100% de progresso cair em "Nenhuma aula disponível" e não redirecionar.
  const modulesWithLessons = modules.filter((module) => (module.lessons?.length || 0) > 0);
  const firstLesson = modulesWithLessons[0]?.lessons?.[0];
  const firstModule = modulesWithLessons[0];

  // Find current/next lesson to watch
  const findCurrentLesson = () => {
    // Se o progresso for 100%, retorne a primeira aula para re-assistir
    if (progressPercentage === 100 && firstLesson) {
      return { lesson: firstLesson, module: firstModule };
    }

    for (const module of modules) {
      for (const lesson of module.lessons || []) {
        if (!isLessonCompleted(lesson.id)) {
          return { lesson, module };
        }
      }
    }
    return { lesson: firstLesson, module: firstModule };
  };

  // Redirect based on access
  useEffect(() => {
    // Verify data is synced with current URL params before redirecting
    const isDataSynced = course?.id === courseId;

    // Only redirect after course data has loaded, is synced, and access verification is complete.
    // Se a verificação falhou, não redireciona: erro não é o mesmo que "sem acesso".
    if (isDataSynced && !isLoading && course && !loadingAccess && !accessCheckFailed && courseId) {
      if (hasAccess) {
        // Has access - redirect to first uncompleted lesson
        const { lesson } = findCurrentLesson();
        if (lesson) {
          navigate(`/aula/${lesson.id}`, { replace: true });
        }
      } else {
        // No access - redirect to info/purchase page
        navigate(`/curso/${courseId}/info`, { replace: true });
      }
    }
  }, [hasAccess, loadingAccess, accessCheckFailed, courseId, navigate, isLoading, course, modules]);

  const { lesson: currentLesson } = findCurrentLesson();

  // Enquanto a navegação não acontece, mantém o spinner: sem isso a visão
  // geral da página pisca por um instante antes da aula (ou da página de venda).
  const isRedirecting =
    !accessCheckFailed && (hasAccess ? !!currentLesson : !!course);

  if (isLoading || loadingAccess || isRedirecting) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Curso não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <main>
        <PageContainer className="py-6 md:py-8" wide>
          <div className="space-y-6">
            {/* Mesmo hero da página de aula: cabeçalho em glass-card dentro do
                container, não em faixa full-bleed. Assim um curso sem aulas
                publicadas não parece outro produto. */}
            <div className="glass-card relative overflow-hidden rounded-[24px] border-white/10">
              <div
                className="absolute inset-0 bg-cover bg-center opacity-40"
                style={{
                  backgroundImage: course.thumbnail ? `url(${course.thumbnail})` : undefined,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/70" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

              <div className="relative p-6 md:p-8">
                <div className="flex flex-col-reverse gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
                  <div className="space-y-3 max-w-3xl min-w-0">
                    {/* Category Badge */}
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs uppercase tracking-wider font-bold">
                      {course.category}
                    </Badge>

                    <h2 className="text-2xl md:text-3xl font-bold leading-tight tracking-tight">
                      {course.title}
                    </h2>

                    {course.description && (
                      <p className="text-muted-foreground text-[14px] line-clamp-2 max-w-2xl">
                        {course.description}
                      </p>
                    )}

                    {/* Meta Info */}
                    <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted-foreground pt-1">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-primary" />
                        <span>{course.instructor}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span>{totalLessons} aulas</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-primary" />
                        <span>{course.duration}</span>
                      </div>
                    </div>
                  </div>

                  <Link to="/dashboard" className="shrink-0 self-start relative z-20">
                    <Button
                      variant="outline"
                      className="glass-card bg-black/30 border-white/10 hover:bg-white/10 h-10 md:h-[44px] px-4 md:px-6 rounded-[12px] font-semibold text-[13px] tracking-tight"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Meus Cursos
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sem aula publicada não há o que reproduzir; quem tem aulas é
                  levado direto para a página da aula. */}
              <div className="lg:col-span-2">
                <div className="glass-card rounded-[24px] p-12 text-center border-white/10">
                  <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">
                    Nenhuma aula disponível ainda
                  </p>
                </div>
              </div>

              {/* Sidebar */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-6">
                  <LessonSidebar
                    modules={modules}
                    courseId={courseId || ""}
                    certificatesEnabled={course?.certificates_enabled === true}
                    certificateMinPercent={course?.certificate_min_percent ?? 100}
                  />
                </div>
              </div>
            </div>
          </div>
        </PageContainer>
      </main>
    </div>
  );
};

export default Course;
