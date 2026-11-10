import { Link } from "react-router-dom";
import { BookOpen, ArrowRight, PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Course {
  id: string;
  title: string;
  thumbnail: string;
}

interface MyProfileCoursesProps {
  courses: Course[];
  isLoading?: boolean;
}

export const MyProfileCourses = ({ courses, isLoading }: MyProfileCoursesProps) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-card p-5 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="w-16 h-10 rounded-lg bg-white/5 shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-white/5 rounded w-full"></div>
                <div className="h-2 bg-white/5 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-card p-5">
        <h3 className="text-sm font-bold text-white/90 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          Meus Cursos
        </h3>
        <p className="text-xs text-muted-foreground text-center py-4">
          Você ainda não possui cursos.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-card p-5">
      <h3 className="text-sm font-bold text-white/90 mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-primary" />
        Meus Cursos
      </h3>

      <div className="space-y-3">
        {courses.map((course) => (
          <Link
            key={course.id}
            to={`/curso/${course.id}`}
            className="group flex items-center gap-3 p-2 -mx-2 rounded-xl border border-transparent hover:border-white/5 hover:bg-white/5 transition-all duration-300"
          >
            <div className="relative w-16 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10">
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <PlayCircle className="w-5 h-5 text-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white/80 group-hover:text-primary transition-colors truncate leading-tight">
                {course.title}
              </p>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 font-medium uppercase tracking-wider opacity-60">
                Acessar agora
                <ArrowRight className="w-2.5 h-2.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-white/5">
        <Link 
          to="/dashboard" 
          className="text-[11px] font-black uppercase tracking-widest text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
        >
          Explorar Loja de Cursos
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
