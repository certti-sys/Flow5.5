import { User, Mail, Calendar, Clock, BookOpen, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCourses } from "@/hooks/useCourses";
import type { Student } from "@/hooks/useStudents";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface StudentDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
  onToggleAccess: (cursoId: string, hasAccess: boolean) => void;
}

export function StudentDetailsDialog({ 
  open, 
  onOpenChange, 
  student,
  onToggleAccess
}: StudentDetailsDialogProps) {
  const { cursos } = useCourses();

  if (!student) return null;

  const statusConfig: Record<string, { label: string; className: string }> = {
    ativo: { label: "Ativo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    inativo: { label: "Inativo", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    bloqueado: { label: "Bloqueado", className: "bg-red-500/20 text-red-400 border-red-500/30" },
    active: { label: "Ativo", className: "bg-green-500/20 text-green-400 border-green-500/30" },
    inactive: { label: "Inativo", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
    blocked: { label: "Bloqueado", className: "bg-red-500/20 text-red-400 border-red-500/30" }
  };

  const getStatusConfig = (status: string | undefined) => {
    return statusConfig[status || 'ativo'] || statusConfig.ativo;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  // Simular progresso por curso
  const getProgressForCourse = (cursoId: string) => {
    const base = cursoId.charCodeAt(cursoId.length - 1) * 13;
    return Math.min(100, Math.max(0, base % 100));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detalhes do Aluno</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-background/50">
            <TabsTrigger value="info" className="min-h-[44px]">Informações</TabsTrigger>
            <TabsTrigger value="cursos" className="min-h-[44px]">Cursos</TabsTrigger>
            <TabsTrigger value="progresso" className="min-h-[44px]">Progresso</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[400px] mt-4">
            {/* Aba Informações */}
            <TabsContent value="info" className="space-y-6 pr-4">
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="h-10 w-10 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{student.name}</h3>
                  <p className="text-muted-foreground flex items-center gap-2 mt-1">
                    <Mail className="h-4 w-4" />
                    {student.email}
                  </p>
                  <Badge className={`mt-2 ${getStatusConfig(student.status).className}`}>
                    {getStatusConfig(student.status).label}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card p-4 rounded-lg space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Cadastrado em
                  </p>
                  <p className="font-medium">{formatDate(student.createdAt)}</p>
                </div>
                <div className="glass-card p-4 rounded-lg space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Último acesso
                  </p>
                  <p className="font-medium">{formatDate(student.lastAccessAt)}</p>
                </div>
                <div className="glass-card p-4 rounded-lg space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Cursos liberados
                  </p>
                  <p className="font-medium">{student.coursesAccess.length}</p>
                </div>
                <div className="glass-card p-4 rounded-lg space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Progresso geral
                  </p>
                  <p className="font-medium">{student.totalProgress}%</p>
                </div>
              </div>
            </TabsContent>

            {/* Aba Cursos */}
            <TabsContent value="cursos" className="space-y-4 pr-4">
              <p className="text-sm text-muted-foreground">
                Gerencie o acesso do aluno aos cursos da plataforma.
              </p>
              
              {cursos.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum curso cadastrado na plataforma.
                </div>
              ) : (
                <div className="space-y-3">
                  {cursos.map((curso) => {
                    const hasAccess = student.coursesAccess.includes(curso.id);
                    return (
                      <div 
                        key={curso.id}
                        className="glass-card p-4 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-8 rounded overflow-hidden bg-card/50">
                            <img 
                              src={curso.imagem} 
                              alt={curso.titulo}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{curso.titulo}</p>
                            <p className="text-xs text-muted-foreground">
                              {hasAccess ? "Acesso liberado" : "Sem acesso"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={hasAccess}
                          onCheckedChange={(checked) => onToggleAccess(curso.id, checked)}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Aba Progresso */}
            <TabsContent value="progresso" className="space-y-4 pr-4">
              <div className="glass-card p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progresso Geral</span>
                  <span className="text-sm text-primary font-bold">{student.totalProgress}%</span>
                </div>
                <Progress value={student.totalProgress} className="h-3 bg-white/10" />
              </div>

              <p className="text-sm text-muted-foreground mt-4">
                Progresso por curso:
              </p>

              {student.coursesAccess.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  O aluno não tem acesso a nenhum curso.
                </div>
              ) : (
                <div className="space-y-4">
                  {student.coursesAccess.map((cursoId) => {
                    const curso = cursos.find(c => c.id === cursoId);
                    const progress = getProgressForCourse(cursoId);
                    
                    return (
                      <div key={cursoId} className="glass-card p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-3">
                          {curso && (
                            <div className="w-10 h-7 rounded overflow-hidden bg-card/50">
                              <img 
                                src={curso.imagem} 
                                alt={curso.titulo}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              {curso?.titulo || "Curso não encontrado"}
                            </p>
                          </div>
                          <span className="text-sm text-primary font-bold">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2 bg-white/10" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{Math.floor(progress / 10)} de 10 aulas</span>
                          <span>{Math.floor(progress * 1.2)} min assistidos</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
