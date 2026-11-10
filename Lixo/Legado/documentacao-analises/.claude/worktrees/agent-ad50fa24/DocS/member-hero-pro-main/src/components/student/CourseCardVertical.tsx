import { Lock } from "lucide-react";
import { Course } from "@/hooks/useCourses";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { CourseImageSkeleton } from "@/components/ui/image-skeleton";
import { cn } from "@/lib/utils";

interface CourseCardVerticalProps {
  course: Course;
  isLocked: boolean;
  progress?: number;
  showTitle?: boolean;
  showDescription?: boolean;
  showCategory?: boolean;
  showProgress?: boolean;
  showLock?: boolean;
  hoverEffect?: boolean;
  showBorder?: boolean;
  gradientOpacity?: number;
  onCourseClick: () => void;
}

export function CourseCardVertical({
  course,
  isLocked,
  progress = 0,
  showTitle = true,
  showDescription = true,
  showCategory = true,
  showProgress = true,
  showLock = true,
  hoverEffect = true,
  showBorder = true,
  gradientOpacity = 60,
  onCourseClick,
}: CourseCardVerticalProps) {
  return (
    <div
      className={cn(
        "course-card-vertical group cursor-pointer",
        !hoverEffect && "no-hover",
        !showBorder && "border-0"
      )}
      onClick={onCourseClick}
    >
      {/* Imagem do Curso */}
      <div className="absolute inset-0">
        {course.imagem ? (
          <OptimizedImage
            src={course.imagem}
            alt={course.titulo}
            className="w-full h-full object-cover"
            sizes="(max-width: 640px) 280px, (max-width: 1024px) 320px, 400px"
            aspectRatio="video"
            fallback={<CourseImageSkeleton />}
          />
        ) : (
          <CourseImageSkeleton />
        )}
        
        {/* Gradiente inferior - opacidade dinâmica */}
        <div 
          className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
          style={{ opacity: gradientOpacity / 100 }}
        />
      </div>

      {/* Overlay de bloqueio + cadeado no canto superior direito */}
      {isLocked && showLock && (
        <>
          <div className="absolute inset-0 bg-black/30 z-10" />
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-black/70 border border-white/30 flex items-center justify-center backdrop-blur-sm">
              <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-white/90" />
            </div>
          </div>
        </>
      )}

      {/* Conteúdo do Card */}
      <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-20">
        {/* Categoria */}
        {showCategory && course.categoria && (
          <Badge className="mb-1.5 sm:mb-2 bg-gold/20 text-gold border-gold/30 text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
            {course.categoria}
          </Badge>
        )}

        {/* Título */}
        {showTitle && (
          <h3 className="text-white font-bold text-sm sm:text-base md:text-lg mb-1 line-clamp-2 group-hover:text-gold transition-colors">
            {course.titulo}
          </h3>
        )}

        {/* Descrição - escondida no mobile para cards menores */}
        {showDescription && course.descricao && (
          <p className="text-white/70 text-xs sm:text-sm line-clamp-1 sm:line-clamp-2 mb-2 sm:mb-3 hidden sm:block">
            {course.descricao}
          </p>
        )}

        {/* Progresso (se não estiver bloqueado e tiver progresso) */}
        {!isLocked && showProgress && progress > 0 && (
          <div className="space-y-1">
            <Progress value={progress} className="h-1" />
            <p className="text-xs text-white/60">{Math.round(progress)}% concluído</p>
          </div>
        )}
      </div>

      {/* Efeito hover - brilho dourado */}
      {hoverEffect && (
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="absolute inset-0 gold-glow" />
        </div>
      )}
    </div>
  );
}
