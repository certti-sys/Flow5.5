import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, CheckCircle2, XCircle } from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status?: string;
}

interface StudentAccessListProps {
  students: Student[];
  grantedAccess: string[];
  onToggleAccess: (studentId: string) => void;
}

export function StudentAccessList({ 
  students, 
  grantedAccess, 
  onToggleAccess 
}: StudentAccessListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ativo" | "bloqueado">("all");

  // Filtrar alunos
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = 
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        filterStatus === "all" || student.status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [students, searchTerm, filterStatus]);

  // Ações em massa
  const handleSelectAll = () => {
    const activeStudents = filteredStudents.filter(s => s.status === "ativo");
    activeStudents.forEach(student => {
      if (!grantedAccess.includes(student.id)) {
        onToggleAccess(student.id);
      }
    });
  };

  const handleDeselectAll = () => {
    filteredStudents.forEach(student => {
      if (grantedAccess.includes(student.id)) {
        onToggleAccess(student.id);
      }
    });
  };

  const selectedCount = filteredStudents.filter(s => 
    grantedAccess.includes(s.id)
  ).length;

  return (
    <div className="space-y-4">
      {/* Busca e Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            Todos
          </Button>
          <Button
            variant={filterStatus === "ativo" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("ativo")}
          >
            Ativos
          </Button>
          <Button
            variant={filterStatus === "bloqueado" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("bloqueado")}
          >
            Bloqueados
          </Button>
        </div>
      </div>

      {/* Ações em Massa */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          {selectedCount} de {filteredStudents.length} selecionados
        </p>
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSelectAll}
          >
            Selecionar Todos
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleDeselectAll}
          >
            Desmarcar Todos
          </Button>
        </div>
      </div>

      {/* Lista de Alunos */}
      <div className="border border-border/50 rounded-lg divide-y divide-border/50 max-h-[400px] overflow-y-auto">
        {filteredStudents.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            Nenhum aluno encontrado
          </div>
        ) : (
          filteredStudents.map((student) => {
            const hasAccess = grantedAccess.includes(student.id);
            const isBlocked = student.status === "bloqueado";
            
            return (
              <div
                key={student.id}
                className={`flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors ${
                  isBlocked ? "opacity-60" : ""
                }`}
              >
                <Checkbox
                  checked={hasAccess}
                  onCheckedChange={() => onToggleAccess(student.id)}
                  disabled={isBlocked}
                />

                <Avatar className="w-10 h-10">
                  <AvatarImage src={student.avatar} alt={student.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {student.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground truncate">
                      {student.name}
                    </p>
                    {hasAccess && (
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {student.email}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {isBlocked ? (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Bloqueado
                    </Badge>
                  ) : student.status === "ativo" ? (
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      Ativo
                    </Badge>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
