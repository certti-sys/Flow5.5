import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { BookOpen, PlayCircle } from "lucide-react";

interface Course {
  id: string;
  titulo: string;
  descricao: string;
  imagem: string;
  status: string;
  modulos?: number;
  aulas?: number;
}

interface CourseSelectorProps {
  courses: Course[];
  selectedCourses: string[];
  onToggleCourse: (courseId: string) => void;
}

export function CourseSelector({ 
  courses, 
  selectedCourses, 
  onToggleCourse 
}: CourseSelectorProps) {
  const publishedCourses = courses.filter(c => c.status === "Publicado");

  if (publishedCourses.length === 0) {
    return (
      <div className="glass-card border border-border/50 rounded-xl p-12 text-center">
        <p className="text-muted-foreground">Nenhum curso publicado disponível</p>
        <p className="text-sm text-muted-foreground mt-2">
          Publique cursos na seção "Cursos" para vinculá-los à comunidade
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {publishedCourses.map((course) => {
        const isSelected = selectedCourses.includes(course.id);
        
        return (
          <Card
            key={course.id}
            className={`relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] ${
              isSelected 
                ? "border-primary ring-2 ring-primary/20" 
                : "border-border/50 hover:border-border"
            }`}
            onClick={() => onToggleCourse(course.id)}
          >
            <div className="aspect-video relative bg-muted overflow-hidden">
              {course.imagem ? (
                <img 
                  src={course.imagem} 
                  alt={course.titulo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl">
                  📚
                </div>
              )}
              
              <div className="absolute top-2 right-2 z-10">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleCourse(course.id)}
                  className="bg-background border-2"
                />
              </div>
              
              {isSelected && (
                <div className="absolute top-2 left-2 z-10">
                  <Badge className="bg-primary text-primary-foreground">
                    ✓ Vinculado
                  </Badge>
                </div>
              )}
            </div>

            <div className="p-4 space-y-2">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {course.titulo}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {course.descricao}
              </p>
              
              {/* Stats */}
              <div className="flex items-center gap-3 pt-2">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <BookOpen className="w-3 h-3" />
                  <span>{course.modulos || 0} módulos</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PlayCircle className="w-3 h-3" />
                  <span>{course.aulas || 0} aulas</span>
                </div>
              </div>
              
              {isSelected && (
                <p className="text-xs text-primary font-medium pt-1">
                  → {course.modulos || 0} prateleiras serão criadas
                </p>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
