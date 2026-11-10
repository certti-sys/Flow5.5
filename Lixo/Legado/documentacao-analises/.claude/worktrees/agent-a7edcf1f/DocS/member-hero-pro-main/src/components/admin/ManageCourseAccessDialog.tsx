import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCourses } from "@/hooks/useCourses";
import { type Student } from "@/hooks/useStudents";
import { CalendarIcon, BookOpen, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CourseAccessState {
  courseId: string;
  hasAccess: boolean;
  expiresAt: Date | null;
}

interface ManageCourseAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onGrantAccess: (alunoId: string, cursoId: string, expiresAt?: string | null) => void;
  onRevokeAccess: (alunoId: string, cursoId: string) => void;
}

export function ManageCourseAccessDialog({
  open,
  onOpenChange,
  student,
  onGrantAccess,
  onRevokeAccess,
}: ManageCourseAccessDialogProps) {
  const { cursos } = useCourses();
  const [accessStates, setAccessStates] = useState<CourseAccessState[]>([]);

  // Inicializar estado quando o aluno muda
  useEffect(() => {
    if (student && cursos.length > 0) {
      const initialStates = cursos.map((curso) => ({
        courseId: curso.id,
        hasAccess: student.coursesAccess.includes(curso.id),
        expiresAt: null as Date | null,
      }));
      setAccessStates(initialStates);
    }
  }, [student, cursos]);

  const handleToggleAccess = (courseId: string, newValue: boolean) => {
    if (!student) return;

    const state = accessStates.find((s) => s.courseId === courseId);
    const expiresAt = state?.expiresAt ? state.expiresAt.toISOString() : null;

    if (newValue) {
      onGrantAccess(student.id, courseId, expiresAt);
    } else {
      onRevokeAccess(student.id, courseId);
    }

    setAccessStates((prev) =>
      prev.map((s) =>
        s.courseId === courseId ? { ...s, hasAccess: newValue } : s
      )
    );
  };

  const handleSetExpiration = (courseId: string, date: Date | undefined) => {
    setAccessStates((prev) =>
      prev.map((s) =>
        s.courseId === courseId ? { ...s, expiresAt: date || null } : s
      )
    );

    // Se já tem acesso, atualizar a expiração
    const state = accessStates.find((s) => s.courseId === courseId);
    if (state?.hasAccess && student) {
      onGrantAccess(student.id, courseId, date ? date.toISOString() : null);
    }
  };

  const handleGrantAll = () => {
    if (!student) return;
    
    accessStates.forEach((state) => {
      if (!state.hasAccess) {
        const expiresAt = state.expiresAt ? state.expiresAt.toISOString() : null;
        onGrantAccess(student.id, state.courseId, expiresAt);
      }
    });

    setAccessStates((prev) =>
      prev.map((s) => ({ ...s, hasAccess: true }))
    );
  };

  const handleRevokeAll = () => {
    if (!student) return;
    
    accessStates.forEach((state) => {
      if (state.hasAccess) {
        onRevokeAccess(student.id, state.courseId);
      }
    });

    setAccessStates((prev) =>
      prev.map((s) => ({ ...s, hasAccess: false }))
    );
  };

  const accessCount = accessStates.filter((s) => s.hasAccess).length;

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-card border-border/50 max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Gerenciar Acesso a Cursos
          </DialogTitle>
          <div className="flex items-center gap-3 pt-2">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-primary">
                {student.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-medium truncate">{student.name}</p>
              <p className="text-sm text-muted-foreground truncate">{student.email}</p>
            </div>
          </div>
        </DialogHeader>

        {/* Ações em Massa */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGrantAll}
            className="flex-1 gap-2 border-green-500/30 text-green-400 hover:bg-green-500/10 min-h-[44px]"
          >
            <CheckCircle2 className="h-4 w-4" />
            Liberar Todos
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRevokeAll}
            className="flex-1 gap-2 border-red-500/30 text-red-400 hover:bg-red-500/10 min-h-[44px]"
          >
            <XCircle className="h-4 w-4" />
            Revogar Todos
          </Button>
        </div>

        {/* Lista de Cursos */}
        <ScrollArea className="flex-1 min-h-0 pr-2 sm:pr-4">
          <div className="space-y-3">
            {cursos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum curso cadastrado.
              </p>
            ) : (
              cursos.map((curso) => {
                const state = accessStates.find((s) => s.courseId === curso.id);
                const hasAccess = state?.hasAccess || false;
                const expiresAt = state?.expiresAt;

                return (
                  <div
                    key={curso.id}
                    className={cn(
                      "p-3 sm:p-4 rounded-lg border transition-colors",
                      hasAccess
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-border/50 bg-card/50"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      {/* Informações do curso */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {curso.imagem ? (
                          <img
                            src={curso.imagem}
                            alt={curso.titulo}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{curso.titulo}</p>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                hasAccess
                                  ? "border-green-500/30 text-green-400"
                                  : "border-muted-foreground/30 text-muted-foreground"
                              )}
                            >
                              {hasAccess ? "Liberado" : "Sem acesso"}
                            </Badge>
                            {expiresAt && hasAccess && (
                              <Badge
                                variant="outline"
                                className="text-xs border-yellow-500/30 text-yellow-400"
                              >
                                <Clock className="h-3 w-3 mr-1" />
                                {format(expiresAt, "dd/MM/yy")}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                        {/* Data de Expiração */}
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-10 w-10 sm:h-9 sm:w-9 border-border/50 flex-shrink-0",
                                expiresAt && "border-yellow-500/30"
                              )}
                            >
                              <CalendarIcon className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                              mode="single"
                              selected={expiresAt || undefined}
                              onSelect={(date) =>
                                handleSetExpiration(curso.id, date)
                              }
                              disabled={(date) => date < new Date()}
                              initialFocus
                              className="p-3 pointer-events-auto"
                              locale={ptBR}
                            />
                            {expiresAt && (
                              <div className="p-2 border-t border-border/50">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="w-full text-muted-foreground min-h-[44px]"
                                  onClick={() =>
                                    handleSetExpiration(curso.id, undefined)
                                  }
                                >
                                  Remover expiração
                                </Button>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>

                        {/* Switch de Acesso com área de toque melhorada */}
                        <div className="flex items-center justify-center min-w-[44px] min-h-[44px]">
                          <Switch
                            checked={hasAccess}
                            onCheckedChange={(checked) =>
                              handleToggleAccess(curso.id, checked)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        {/* Rodapé com Resumo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/50 mt-auto">
          <p className="text-sm text-muted-foreground text-center sm:text-left">
            <span className="text-primary font-medium">{accessCount}</span> de{" "}
            {cursos.length} cursos liberados
          </p>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="min-h-[44px] w-full sm:w-auto"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
