import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, Video, FileText, FileIcon, Link2, Send, EyeOff, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { useCourses } from "@/hooks/useSupabaseCourses";
import { useModules } from "@/hooks/useSupabaseModules";
import { useLessons } from "@/hooks/useSupabaseLessons";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 6;

export default function Courses() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { cursos, excluirCurso, editarCurso, filtrarCursos, isLoading } = useCourses();
  const { obterModulosPorCurso } = useModules();
  const { obterAulasPorCurso } = useLessons();

  // Funções para contadores dinâmicos
  const getTotalModulos = (cursoId: string) => obterModulosPorCurso(cursoId).length;
  const getTotalAulas = (cursoId: string) => obterAulasPorCurso(cursoId).length;
  
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [cursoParaExcluir, setCursoParaExcluir] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrar cursos
  const cursosFiltrados = useMemo(() => {
    return filtrarCursos(busca, statusFiltro);
  }, [busca, statusFiltro, filtrarCursos]);

  // Paginação
  const totalPaginas = Math.ceil(cursosFiltrados.length / ITEMS_PER_PAGE);
  const cursosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE;
    return cursosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [cursosFiltrados, paginaAtual]);

  // Resetar página ao filtrar
  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setPaginaAtual(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFiltro(value);
    setPaginaAtual(1);
  };

  // Excluir curso
  const handleExcluir = async () => {
    if (cursoParaExcluir) {
      setIsDeleting(true);
      try {
        await excluirCurso(cursoParaExcluir);
        toast.success("Curso excluído com sucesso!");
      } finally {
        setIsDeleting(false);
        setCursoParaExcluir(null);
      }
    }
  };

  // Alternar status do curso
  const handleToggleStatus = async (cursoId: string, statusAtual: string) => {
    const novoStatus = statusAtual === "Publicado" ? "Rascunho" : "Publicado";
    
    try {
      await editarCurso(cursoId, { status: novoStatus } as any);
      toast.success(
        novoStatus === "Publicado" 
          ? "Curso publicado com sucesso!" 
          : "Curso despublicado"
      );
    } catch (error) {
      toast.error("Erro ao alterar status do curso");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        
        {/* Filtros skeleton */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-48" />
        </div>
        
        {/* Tabela skeleton */}
        <div className="glass-card rounded-xl border border-border/50 p-4">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-16 h-12 rounded-lg" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-12" />
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
          <h1 className="text-3xl font-bold text-foreground">Cursos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seu catálogo e conteúdo de cursos.
          </p>
        </div>
        <Button 
          className="gold-button gap-2 w-full sm:w-auto"
          onClick={() => navigate("/admin/courses/new")}
        >
          <Plus className="h-4 w-4" />
          Criar Novo Curso
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do curso..."
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 focus:border-primary/50"
          />
        </div>
        <Select value={statusFiltro} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-48 bg-card/50 border-border/50">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Publicado">Publicado</SelectItem>
            <SelectItem value="Rascunho">Rascunho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela de Cursos - Desktop */}
      {!isMobile && (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full min-w-[800px]">
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[6%] text-muted-foreground">Capa</TableHead>
                <TableHead className="w-[22%] text-muted-foreground">Nome do Curso</TableHead>
                <TableHead className="w-[18%] text-muted-foreground">Tipo</TableHead>
                <TableHead className="w-[18%] text-muted-foreground">Status</TableHead>
                <TableHead className="w-[12%] text-center text-muted-foreground">Módulos</TableHead>
                <TableHead className="w-[12%] text-center text-muted-foreground">Aulas</TableHead>
                <TableHead className="w-[12%] text-right text-muted-foreground">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="stagger-fade-in">
              {cursosPaginados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    {busca || statusFiltro !== "todos" 
                      ? "Nenhum curso encontrado com os filtros aplicados."
                      : "Nenhum curso cadastrado. Clique em 'Criar Novo Curso' para começar."
                    }
                  </TableCell>
                </TableRow>
              ) : (
                cursosPaginados.map((curso) => (
                  <TableRow 
                    key={curso.id} 
                    className="border-border/50 hover:bg-white/5 transition-colors"
                  >
                    <TableCell>
                      <div className="w-16 h-12 rounded-lg overflow-hidden bg-card/50">
                        <img
                          src={curso.imagem}
                          alt={curso.titulo}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      <span className="truncate block">{curso.titulo}</span>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-2">
                        <div className={
                          curso.tipo === "video" ? "p-1.5 rounded bg-blue-500/20" :
                          curso.tipo === "pdf" ? "p-1.5 rounded bg-pink-500/20" :
                          curso.tipo === "arquivo" ? "p-1.5 rounded bg-blue-500/20" :
                          "p-1.5 rounded bg-gray-500/20"
                        }>
                          {curso.tipo === "video" && <Video className="h-4 w-4 text-blue-400" />}
                          {curso.tipo === "pdf" && <FileText className="h-4 w-4 text-pink-400" />}
                          {curso.tipo === "arquivo" && <FileIcon className="h-4 w-4 text-blue-400" />}
                          {curso.tipo === "externo" && <Link2 className="h-4 w-4 text-gray-400" />}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {curso.tipo === "video" ? "Vídeo" :
                           curso.tipo === "pdf" ? "PDF" :
                           curso.tipo === "arquivo" ? "Arquivo" :
                           "Link"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={`gap-1.5 font-medium ${
                          curso.status === "Publicado"
                            ? "bg-green-500/20 text-green-400 border border-green-500/40"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                        }`}
                      >
                        {curso.status === "Publicado" ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            Publicado
                          </>
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-orange-400" />
                            Rascunho
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {getTotalModulos(curso.id)}
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {getTotalAulas(curso.id)}
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
                            onClick={() => navigate(`/admin/courses/${curso.id}`)}
                            className="gap-2 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                            Gerenciar Curso
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(curso.id, curso.status)}
                            className={`gap-2 cursor-pointer ${
                              curso.status === "Rascunho" 
                                ? "text-green-500 focus:text-green-500" 
                                : "text-yellow-500 focus:text-yellow-500"
                            }`}
                          >
                            {curso.status === "Rascunho" ? (
                              <>
                                <Send className="h-4 w-4" />
                                Publicar
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-4 w-4" />
                                Despublicar
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-border/50" />
                          <DropdownMenuItem
                            onClick={() => setCursoParaExcluir(curso.id)}
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

      {/* Cards de Cursos - Mobile */}
      {isMobile && (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          {cursosPaginados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {busca || statusFiltro !== "todos" 
                ? "Nenhum curso encontrado com os filtros aplicados."
                : "Nenhum curso cadastrado. Clique em 'Criar Novo Curso' para começar."
              }
            </div>
          ) : (
            cursosPaginados.map((curso) => (
              <div 
                key={curso.id}
                className="p-4 border-b border-border/50 last:border-b-0"
              >
                <div className="flex items-start gap-3">
                  <div className="w-16 h-12 rounded-lg overflow-hidden bg-card/50 flex-shrink-0">
                    <img
                      src={curso.imagem}
                      alt={curso.titulo}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground truncate">{curso.titulo}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        className={`gap-1 text-xs font-medium ${
                          curso.status === "Publicado"
                            ? "bg-green-500/20 text-green-400 border border-green-500/40"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          curso.status === "Publicado" ? "bg-green-400" : "bg-orange-400"
                        }`} />
                        {curso.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {getTotalModulos(curso.id)} mód · {getTotalAulas(curso.id)} aulas
                      </span>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-11 w-11 flex-shrink-0">
                        <MoreHorizontal className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-card border-border/50 max-w-[calc(100vw-2rem)]">
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/courses/${curso.id}`)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Pencil className="h-4 w-4" />
                        Gerenciar Curso
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(curso.id, curso.status)}
                        className={`gap-2 cursor-pointer min-h-[44px] py-3 ${
                          curso.status === "Rascunho" 
                            ? "text-green-500 focus:text-green-500" 
                            : "text-yellow-500 focus:text-yellow-500"
                        }`}
                      >
                        {curso.status === "Rascunho" ? (
                          <>
                            <Send className="h-4 w-4" />
                            Publicar
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Despublicar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => setCursoParaExcluir(curso.id)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
      <AlertDialog open={!!cursoParaExcluir} onOpenChange={() => setCursoParaExcluir(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este curso? Esta ação não pode ser desfeita.
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
    </div>
  );
}
