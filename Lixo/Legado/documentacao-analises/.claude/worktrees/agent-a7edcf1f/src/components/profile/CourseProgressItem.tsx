import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Course } from "@/lib/mockData";

interface CourseProgressItemProps {
  course: Course;
}

export const CourseProgressItem = ({ course }: CourseProgressItemProps) => {
  return (
    <Link to={`/curso/${course.id}`}>
      <div className="glass-card border-white/10 p-4 rounded-xl hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 group">
        <div className="flex gap-4 items-start">
          <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden">
            <img
              src={course.thumbnail}
              alt={course.title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-2 truncate group-hover:text-primary transition-colors">
              {course.title}
            </h3>
            
            <div className="flex items-center gap-3 mb-3">
              <Progress
                value={course.progress}
                className="h-2 flex-1 bg-white/10"
              />
              <span className="text-2xl font-bold text-gradient tabular-nums">
                {course.progress}%
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {course.completedLessons} de {course.totalLessons} aulas
              </span>
              
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs hover:text-primary"
              >
                Continuar
                <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};
