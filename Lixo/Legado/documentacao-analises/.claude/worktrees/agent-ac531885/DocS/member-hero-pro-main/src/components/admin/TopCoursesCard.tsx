import { Users } from "lucide-react";
import { topCourses } from "@/data/mockData";

export function TopCoursesCard() {
  return (
    <div className="glass-card p-6 animate-fade-in h-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground">Cursos com Melhor Desempenho</h3>
        <p className="text-sm text-muted-foreground">Mais vendidos este mês</p>
      </div>

      <div className="space-y-4">
        {topCourses.map((course, index) => (
          <div
            key={course.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <span className="text-sm font-medium text-muted-foreground w-5">
              {index + 1}
            </span>
            <img
              src={course.thumbnail}
              alt={course.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {course.name}
              </p>
              <div className="flex items-center gap-1 text-muted-foreground">
                <Users className="h-3 w-3" />
                <span className="text-xs">{course.students} alunos</span>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary">
              R$ {course.revenue.toLocaleString('pt-BR')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
