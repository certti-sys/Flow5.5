import { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, ArrowLeft, Video, Layers, Eye, EyeOff } from "lucide-react";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRow } from "@/components/admin/SortableRow";
import { useModules } from "@/hooks/useModules";
import { useCourses } from "@/hooks/useCourses";
import { useLessons } from "@/hooks/useLessons";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 6;

export default function ModulesListing() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const isMobile = useIsMobile();
  
  const { obterModulosPorCurso, excluirModulo, reordenarModulos, alterarStatusModulo, isLoading } = useModules();
  const { obterCurso } = useCourses();
  const { obterAulasPorModulo } = useLessons();
  
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [moduloParaExcluir, setModuloParaExcluir] = useState<string | null>(null);

  const curso = courseId ? obterCurso(courseId) : null;
  const modulos = courseId ? obterModulosPorCurso(courseId) : [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtrar módulos
  const modulosFiltrados = useMemo(() => {
    let resultado = modulos;
    
    if (busca) {
      resultado = resultado.filter(m => 
        m.nome.toLowerCase().includes(busca.toLowerCase())
      );
    }
    
    if (statusFiltro !== "todos") {
      resultado = resultado.filter(m => m.status === statusFiltro);
    }
    
    return resultado;
  }, [modulos, busca, statusFiltro]);

  // Paginação
  const totalPaginas = Math.ceil(modulosFiltrados.length / ITEMS_PER_PAGE);
  const modulosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE;
    return modulosFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [modulosFiltrados, paginaAtual]);

  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setPaginaAtual(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFiltro(value);
    setPaginaAtual(1);
  };

  const handleExcluir = () => {
    if (moduloParaExcluir) {
      excluirModulo(moduloParaExcluir);
      toast.success("Módulo excluído com sucesso!");
      setModuloParaExcluir(null);
    }
  };

  const handleToggleStatus = async (moduloId: string) => {
    await alterarStatusModulo(moduloId);
    toast.success("Status do módulo alterado com sucesso!");
  };

  const getAulasCount = (moduloId: string) => {
    return obterAulasPorModulo(moduloId).length;
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && courseId) {
      const oldIndex = modulosFiltrados.findIndex((m) => m.id === active.id);
      const newIndex = modulosFiltrados.findIndex((m) => m.id === over.id);
      
      const novaOrdem = arrayMove(modulosFiltrados, oldIndex, newIndex);
      await reordenarModulos(novaOrdem);
      toast.success("Ordem dos módulos atualizada!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando módulos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/courses")}
            className="h-11 w-11 min-w-[44px] rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {curso ? `Módulos de: ${curso.titulo}` : 'Módulos'}
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie, organize e reordene os módulos deste curso.
            </p>
          </div>
        </div>
        <Button 
          className="gold-button gap-2 min-h-[44px] w-full sm:w-auto"
          onClick={() => navigate(`/admin/modules/new?courseId=${courseId}`)}
        >
          <Plus className="h-4 w-4" />
          Criar Novo Módulo
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome do módulo..."
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            className="pl-10 bg-card/50 border-border/50 focus:border-primary/50 min-h-[44px]"
          />
        </div>
        <Select value={statusFiltro} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-48 bg-card/50 border-border/50 min-h-[44px]">
            <SelectValue placeholder="Todos os status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="Publicado">Publicado</SelectItem>
            <SelectItem value="Rascunho">Rascunho</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Info de drag */}
      {!isMobile && !busca && statusFiltro === "todos" && modulosFiltrados.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Arraste os módulos para reordenar
        </p>
      )}

      {/* Mobile Cards / Desktop Table */}
      {isMobile ? (
        <div className="space-y-3">
          {modulosPaginados.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              {busca || statusFiltro !== "todos"
                ? "Nenhum módulo encontrado com os filtros aplicados."
                : "Nenhum módulo cadastrado. Clique em 'Criar Novo Módulo' para começar."
              }
            </div>
          ) : (
            modulosPaginados.map((modulo) => (
              <div key={modulo.id} className="glass-card p-4 rounded-xl border border-border/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-card/50 flex items-center justify-center flex-shrink-0">
                    {modulo.imagem ? (
                      <img
                        src={modulo.imagem}
                        alt={modulo.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Layers className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{modulo.nome}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="secondary" className="bg-muted/50">
                        {getAulasCount(modulo.id)} aulas
                      </Badge>
                      <Badge
                        variant={modulo.status === "Publicado" ? "default" : "secondary"}
                        className={
                          modulo.status === "Publicado"
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-muted/50 text-muted-foreground border-muted/30"
                        }
                      >
                        {modulo.status || 'Rascunho'}
                      </Badge>
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
                        onClick={() => navigate(`/admin/modules/${modulo.id}/edit`)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleStatus(modulo.id)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        {modulo.status === 'Publicado' ? (
                          <>
                            <EyeOff className="h-4 w-4" />
                            Despublicar
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4" />
                            Publicar
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/modules/${modulo.id}/lessons`)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Video className="h-4 w-4" />
                        Ver Aulas
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => navigate(`/admin/lessons/new?moduleId=${modulo.id}&courseId=${courseId}`)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Plus className="h-4 w-4" />
                        Criar Aula
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-border/50" />
                      <DropdownMenuItem
                        onClick={() => setModuloParaExcluir(modulo.id)}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive min-h-[44px] py-3"
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
      ) : (
        <div className="glass-card rounded-xl border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground w-10"></TableHead>
                <TableHead className="text-muted-foreground w-16">#</TableHead>
                <TableHead className="text-muted-foreground">Imagem</TableHead>
                <TableHead className="text-muted-foreground">Nome do Módulo</TableHead>
                <TableHead className="text-muted-foreground text-center">Aulas</TableHead>
                <TableHead className="text-muted-foreground text-center">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={modulosPaginados.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {modulosPaginados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {busca || statusFiltro !== "todos"
                          ? "Nenhum módulo encontrado com os filtros aplicados."
                          : "Nenhum módulo cadastrado. Clique em 'Criar Novo Módulo' para começar."
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    modulosPaginados.map((modulo) => (
                      <SortableRow key={modulo.id} id={modulo.id}>
                        <TableCell className="font-bold text-primary">
                          {modulo.ordem}
                        </TableCell>
                        <TableCell>
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-card/50 flex items-center justify-center">
                            {modulo.imagem ? (
                              <img
                                src={modulo.imagem}
                                alt={modulo.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Layers className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground max-w-xs">
                          <div>
                            <span className="line-clamp-1">{modulo.nome}</span>
                            {modulo.descricao && (
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {modulo.descricao}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {getAulasCount(modulo.id)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={modulo.status === "Publicado" ? "default" : "secondary"}
                            className={
                              modulo.status === "Publicado"
                                ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                                : "bg-muted/50 text-muted-foreground border-muted/30"
                            }
                          >
                            {modulo.status || 'Rascunho'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card border-border/50">
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/modules/${modulo.id}/edit`)}
                                className="gap-2 cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(modulo.id)}
                                className="gap-2 cursor-pointer"
                              >
                                {modulo.status === 'Publicado' ? (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Despublicar
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-4 w-4" />
                                    Publicar
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border/50" />
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/modules/${modulo.id}/lessons`)}
                                className="gap-2 cursor-pointer"
                              >
                                <Video className="h-4 w-4" />
                                Ver Aulas
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/lessons/new?moduleId=${modulo.id}&courseId=${courseId}`)}
                                className="gap-2 cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                                Criar Aula
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-border/50" />
                              <DropdownMenuItem
                                onClick={() => setModuloParaExcluir(modulo.id)}
                                className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </SortableRow>
                    ))
                  )}
                </TableBody>
              </SortableContext>
            </DndContext>
          </Table>
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
            className="h-11 w-11 min-h-[44px]"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
            <Button
              key={pagina}
              variant={pagina === paginaAtual ? "default" : "ghost"}
              size="icon"
              onClick={() => setPaginaAtual(pagina)}
              className={`h-11 w-11 min-h-[44px] ${
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
            className="h-11 w-11 min-h-[44px]"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      <AlertDialog open={!!moduloParaExcluir} onOpenChange={() => setModuloParaExcluir(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este módulo? Esta ação não pode ser desfeita e todas as aulas associadas serão perdidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="border-border/50 min-h-[44px]">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluir}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px]"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}