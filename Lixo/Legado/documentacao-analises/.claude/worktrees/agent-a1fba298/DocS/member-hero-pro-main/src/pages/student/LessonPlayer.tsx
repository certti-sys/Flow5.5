import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCourses } from "@/hooks/useCourses";
import { useModules } from "@/hooks/useModules";
import { useLessons } from "@/hooks/useLessons";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { LessonTopBar } from "@/components/student/lesson/LessonTopBar";
import { LessonVideoPlayer } from "@/components/student/lesson/LessonVideoPlayer";
import { LessonMaterials } from "@/components/student/lesson/LessonMaterials";
import { CourseSidebar } from "@/components/student/lesson/CourseSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

export default function LessonPlayer() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { aulas, isLoading: loadingLessons } = useLessons();
  const { modulos, isLoading: loadingModules } = useModules();
  const { cursos, isLoading: loadingCourses } = useCourses();
  const { progress, markLessonComplete, isLoading: loadingProgress } = useStudentProgress();

  const aulaAtual = aulas.find((a) => a.id === lessonId);
  const moduloAtual = modulos.find((m) => m.id === aulaAtual?.moduloId);
  const cursoAtual = cursos.find((c) => c.id === aulaAtual?.cursoId);

  // Organizar módulos com suas aulas
  const modulosComAulas = modulos
    .filter((m) => m.cursoId === cursoAtual?.id)
    .map((m) => ({
      ...m,
      aulas: aulas.filter((a) => a.moduloId === m.id && a.status === "Publicado"),
    }))
    .filter((m) => m.aulas.length > 0);

  // Navegação entre aulas
  const todasAulas = modulosComAulas.flatMap((m) => m.aulas).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
  const indiceAtual = todasAulas.findIndex((a) => a.id === lessonId);
  const aulaAnterior = indiceAtual > 0 ? todasAulas[indiceAtual - 1] : null;
  const proximaAula = indiceAtual < todasAulas.length - 1 ? todasAulas[indiceAtual + 1] : null;

  const handleMarkComplete = () => {
    if (!aulaAtual) return;
    markLessonComplete(aulaAtual.id, cursoAtual!.id, moduloAtual!.id);
    toast({
      title: "Progresso atualizado",
      description: "Aula marcada como concluída",
    });
  };

  useEffect(() => {
    if (!loadingLessons && !aulaAtual) {
      toast({
        title: "Aula não encontrada",
        variant: "destructive",
      });
      navigate("/student");
    }
  }, [aulaAtual, loadingLessons, navigate, toast]);

  if (loadingLessons || loadingModules || loadingCourses || !aulaAtual || !cursoAtual) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Carregando aula...</p>
        </div>
      </div>
    );
  }

  const isCompleted = progress.some((p) => p.lessonId === lessonId && p.completed);

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Top Bar */}
      <LessonTopBar courseTitle={cursoAtual.titulo} courseId={cursoAtual.id} />

      {/* Layout Principal */}
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8 px-3 py-4 sm:px-4 lg:p-6">
          {/* Coluna Principal - Conteúdo */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Player de Vídeo */}
            <LessonVideoPlayer
              tipo={aulaAtual.tipo || "video"}
              url={aulaAtual.url}
              arquivo={aulaAtual.arquivo}
              nome={aulaAtual.nome}
              lessonId={aulaAtual.id}
              courseId={cursoAtual.id}
              moduleId={moduloAtual?.id}
            />

            {/* Botões de Navegação - Mobile: CTA + Menu juntos */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 py-4">
              {/* Linha 1 Mobile: CTA + Botão Menu */}
              <div className="flex gap-2 w-full sm:w-auto sm:contents">
                {/* CTA Principal */}
                <Button
                  onClick={handleMarkComplete}
                  disabled={isCompleted}
                  className="btn-premium flex-1 sm:flex-none sm:w-auto sm:order-2 min-h-[48px] text-base font-semibold"
                >
                  {isCompleted ? "✓ Concluída" : "Marcar como Concluída"}
                </Button>

                {/* Botão Menu - Só no mobile, abre o Sheet */}
                <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="lg:hidden min-h-[48px] px-4"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-[400px] p-6">
                    <div className="space-y-4 mt-8">
                      <CourseSidebar
                        courseId={cursoAtual.id}
                        categoryId={cursoAtual.categoriaId}
                        modules={modulosComAulas}
                        currentLessonId={lessonId!}
                        currentModuleId={moduloAtual?.id || ""}
                        lessonProgress={progress}
                      />
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Botões de navegação - Row no mobile, laterais no desktop */}
              <div className="flex gap-2 sm:contents">
                <Button
                  variant="outline"
                  onClick={() => aulaAnterior && navigate(`/student/lesson/${aulaAnterior.id}`)}
                  disabled={!aulaAnterior}
                  className="flex-1 sm:flex-none sm:order-1 min-h-[44px]"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">Aula </span>Anterior
                </Button>

                <Button
                  variant="outline"
                  onClick={() => proximaAula && navigate(`/student/lesson/${proximaAula.id}`)}
                  disabled={!proximaAula}
                  className="flex-1 sm:flex-none sm:order-3 min-h-[44px]"
                >
                  Próxima<span className="hidden sm:inline"> Aula</span>
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Descrição da Aula */}
            {aulaAtual.descricao && (
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed whitespace-pre-line pt-4">
                {aulaAtual.descricao}
              </p>
            )}

            {/* Materiais */}
            <LessonMaterials materials={aulaAtual.materiaisExtras} />
          </div>

          {/* Sidebar Desktop */}
          <div className="hidden lg:block">
            <CourseSidebar
              courseId={cursoAtual.id}
              categoryId={cursoAtual.categoriaId}
              modules={modulosComAulas}
              currentLessonId={lessonId!}
              currentModuleId={moduloAtual?.id || ""}
              lessonProgress={progress}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
