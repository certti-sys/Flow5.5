import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useCourseSearch } from "@/hooks/useCourseSearch";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

interface SearchBarProps {
  fullWidth?: boolean;
}

export const SearchBar = ({ fullWidth = false }: SearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedTerm(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: results = [], isLoading } = useCourseSearch(debouncedTerm);

  const handleSelectCourse = (courseId: string) => {
    navigate(`/curso/${courseId}`);
    setSearchTerm("");
    setIsOpen(false);
  };

  const showResults = searchTerm.length >= 2;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-full bg-muted/30 hover:bg-muted/50 transition-colors shrink-0",
            fullWidth ? "w-full justify-start px-3 h-11" : "w-10 h-10 md:w-9 md:h-9"
          )}
        >
          <Search className={cn("h-5 w-5 md:h-4.5 md:w-4.5", fullWidth ? "mr-2" : "")} strokeWidth={1.5} />
          {fullWidth && <span className="text-muted-foreground font-normal">Buscar cursos...</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] sm:w-[320px] p-0 overflow-hidden shadow-2xl border-white/[0.08]"
        align={fullWidth ? "center" : "end"}
        sideOffset={10}
      >
        <div className="relative p-2 bg-card border-b border-white/5">
          <Search className="absolute left-4.5 inset-y-0 my-auto h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" strokeWidth={1.5} />
          <Input
            ref={inputRef}
            autoFocus
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 w-full bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/20 h-9 text-sm placeholder:text-muted-foreground/50 transition-all"
          />
        </div>

        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
          {!showResults ? (
            <div className="p-6 text-center text-muted-foreground/60 text-xs flex flex-col items-center gap-1.5">
              <Search className="w-6 h-6 opacity-10" />
              <p>Mínimo de 2 caracteres</p>
            </div>
          ) : isLoading ? (
            <div className="p-6 text-center text-muted-foreground/60 text-xs animate-pulse">Buscando...</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground/60 text-xs italic">Nenhum curso encontrado.</div>
          ) : (
            <div className="py-1">
              {results.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-primary/5 transition-all text-left min-h-[52px] group border-b border-border/5 last:border-none"
                >
                  <div className="relative w-10 h-10 rounded-md overflow-hidden flex-shrink-0 border border-white/[0.08] group-hover:border-primary/20 transition-all">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover scale-100 group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs truncate group-hover:text-primary transition-colors leading-tight">{course.title}</p>
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5">{course.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
