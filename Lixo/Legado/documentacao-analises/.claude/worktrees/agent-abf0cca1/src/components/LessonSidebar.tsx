import { useState } from "react";
import { CheckCircle2, Circle, Clock, BookOpen, PlayCircle, Loader2, FileBadge } from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useUserProgress } from "@/hooks/useUserProgress";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface LessonSidebarProps {
  modules: any[];
  courseId: string;
}

export const LessonSidebar = ({ modules, courseId }: LessonSidebarProps) => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const { isLessonCompleted } = useUserProgress();
  const { user } = useAuth();
  const [isGeneratingCertificate, setIsGeneratingCertificate] = useState(false);

  const handleGenerateCertificate = async () => {
    if (!user || !courseId) return;

    try {
      setIsGeneratingCertificate(true);
      
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .maybeSingle();

      if (existingCert) {
        navigate(`/certificado/${existingCert.id}`);
        return;
      }

      const { data: newCert, error } = await supabase
        .from('certificates')
        .insert({ user_id: user.id, course_id: courseId })
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

  // Calculate course progress
  const totalLessons = modules.reduce((total, module) => {
    return total + (module.lessons?.length || 0);
  }, 0);

  const completedLessons = modules.reduce((completed, module) => {
    return completed + (module.lessons?.filter((lesson: any) =>
      isLessonCompleted(lesson.id)
    ).length || 0);
  }, 0);

  const progressPercentage = totalLessons > 0
    ? Math.round((completedLessons / totalLessons) * 100)
    : 0;

  // Default expanded: current lesson's module or all modules
  const currentModuleId = modules.find(m =>
    m.lessons?.some((l: any) => l.id === lessonId)
  )?.id;

  return (
    <div className="glass-card rounded-xl border border-white/[0.08] overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/5 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm tracking-tight">Conteúdo do Curso</h3>
            <p className="text-xs text-muted-foreground">{modules.length} módulos • {totalLessons} aulas</p>
          </div>
        </div>

        {/* Progress Bar */}
        {totalLessons > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-semibold text-primary">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        )}

        {/* Certificate Button */}
        {progressPercentage === 100 && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
            <Button 
              onClick={handleGenerateCertificate}
              disabled={isGeneratingCertificate}
              className="w-full bg-amber-500 hover:bg-amber-600 text-black shadow-glow-sm border-0 font-bold tracking-tight rounded-xl"
            >
              {isGeneratingCertificate ? (
                  <Loader2 className="w-4 h-4 mr-2 text-black animate-spin" />
              ) : (
                  <FileBadge className="w-4 h-4 mr-2 text-black" />
              )}
              {isGeneratingCertificate ? "Gerando..." : "Resgatar Certificado"}
            </Button>
          </div>
        )}
      </div>

      {/* Modules List - Using shadcn/ui Accordion for premium feel */}
      <div className="flex-1 overflow-y-auto scrollbar-styled">
        <Accordion
          type="multiple"
          defaultValue={currentModuleId ? [currentModuleId] : modules.map(m => m.id)}
          className="w-full"
        >
          {modules.map((module, moduleIndex) => {
            const moduleLessons = module.lessons || [];
            const moduleCompleted = moduleLessons.filter((l: any) => isLessonCompleted(l.id)).length;
            const isAllCompleted = moduleCompleted === moduleLessons.length && moduleLessons.length > 0;

            return (
              <AccordionItem key={module.id} value={module.id} className="border-b border-white/5 last:border-b-0">
                <AccordionTrigger className="px-4 py-4 hover:bg-white/5 hover:no-underline group transition-all duration-200">
                  <div className="flex items-center gap-3 text-left">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-semibold transition-colors ${isAllCompleted ? "bg-green-500/20 text-green-500" : "bg-muted/50 text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      }`}>
                      {moduleIndex + 1}
                    </div>
                    <div className="min-w-0 pr-4">
                      <p className="font-medium text-sm truncate">{module.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {moduleCompleted}/{moduleLessons.length} aulas
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="p-0 bg-black/20">
                  <div className="flex flex-col">
                    {moduleLessons.map((lesson: any, lessonIndex: number) => {
                      const completed = isLessonCompleted(lesson.id);
                      const isActive = lessonId === lesson.id;

                      return (
                        <Link
                          key={lesson.id}
                          to={`/aula/${lesson.id}`}
                          className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 border-b border-white/5 last:border-b-0 touch-manipulation group relative ${isActive
                            ? "bg-primary/15"
                            : "hover:bg-white/5"
                            }`}
                        >
                          {/* Active Indicator */}
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                          )}

                          {/* Status Icon */}
                          <div className="flex-shrink-0">
                            {completed ? (
                              <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              </div>
                            ) : isActive ? (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                                <PlayCircle className="w-3.5 h-3.5 text-primary" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-muted/30 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                <Circle className="w-2.5 h-2.5 text-muted-foreground group-hover:text-primary transition-colors" />
                              </div>
                            )}
                          </div>

                          {/* Lesson Info */}
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium truncate transition-colors ${isActive ? "text-primary" : completed ? "text-muted-foreground/80" : "text-foreground/90"
                              }`}>
                              {lessonIndex + 1}. {lesson.title}
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60 mt-0.5">
                              <Clock className="w-3 h-3" />
                              <span>{lesson.duration}</span>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
};

