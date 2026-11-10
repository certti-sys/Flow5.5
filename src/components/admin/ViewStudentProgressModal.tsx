import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, BarChart2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Student {
  id: string;
  name: string;
}

interface ViewStudentProgressModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function ViewStudentProgressModal({
  open,
  onOpenChange,
  student,
}: ViewStudentProgressModalProps) {
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["studentProgress", student?.id],
    queryFn: async () => {
      if (!student) return [];

      // Get assigned courses
      const { data: assignedCourses, error: coursesError } = await supabase
        .from("user_course_access")
        .select("course_id")
        .eq("user_id", student.id);

      if (coursesError) throw coursesError;
      if (!assignedCourses || assignedCourses.length === 0) return [];

      const courseIds = assignedCourses.map((ac) => ac.course_id);

      // Get courses with their lessons
      const { data: courses, error: courseDetailsError } = await supabase
        .from("courses")
        .select(
          `
          id,
          title,
          modules (
            id,
            lessons (
              id
            )
          )
        `
        )
        .in("id", courseIds);

      if (courseDetailsError) throw courseDetailsError;

      // Get user progress (user_progress stores lesson_id, not course_id)
      const { data: progress, error: progressError } = await supabase
        .from("user_progress")
        .select("lesson_id, completed")
        .eq("user_id", student.id)
        .eq("completed", true);

      if (progressError) throw progressError;

      const completedLessonIds = new Set(progress.map((p) => p.lesson_id));

      // Calculate progress for each course
      return courses.map((course: any) => {
        const allLessons = course.modules.flatMap((m: any) => m.lessons);
        const totalLessons = allLessons.length;
        const completedLessons = allLessons.filter((lesson: any) =>
          completedLessonIds.has(lesson.id)
        ).length;
        const percentage =
          totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          courseTitle: course.title,
          totalLessons,
          completedLessons,
          percentage,
        };
      });
    },
    enabled: !!student && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-2xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 shrink-0">
              <BarChart2 className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Progresso do Aluno</DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                Visualizar progresso detalhado de <strong className="text-white">{student?.name}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-styled">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-[12px] bg-black/20 border border-white/5 space-y-3">
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-2 w-full bg-white/10" />
                  <Skeleton className="h-3 w-1/4 bg-white/10" />
                </div>
              ))}
            </>
          ) : progressData && progressData.length > 0 ? (
            progressData.map((course, index) => (
              <div
                key={index}
                className="p-5 rounded-[12px] bg-black/20 border border-white/5 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h4 className="text-[14px] font-medium text-white/90 leading-none mb-1.5">{course.courseTitle}</h4>
                    <p className="text-[12px] text-white/40">
                      {course.completedLessons} de {course.totalLessons} aulas concluídas
                    </p>
                  </div>
                  {course.percentage === 100 && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-2">
                  <Progress value={course.percentage} className="h-2 bg-white/5" />
                  <p className="text-[12px] font-bold text-right text-white/60">
                    {course.percentage}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-black/20 border border-white/5 rounded-[12px]">
              <BarChart2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-[14px] text-white/40">
                Nenhum curso atribuído para este aluno.
              </p>
            </div>
          )}
        </div>

        {/* Footer for consistency */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end rounded-b-[20px]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-[44px] px-8 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}