import { Link } from "react-router-dom";
import { Course } from "@/lib/mockData";
import { Progress } from "@/components/ui/progress";
import { Clock, BookOpen, Lock } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";

interface CourseCardProps {
  course: Course;
  layout?: "grid" | "carousel";
  hasAccess?: boolean;
}

export const CourseCard = ({ course, layout = "grid", hasAccess = true }: CourseCardProps) => {
  // Proteção contra cursos nulos ou inválidos
  if (!course || !course.id) return null;

  // Determine route based on access
  const linkTo = hasAccess ? `/curso/${course.id}` : `/curso/${course.id}/info`;

  return (
    <Link
      to={linkTo}
      className={`group block touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[20px] transition-all ${layout === "carousel" ? "w-full flex-shrink-0 snap-start snap-always" : ""
        }`}
    >
      <div className="glass-card rounded-[20px] overflow-hidden hover-scale hover-glow transition-all duration-300 h-full active:scale-[0.98] border border-white/10 group-hover:border-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10">
        {/* Vertical Poster Image */}
        <AspectRatio ratio={2 / 3} className="overflow-hidden">
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />

          {/* Overlay escuro apenas para cards desbloqueados com texto - gradiente sutil para legibilidade */}
          {hasAccess && course.show_card_overlay !== false && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
          )}

          {/* Lock Overlay - Only if no access (sem blur, só escurecimento) */}
          {!hasAccess && (
            <div className="absolute inset-0 bg-black/70 z-10 flex flex-col items-center justify-center p-4 text-center">
              <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                <Lock className="w-6 h-6 text-white" />
              </div>
              <p className="text-white text-xs font-bold uppercase tracking-widest opacity-80">Acesso Restrito</p>
            </div>
          )}

          {/* Category Badge - Conditional */}
          {course.show_category_badge !== false && (
            <div className="absolute top-3 left-3 z-20">
              <Badge variant="secondary" className="bg-primary hover:bg-primary text-white border-none shadow-lg">
                {course.category}
              </Badge>
            </div>
          )}

          {/* Title Overlay - Conditional */}
          {course.show_card_overlay !== false && (
            <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
              <h3 className="font-bold text-base md:text-lg mb-1 line-clamp-2 text-white group-hover:text-primary transition-colors leading-tight">
                {course.title}
              </h3>
              <p className="text-[10px] md:text-xs text-white/60 font-medium">
                por {course.instructor}
              </p>
            </div>
          )}
        </AspectRatio>

        {/* Bottom Stats & Progress */}
        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Stats */}
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground/80 font-medium">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-3 h-3 text-primary/70" />
              <span>{course.totalLessons} aulas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-primary/70" />
              <span>{course.duration}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={course.progress} className="h-1.5 bg-white/[0.08]" />
            <div className="flex items-center justify-between text-[10px] sm:text-xs">
              <p className="text-muted-foreground/60">
                <span className="text-foreground font-semibold">{course.completedLessons}</span>/{course.totalLessons} concluídas
              </p>
              <span className="font-bold text-primary italic">
                {course.progress}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

