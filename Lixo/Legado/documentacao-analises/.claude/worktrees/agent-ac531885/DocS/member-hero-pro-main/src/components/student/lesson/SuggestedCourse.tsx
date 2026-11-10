import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useCourses } from "@/hooks/useCourses";

interface SuggestedCourseProps {
  currentCourseId: string;
  categoryId?: string | null;
}

export function SuggestedCourse({ currentCourseId, categoryId }: SuggestedCourseProps) {
  const navigate = useNavigate();
  const { cursos } = useCourses();

  // Encontrar curso sugerido da mesma categoria, excluindo o atual
  const suggestedCourse = cursos.find(
    (c) => c.id !== currentCourseId && c.categoriaId === categoryId && c.status === "Publicado"
  ) || cursos.find(
    (c) => c.id !== currentCourseId && c.status === "Publicado"
  );

  if (!suggestedCourse) {
    return null;
  }

  return (
    <div className="glass-card rounded-xl p-4 border border-border/40 space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Alunos também compraram:
      </p>
      
      <div className="space-y-3">
        <div className="aspect-video rounded-lg overflow-hidden bg-black/50">
          {suggestedCourse.imagem ? (
            <img
              src={suggestedCourse.imagem}
              alt={suggestedCourse.titulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">📚</span>
            </div>
          )}
        </div>

        <div className="space-y-1">
          <h4 className="font-semibold text-foreground line-clamp-2 leading-tight">
            {suggestedCourse.titulo}
          </h4>
          <p className="text-xs text-muted-foreground">Curso online</p>
        </div>

        <Button
          className="w-full btn-premium"
          size="sm"
          onClick={() => navigate(`/student/course/${suggestedCourse.id}`)}
        >
          Ver curso
        </Button>
      </div>
    </div>
  );
}
