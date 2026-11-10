import { useParams, Link, useNavigate } from "react-router-dom";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonSidebar } from "@/components/LessonSidebar";
import { ChevronLeft, Play, Clock, BookOpen, User, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useHasAccessToCourse } from "@/hooks/useHasAccessToCourse";
import { useUserProgress } from "@/hooks/useUserProgress";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { FileBadge, Loader2 } from "lucide-react";

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isLessonCompleted } = useUserProgress();
  const { user } = useAuth();
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

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
  const firstLesson = modules[0]?.lessons?.[0];

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
  const { hasAccess, loading: loadingAccess } = useHasAccessToCourse(courseId || null);

  // Find current/next lesson to watch
  const findCurrentLesson = () => {
    // Se o progresso for 100%, retorne a primeira aula para re-assistir
    if (progressPercentage === 100) {
       return { lesson: firstLesson, module: modules[0] };
    }

    for (const module of modules) {
      for (const lesson of module.lessons || []) {
        if (!isLessonCompleted(lesson.id)) {
          return { lesson, module };
        }
      }
    }
    return { lesson: firstLesson, module: modules[0] };
  };

  const handleGenerateCertificate = async () => {
    if (!user || !course) return;

    try {
      setIsGeneratingCertificate(true);
      
      // Checar se já existe um certificado para não duplicar
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .maybeSingle();

      if (existingCert) {
        navigate(`/certificado/${existingCert.id}`);
        return;
      }

      // Inserir novo certificado
      const { data: newCert, error } = await supabase
        .from('certificates')
        .insert({ user_id: user.id, course_id: course.id })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Certificado gerado com sucesso!");
      navigate(`/certificado/${newCert.id}`);

    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar certificado", { description: err.message });
    } finally {
      setIsGeneratingCertificate(false);
    }
  };

  // Redirect based on access
  useEffect(() => {
    // Verify data is synced with current URL params before redirecting
    const isDataSynced = course?.id === courseId;

    // Only redirect after course data has loaded, is synced, and access verification is complete
    if (isDataSynced && !isLoading && course && !loadingAccess && courseId) {
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
  }, [hasAccess, loadingAccess, courseId, navigate, isLoading, course, modules]);

  if (isLoading || loadingAccess) {
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


  const { lesson: currentLesson, module: currentModule } = findCurrentLesson();
  const currentLessonIndex = modules.reduce((count, mod) => {
    if (mod.id === currentModule?.id) {
      return count + (currentModule?.lessons?.findIndex((l: any) => l.id === currentLesson?.id) || 0) + 1;
    }
    return count + (mod.lessons?.length || 0);
  }, 0);

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        {/* Background with gradient overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: course.thumbnail ? `url(${course.thumbnail})` : undefined,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

        <div className="relative container mx-auto px-4 py-8 md:py-12">
          {/* Back Button */}
          <Link to="/dashboard" className="inline-block mb-6">
            <Button variant="ghost" size="sm" className="gap-2 hover:bg-white/10 text-muted-foreground hover:text-foreground">
              <ChevronLeft className="w-4 h-4" />
              Voltar para Meus Cursos
            </Button>
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div className="space-y-4 max-w-2xl animate-fade-in">
              {/* Category Badge */}
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                {course.category}
              </Badge>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                {course.title}
              </h1>

              {/* Description */}
              {course.description && (
                <p className="text-muted-foreground text-base md:text-lg line-clamp-2">
                  {course.description}
                </p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-primary" />
                  <span>{course.instructor}</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span>{totalLessons} aulas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{course.duration}</span>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            {progressPercentage > 0 && (
              <div className="glass-card rounded-xl p-4 md:p-5 min-w-[280px] animate-fade-in border border-white/[0.08]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Seu Progresso</p>
                    <p className="text-xl font-bold text-primary">{progressPercentage}%</p>
                  </div>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">
                  {completedLessons} de {totalLessons} aulas concluídas
                </p>
                {progressPercentage === 100 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <Button 
                      onClick={handleGenerateCertificate}
                      disabled={isGeneratingCertificate}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white shadow-glow-sm border-0 font-bold tracking-tight rounded-xl"
                    >
                      {isGeneratingCertificate ? (
                         <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                         <FileBadge className="w-4 h-4 mr-2" />
                      )}
                      Resgatar Certificado
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Video Section */}
          <div className="lg:col-span-2 space-y-5">
            {currentLesson ? (
              <>
                {/* Video Player */}
                <div className="rounded-xl overflow-hidden shadow-2xl shadow-black/20 animate-fade-in">
                  <VideoPlayer
                    videoUrl={currentLesson.video_url}
                    title={currentLesson.title}
                  />
                </div>

                {/* Current Lesson Info Card */}
                <div className="glass-card rounded-xl p-5 md:p-6 border border-white/[0.08] animate-fade-in">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="space-y-3 flex-1">
                      {/* Lesson Number Badge */}
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="text-xs font-medium border-primary/30 text-primary">
                          Aula {currentLessonIndex} de {totalLessons}
                        </Badge>
                        {progressPercentage > 0 && progressPercentage < 100 && (
                          <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-500 border-amber-500/30">
                            Continue de onde parou
                          </Badge>
                        )}
                      </div>

                      {/* Lesson Title */}
                      <h2 className="text-xl md:text-2xl font-bold tracking-tight">{currentLesson.title}</h2>

                      {/* Module Info */}
                      <p className="text-muted-foreground text-sm">
                        Módulo: {currentModule?.title}
                      </p>

                      {/* Lesson Description */}
                      {currentLesson.description && (
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {currentLesson.description}
                        </p>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Link to={`/aula/${currentLesson.id}`} className="flex-shrink-0">
                      <Button
                        size="lg"
                        className="w-full md:w-auto gradient-primary text-white hover:opacity-90 gap-2 shadow-lg shadow-primary/25 transition-all hover:scale-105"
                      >
                        <Play className="w-4 h-4" />
                        Assistir Aula
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Course Description Section */}
                {course.description && (
                  <div className="glass-card rounded-xl p-5 md:p-6 border border-white/[0.08] animate-fade-in">
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 tracking-tight">
                      <BookOpen className="w-5 h-5 text-primary" />
                      Sobre o Curso
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {course.description}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="glass-card rounded-xl p-12 text-center border border-white/[0.08]">
                <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  Nenhuma aula disponível ainda
                </p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 animate-fade-in">
            <div className="lg:sticky lg:top-6">
              <LessonSidebar modules={modules} courseId={courseId || ""} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Course;
