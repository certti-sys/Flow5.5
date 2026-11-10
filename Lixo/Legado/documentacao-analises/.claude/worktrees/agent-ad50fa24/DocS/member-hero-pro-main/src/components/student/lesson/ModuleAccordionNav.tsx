import { CheckCircle, Circle, Play, Lock, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface Lesson {
  id: string;
  nome: string;
  status: string;
  ordem: number;
}

interface Module {
  id: string;
  nome: string;
  ordem: number;
  aulas: Lesson[];
}

interface ModuleAccordionNavProps {
  modules: Module[];
  currentLessonId: string;
  currentModuleId: string;
  courseId: string;
  lessonProgress: any[];
}

export function ModuleAccordionNav({
  modules,
  currentLessonId,
  currentModuleId,
  courseId,
  lessonProgress,
}: ModuleAccordionNavProps) {
  const navigate = useNavigate();

  const isLessonCompleted = (lessonId: string) => {
    return lessonProgress.some((p) => p.lessonId === lessonId && p.completed);
  };

  const getLessonIcon = (lesson: Lesson) => {
    if (lesson.id === currentLessonId) {
      return <Play className="h-4 w-4 fill-current" />;
    }
    if (isLessonCompleted(lesson.id)) {
      return <CheckCircle className="h-4 w-4" />;
    }
    if (lesson.status === "Rascunho") {
      return <Lock className="h-4 w-4" />;
    }
    return <Circle className="h-4 w-4" />;
  };

  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={currentModuleId}
      className="w-full space-y-2"
    >
      {modules
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
        .map((module) => (
          <AccordionItem
            key={module.id}
            value={module.id}
            className="border border-border/40 rounded-lg overflow-hidden glass-card"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-primary/5 transition-colors">
              <span className="text-sm font-semibold text-foreground text-left">
                Module {module.ordem} — {module.nome}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-2 pb-2">
              <div className="space-y-1">
                {module.aulas
                  .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                  .map((lesson) => (
                    <button
                      key={lesson.id}
                      onClick={() => navigate(`/student/lesson/${lesson.id}`)}
                      disabled={lesson.status === "Rascunho"}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-all",
                        lesson.id === currentLessonId
                          ? "bg-primary/20 text-primary"
                          : "hover:bg-primary/5 text-muted-foreground hover:text-foreground",
                        lesson.status === "Rascunho" && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span
                        className={cn(
                          "shrink-0",
                          lesson.id === currentLessonId && "text-primary",
                          isLessonCompleted(lesson.id) && "text-green-500"
                        )}
                      >
                        {getLessonIcon(lesson)}
                      </span>
                      
                      <span className="flex-1 text-sm font-medium truncate">
                        {lesson.nome}
                      </span>
                    </button>
                  ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
    </Accordion>
  );
}
