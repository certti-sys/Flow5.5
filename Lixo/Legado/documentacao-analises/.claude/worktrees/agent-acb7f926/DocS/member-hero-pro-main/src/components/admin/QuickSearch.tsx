import { useState, useEffect, useRef } from "react";
import { Search, BookOpen, Users, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCourses } from "@/hooks/useCourses";
import { useStudents } from "@/hooks/useStudents";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function QuickSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { cursos, filtrarCursos } = useCourses();
  const { students, filtrarAlunos } = useStudents();
  
  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Filtrar resultados
  const courseResults = debouncedQuery.length >= 2 
    ? filtrarCursos(debouncedQuery, "todos").slice(0, 5)
    : [];
  
  const studentResults = debouncedQuery.length >= 2
    ? filtrarAlunos(debouncedQuery, "todos", "").slice(0, 5)
    : [];
  
  const hasResults = courseResults.length > 0 || studentResults.length > 0;
  
  // Handlers de navegação
  const handleCourseClick = (id: string) => {
    navigate(`/admin/courses/${id}`);
    setIsOpen(false);
    setQuery("");
  };
  
  const handleStudentClick = (id: string) => {
    navigate(`/admin/students?highlight=${id}`);
    setIsOpen(false);
    setQuery("");
  };
  
  return (
    <div ref={searchRef} className="relative w-full md:w-80 lg:w-96">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cursos, alunos..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 bg-black/30 border-white/10 focus:border-primary/50 transition-colors"
        />
      </div>
      
      {/* Dropdown de Resultados */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-black/95 border border-white/10 rounded-lg shadow-xl z-50 backdrop-blur-xl max-h-96 overflow-y-auto">
          {!hasResults ? (
            <div className="p-4 text-center text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          ) : (
            <>
              {/* Seção Cursos */}
              {courseResults.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-semibold text-primary px-2 py-1 flex items-center gap-2">
                    <BookOpen className="h-3 w-3" />
                    CURSOS ({courseResults.length})
                  </div>
                  {courseResults.map(curso => (
                    <button
                      key={curso.id}
                      onClick={() => handleCourseClick(curso.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg transition-colors group"
                    >
                      <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="flex-1 text-left truncate text-sm">{curso.titulo}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
              
              {/* Seção Alunos */}
              {studentResults.length > 0 && (
                <div className={cn("p-2", courseResults.length > 0 && "border-t border-white/10")}>
                  <div className="text-xs font-semibold text-primary px-2 py-1 flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    ALUNOS ({studentResults.length})
                  </div>
                  {studentResults.map(student => (
                    <button
                      key={student.id}
                      onClick={() => handleStudentClick(student.id)}
                      className="w-full flex items-center gap-3 px-2 py-2 hover:bg-white/5 rounded-lg transition-colors group"
                    >
                      <Users className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="truncate text-sm">{student.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {student.email}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
