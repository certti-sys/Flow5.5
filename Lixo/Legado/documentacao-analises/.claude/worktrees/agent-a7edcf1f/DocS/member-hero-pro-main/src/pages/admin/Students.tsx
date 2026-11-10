import { useState, useMemo } from "react";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  Lock,
  Unlock,
  Users,
  BookOpen,
  Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useStudents, type Student } from "@/hooks/useStudents";
import { useCourses } from "@/hooks/useCourses";
import { StudentFormDialog } from "@/components/admin/StudentFormDialog";
import { StudentDetailsDialog } from "@/components/admin/StudentDetailsDialog";
import { ManageCourseAccessDialog } from "@/components/admin/ManageCourseAccessDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ITEMS_PER_PAGE = 8;

export default function Students() {
  const isMobile = useIsMobile();
  const { 
    students, 
    isLoading, 
    criarAluno, 
    editarAluno, 
    excluirAluno, 
    toggleBloqueio,
    concederAcesso,
    revogarAcesso,
    filtrarAlunos,
    estatisticas
  } = useStudents();
  const { cursos } = useCourses();

  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [cursoFiltro, setCursoFiltro] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  
  const [alunoParaExcluir, setAlunoParaExcluir] = useState<string | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Student | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrar alunos
  const alunosFiltrados = useMemo(() => {
    return filtrarAlunos(busca, statusFiltro, cursoFiltro);
  }, [busca, statusFiltro, cursoFiltro, filtrarAlunos]);

  // Paginação
  const totalPaginas = Math.ceil(alunosFiltrados.length / ITEMS_PER_PAGE);
  const alunosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE;
    return alunosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [alunosFiltrados, paginaAtual]);

  // Handlers
  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setPaginaAtual(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFiltro(value);
    setPaginaAtual(1);
  };

  const handleCursoChange = (value: string) => {
    setCursoFiltro(value);
    setPaginaAtual(1);
  };

  const handleExcluir = async () => {
    if (alunoParaExcluir) {
      setIsDeleting(true);
      try {
        await excluirAluno(alunoParaExcluir);
        toast.success("Aluno excluído com sucesso!");
      } finally {
        setIsDeleting(false);
        setAlunoParaExcluir(null);
      }
    }
  };

  const handleSaveAluno = (data: {
    name: string;
    email: string;
    status: 'ativo' | 'inativo' | 'bloqueado';
    coursesAccess: string[];
  }) => {
    if (alunoSelecionado) {
      editarAluno(alunoSelecionado.id, data);
      toast.success("Aluno atualizado com sucesso!");
    } else {
      criarAluno({ ...data, avatar: null });
      toast.success("Aluno adicionado com sucesso!");
    }
    setAlunoSelecionado(null);
  };

  const handleToggleBloqueio = (aluno: Student) => {
    toggleBloqueio(aluno.id);
    toast.success(
      aluno.status === 'bloqueado' 
        ? "Aluno desbloqueado!" 
        : "Aluno bloqueado!"
    );
  };

  const handleToggleAccess = (cursoId: string, hasAccess: boolean) => {
    if (!alunoSelecionado) return;
    
    if (hasAccess) {
      concederAcesso(alunoSelecionado.id, cursoId);
    } else {
      revogarAcesso(alunoSelecionado.id, cursoId);
    }
    
    // Atualizar o aluno selecionado localmente
    setAlunoSelecionado(prev => {
      if (!prev) return null;
      return {
        ...prev,
        coursesAccess: hasAccess 
          ? [...prev.coursesAccess, cursoId]
          : prev.coursesAccess.filter(id => id !== cursoId)
      };
    });
  };

  const openEditDialog = (aluno: Student) => {
    setAlunoSelecionado(aluno);
    setFormDialogOpen(true);
  };

  const openDetailsDialog = (aluno: Student) => {
    setAlunoSelecionado(aluno);
    setDetailsDialogOpen(true);
  };

  const openAccessDialog = (aluno: Student) => {
    setAlunoSelecionado(aluno);
    setAccessDialogOpen(true);
  };

  const openNewDialog = () => {
    setAlunoSelecionado(null);
    setFormDialogOpen(true);
  };

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

  const formatLastAccess = (dateString: string | null) => {
    if (!dateString) return "Nunca";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-4 w-48 mt-1" />
            </div>
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        
        {/* Cards estatísticas skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card p-4 rounded-xl">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
          ))}
        </div>
        
        {/* Filtros skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-48" />
        </div>
        
        {/* Tabela skeleton */}
        <div className="glass-card rounded-xl border border-border/50 p-4">
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 mt-1" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-2 w-24 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Alunos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os alunos da sua plataforma ({estatisticas.total} total)
          </p>
        </div>
        <Button className="gold-button gap-2 w-full sm:w-auto" onClick={openNewDialog}>
          <Plus className="h-4 w-4" />
          Adicionar Aluno
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Ativos</p>
          <p className="text-2xl font-bold text-green-400">{estatisticas.ativos}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Inativos</p>
          <p className="text-2xl font-bold text-yellow-400">{estatisticas.inativos}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Bloqueados</p>
          <p className="text-2xl font-bold text-red-400">{estatisticas.bloqueados}</p>
        </div>
        <div className="glass-card p-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Progresso Médio</p>
          <p className="text-2xl font-bold text-primary">{estatisticas.progressoMedio}%</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 focus:border-primary/50"
          />
        </div>
        <Select value={statusFiltro} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-40 bg-card/50 border-border/50">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
            <SelectItem value="bloqueado">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cursoFiltro} onValueChange={handleCursoChange}>
          <SelectTrigger className="w-full sm:w-48 bg-card/50 border-border/50">
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="todos">Todos os cursos</SelectItem>
            {cursos.map((curso) => (
              <SelectItem key={curso.id} value={curso.id}>
                {curso.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Alunos - Desktop */}
      {!isMobile && (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Aluno</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-center">Cursos</TableHead>
                <TableHead className="text-muted-foreground">Progresso</TableHead>
                <TableHead className="text-muted-foreground">Último Acesso</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger-fade-in">
              {alunosPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {busca || statusFiltro !== "todos" || cursoFiltro !== "todos"
                      ? "Nenhum aluno encontrado com os filtros aplicados."
                      : "Nenhum aluno cadastrado. Clique em 'Adicionar Aluno' para começar."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                alunosPaginados.map((aluno) => (
                  <TableRow 
                    key={aluno.id} 
                    className="border-border/50 hover:bg-white/5 transition-colors"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {aluno.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium">{aluno.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {aluno.email}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusConfig(aluno.status).className}>
                        {getStatusConfig(aluno.status).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {aluno.coursesAccess.length}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={aluno.totalProgress} className="h-2 flex-1 bg-white/10" />
                        <span className="text-xs text-muted-foreground w-8">
                          {aluno.totalProgress}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatLastAccess(aluno.lastAccessAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border/50">
                          <DropdownMenuItem
                            onClick={() => openDetailsDialog(aluno)}
                            className="gap-2 cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(aluno)}
                            className="gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openAccessDialog(aluno)}
                            className="gap-2 cursor-pointer text-primary"
                          >
                            <BookOpen className="h-4 w-4" />
                            Gerenciar Acessos
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem
                            onClick={() => handleToggleBloqueio(aluno)}
                            className="gap-2 cursor-pointer"
                          >
                            {aluno.status === 'bloqueado' ? (
                              <>
                                <Unlock className="h-4 w-4" />
                                Desbloquear
                              </>
                            ) : (
                              <>
                                <Lock className="h-4 w-4" />
                                Bloquear
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setAlunoParaExcluir(aluno.id)}
                            className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </div>
      )}

      {/* Cards de Alunos - Mobile */}
      {isMobile && (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          {alunosPaginados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {busca || statusFiltro !== "todos" || cursoFiltro !== "todos"
                ? "Nenhum aluno encontrado com os filtros aplicados."
                : "Nenhum aluno cadastrado. Clique em 'Adicionar Aluno' para começar."
              }
            </div>
          ) : (
            alunosPaginados.map((aluno) => (
              <div 
                key={aluno.id}
                className="p-4 border-b border-border/50 last:border-b-0 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {aluno.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{aluno.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{aluno.email}</p>
                  </div>
                  <Badge className={`flex-shrink-0 ${getStatusConfig(aluno.status).className}`}>
                    {getStatusConfig(aluno.status).label}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border/50 max-w-[calc(100vw-2rem)]">
                      <DropdownMenuItem
                        onClick={() => openDetailsDialog(aluno)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openEditDialog(aluno)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openAccessDialog(aluno)}
                        className="gap-2 cursor-pointer text-primary min-h-[44px] py-3"
                      >
                        <BookOpen className="h-4 w-4" />
                        Gerenciar Acessos
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => handleToggleBloqueio(aluno)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        {aluno.status === 'bloqueado' ? (
                          <>
                            <Unlock className="h-4 w-4" />
                            Desbloquear
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            Bloquear
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setAlunoParaExcluir(aluno.id)}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive min-h-[44px] py-3"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={aluno.totalProgress} className="h-2 flex-1 bg-white/10" />
                  <span className="text-xs text-muted-foreground w-8">
                    {aluno.totalProgress}%
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            className="h-10 w-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
            <Button
              key={pagina}
              variant={pagina === paginaAtual ? "default" : "ghost"}
              size="icon"
              onClick={() => setPaginaAtual(pagina)}
              className={`h-10 w-10 ${
                pagina === paginaAtual 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {pagina}
            </Button>
          ))}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            className="h-10 w-10"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!alunoParaExcluir} onOpenChange={() => setAlunoParaExcluir(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este aluno? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50" disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Formulário */}
      <StudentFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        student={alunoSelecionado}
        onSave={handleSaveAluno}
      />

      {/* Dialog de Detalhes */}
      <StudentDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        student={alunoSelecionado}
        onToggleAccess={handleToggleAccess}
      />

      {/* Dialog de Gerenciar Acesso a Cursos */}
      <ManageCourseAccessDialog
        open={accessDialogOpen}
        onOpenChange={setAccessDialogOpen}
        student={alunoSelecionado}
        onGrantAccess={concederAcesso}
        onRevokeAccess={revogarAcesso}
      />
    </div>
  );
}
