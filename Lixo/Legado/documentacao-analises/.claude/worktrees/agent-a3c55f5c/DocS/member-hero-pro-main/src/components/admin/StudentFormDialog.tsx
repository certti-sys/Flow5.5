import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCourses } from "@/hooks/useCourses";
import type { Student } from "@/hooks/useStudents";

interface StudentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSave: (data: {
    name: string;
    email: string;
    status: 'ativo' | 'inativo' | 'bloqueado';
    coursesAccess: string[];
  }) => void;
}

export function StudentFormDialog({ 
  open, 
  onOpenChange, 
  student, 
  onSave 
}: StudentFormDialogProps) {
  const { cursos } = useCourses();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    status: "ativo" as 'ativo' | 'inativo' | 'bloqueado',
    coursesAccess: [] as string[]
  });

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        email: student.email,
        status: student.status,
        coursesAccess: student.coursesAccess
      });
    } else {
      setFormData({
        name: "",
        email: "",
        status: "ativo",
        coursesAccess: []
      });
    }
  }, [student, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onOpenChange(false);
  };

  const toggleCourseAccess = (cursoId: string) => {
    setFormData(prev => ({
      ...prev,
      coursesAccess: prev.coursesAccess.includes(cursoId)
        ? prev.coursesAccess.filter(id => id !== cursoId)
        : [...prev.coursesAccess, cursoId]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {student ? "Editar Aluno" : "Adicionar Aluno"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do aluno"
                className="bg-card/50 border-border/50 focus:border-primary/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
                className="bg-card/50 border-border/50 focus:border-primary/50"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: 'ativo' | 'inativo' | 'bloqueado') => 
                  setFormData(prev => ({ ...prev, status: value }))
                }
              >
                <SelectTrigger className="bg-card/50 border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border/50">
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                  <SelectItem value="bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Cursos Liberados</Label>
              <ScrollArea className="h-40 rounded-lg border border-border/50 p-3">
                {cursos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum curso cadastrado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cursos.map((curso) => (
                      <div key={curso.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`curso-${curso.id}`}
                          checked={formData.coursesAccess.includes(curso.id)}
                          onCheckedChange={() => toggleCourseAccess(curso.id)}
                          className="border-border/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <label
                          htmlFor={`curso-${curso.id}`}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {curso.titulo}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {formData.coursesAccess.length} curso(s) selecionado(s)
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border/50 min-h-[44px] w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" className="gold-button min-h-[44px] w-full sm:w-auto">
              {student ? "Salvar Alterações" : "Adicionar Aluno"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
