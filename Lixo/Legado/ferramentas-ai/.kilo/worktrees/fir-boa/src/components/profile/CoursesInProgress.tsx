import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, CheckCircle2 } from "lucide-react";

interface Course {
  id: string;
  title: string;
  thumbnail: string;
  completedLessons: number;
  totalLessons: number;
}

interface CoursesInProgressProps {
  courses: Course[];
}

export const CoursesInProgress = ({ courses }: CoursesInProgressProps) => {
  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-primary" />
          Continuar Estudando
        </h2>
        <div className="text-center py-8 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Você ainda não começou nenhum curso</p>
          <Link to="/dashboard">
            <Button variant="outline" className="mt-4">
              Explorar Cursos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Continuar Estudando
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {courses.map((course) => {
          const progress = course.totalLessons > 0
            ? Math.round((course.completedLessons / course.totalLessons) * 100)
            : 0;
          const isCompleted = progress === 100;

          return (
            <Link
              key={course.id}
              to={`/curso/${course.id}`}
              className="group flex gap-3 p-3 rounded-lg border border-white/[0.08] hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              {/* Thumbnail */}
              <div className="relative w-20 h-14 rounded-md overflow-hidden shrink-0 bg-muted">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover"
                />
                {isCompleted && (
                  <div className="absolute inset-0 bg-green-500/80 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                  {course.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Progress value={progress} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground shrink-0">{progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {course.completedLessons}/{course.totalLessons} aulas
                </p>
              </div>

              {/* Play icon on hover */}
              <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-primary" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
