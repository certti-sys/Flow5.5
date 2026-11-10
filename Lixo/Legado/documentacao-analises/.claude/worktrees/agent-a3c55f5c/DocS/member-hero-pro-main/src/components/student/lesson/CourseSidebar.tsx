import { ScrollArea } from "@/components/ui/scroll-area";
import { ModuleAccordionNav } from "./ModuleAccordionNav";
import { CourseProgressIndicator } from "./CourseProgressIndicator";
import { useMemo } from "react";

interface CourseSidebarProps {
  courseId: string;
  categoryId?: string | null;
  modules: any[];
  currentLessonId: string;
  currentModuleId: string;
  lessonProgress: any[];
}

export function CourseSidebar({
  courseId,
  categoryId,
  modules,
  currentLessonId,
  currentModuleId,
  lessonProgress,
}: CourseSidebarProps) {
  // Calcular progresso do curso
  const { totalLessons, completedLessons } = useMemo(() => {
    const total = modules.reduce((acc, m) => acc + (m.aulas?.length || 0), 0);
    const completed = lessonProgress.filter(
      (p) => p.courseId === courseId && p.completed
    ).length;
    return { totalLessons: total, completedLessons: completed };
  }, [modules, lessonProgress, courseId]);

  return (
    <aside className="w-full lg:w-[400px] shrink-0">
      <div className="sticky top-20 space-y-4">
        {/* Indicador de Progresso */}
        <CourseProgressIndicator
          totalLessons={totalLessons}
          completedLessons={completedLessons}
        />

        {/* Navegação de Módulos */}
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <ScrollArea className="h-[calc(100vh-20rem)] sm:h-[calc(100vh-36rem)] pr-4">
            <ModuleAccordionNav
              modules={modules}
              currentLessonId={currentLessonId}
              currentModuleId={currentModuleId}
              courseId={courseId}
              lessonProgress={lessonProgress}
            />
          </ScrollArea>
        </div>
      </div>
    </aside>
  );
}
