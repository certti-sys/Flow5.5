import React, { useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Plus, Search, MoreHorizontal, Pencil, Trash2, ChevronLeft, ChevronRight, 
  ArrowLeft, Video, FileText, Link as LinkIcon, File, Eye, EyeOff 
} from "lucide-react";
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
import { useLessons } from "@/hooks/useLessons";
import { useModules } from "@/hooks/useModules";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 6;

const tipoConfig: Record<string, { 
  icon: React.ElementType; 
  label: string; 
  color: string; 
  bg: string;
  iconNode: React.ReactNode;
}> = {
  video: { 
    icon: Video,
    iconNode: <Video className="h-4 w-4" />,
    label: "Vídeo",
    color: "text-blue-400", 
    bg: "bg-blue-500/20" 
  },
  pdf: { 
    icon: FileText,
    iconNode: <FileText className="h-4 w-4" />,
    label: "PDF",
    color: "text-pink-400", 
    bg: "bg-pink-500/20" 
  },
  arquivo: { 
    icon: File,
    iconNode: <File className="h-4 w-4" />,
    label: "Arquivo",
    color: "text-blue-400", 
    bg: "bg-blue-500/20" 
  },
  externo: { 
    icon: LinkIcon,
    iconNode: <LinkIcon className="h-4 w-4" />,
    label: "Link",
    color: "text-gray-400", 
    bg: "bg-gray-500/20" 
  },
};

export default function LessonsListing() {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const isMobile = useIsMobile();
  
  const { obterAulasPorModulo, excluirAula, alterarStatus, reordenarAulas, isLoading } = useLessons();
  const { obterModulo } = useModules();
  
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [aulaParaExcluir, setAulaParaExcluir] = useState<string | null>(null);

  const modulo = moduleId ? obterModulo(moduleId) : null;
  const aulas = moduleId ? obterAulasPorModulo(moduleId) : [];

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filtrar aulas
  const aulasFiltradas = useMemo(() => {
    return aulas.filter(aula => {
      const matchBusca = !busca || aula.nome.toLowerCase().includes(busca.toLowerCase());
      const matchStatus = statusFiltro === "todos" || aula.status === statusFiltro;
      return matchBusca && matchStatus;
    });
  }, [aulas, busca, statusFiltro]);

  // Paginação
  const totalPaginas = Math.ceil(aulasFiltradas.length / ITEMS_PER_PAGE);
  const aulasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE;
    return aulasFiltradas.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [aulasFiltradas, paginaAtual]);

  const handleBuscaChange = (value: string) => {
    setBusca(value);
    setPaginaAtual(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFiltro(value);
    setPaginaAtual(1);
  };

  const handleExcluir = async () => {
    if (aulaParaExcluir) {
      await excluirAula(aulaParaExcluir);
      toast.success("Aula excluída com sucesso!");
      setAulaParaExcluir(null);
    }
  };

  const handleAlternarStatus = async (id: string) => {
    await alterarStatus(id);
    toast.success("Status da aula alterado com sucesso!");
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && moduleId) {
      const oldIndex = aulasFiltradas.findIndex((a) => a.id === active.id);
      const newIndex = aulasFiltradas.findIndex((a) => a.id === over.id);
      
      const novaOrdem = arrayMove(aulasFiltradas, oldIndex, newIndex);
      await reordenarAulas(novaOrdem);
      toast.success("Ordem das aulas atualizada!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando aulas...</div>
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
            onClick={() => modulo ? navigate(`/admin/courses/${modulo.cursoId}/modules`) : navigate("/admin/courses")}
            className="h-11 w-11 min-w-[44px] rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Aulas</h1>
            {modulo && (
              <p className="text-muted-foreground mt-1">
                Módulo: {modulo.nome}
              </p>
            )}
          </div>
        </div>
        <Button 
          className="gold-button gap-2 min-h-[44px] w-full sm:w-auto"
          onClick={() => navigate(`/admin/lessons/new?moduleId=${moduleId}${modulo ? `&courseId=${modulo.cursoId}` : ''}`)}
        >
          <Plus className="h-4 w-4" />
          Criar Nova Aula
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome da aula..."
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
      {!isMobile && !busca && statusFiltro === "todos" && aulasFiltradas.length > 1 && (
        <p className="text-sm text-muted-foreground">
          Arraste as aulas para reordenar
        </p>
      )}

      {/* Mobile Cards / Desktop Table */}
      {isMobile ? (
        <div className="space-y-3">
          {aulasPaginadas.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">
              {busca || statusFiltro !== "todos" 
                ? "Nenhuma aula encontrada com os filtros aplicados."
                : "Nenhuma aula cadastrada. Clique em 'Criar Nova Aula' para começar."
              }
            </div>
          ) : (
            aulasPaginadas.map((aula) => (
              <div key={aula.id} className="glass-card p-4 rounded-xl border border-border/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-10 rounded-lg overflow-hidden bg-card/50 flex items-center justify-center flex-shrink-0">
                    {aula.thumbnail ? (
                      <img
                        src={aula.thumbnail}
                        alt={aula.nome}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      tipoConfig[aula.tipo]?.iconNode || <Video className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground line-clamp-1">{aula.nome}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={`${tipoConfig[aula.tipo]?.bg || "bg-gray-500/20"} ${tipoConfig[aula.tipo]?.color || "text-gray-400"} border-0`}>
                        {tipoConfig[aula.tipo]?.label || aula.tipo}
                      </Badge>
                      <Badge
                        variant={aula.status === "Publicado" ? "default" : "secondary"}
                        className={
                          aula.status === "Publicado"
                            ? "bg-primary/20 text-primary border-primary/30"
                            : "bg-muted/50 text-muted-foreground border-muted/30"
                        }
                      >
                        {aula.status}
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
                        onClick={() => navigate(`/admin/lessons/${aula.id}/edit`)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleAlternarStatus(aula.id)}
                        className="gap-2 cursor-pointer min-h-[44px] py-3"
                      >
                        {aula.status === "Publicado" ? (
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
                        onClick={() => setAulaParaExcluir(aula.id)}
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
                <TableHead className="text-muted-foreground">Thumb</TableHead>
                <TableHead className="text-muted-foreground">Nome da Aula</TableHead>
                <TableHead className="text-muted-foreground text-center">Tipo</TableHead>
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
                items={aulasPaginadas.map(a => a.id)}
                strategy={verticalListSortingStrategy}
              >
                <TableBody>
                  {aulasPaginadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {busca || statusFiltro !== "todos" 
                          ? "Nenhuma aula encontrada com os filtros aplicados."
                          : "Nenhuma aula cadastrada. Clique em 'Criar Nova Aula' para começar."
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    aulasPaginadas.map((aula) => (
                      <SortableRow key={aula.id} id={aula.id}>
                        <TableCell className="font-bold text-primary">
                          {aula.ordem}
                        </TableCell>
                        <TableCell>
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-card/50 flex items-center justify-center">
                            {aula.thumbnail ? (
                              <img
                                src={aula.thumbnail}
                                alt={aula.nome}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              tipoConfig[aula.tipo]?.iconNode || <Video className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-foreground max-w-xs">
                          <div>
                            <span className="line-clamp-1">{aula.nome}</span>
                            {aula.descricao && (
                              <span className="text-sm text-muted-foreground line-clamp-1">
                                {aula.descricao}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="inline-flex items-center gap-2">
                            <div className={`p-1.5 rounded ${tipoConfig[aula.tipo]?.bg || "bg-gray-500/20"}`}>
                              {React.createElement(tipoConfig[aula.tipo]?.icon || Video, { 
                                className: `h-4 w-4 ${tipoConfig[aula.tipo]?.color || "text-gray-400"}`
                              })}
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {tipoConfig[aula.tipo]?.label || aula.tipo}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={aula.status === "Publicado" ? "default" : "secondary"}
                            className={
                              aula.status === "Publicado"
                                ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                                : "bg-muted/50 text-muted-foreground border-muted/30"
                            }
                          >
                            {aula.status}
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
                                onClick={() => navigate(`/admin/lessons/${aula.id}/edit`)}
                                className="gap-2 cursor-pointer"
                              >
                                <Pencil className="h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleAlternarStatus(aula.id)}
                                className="gap-2 cursor-pointer"
                              >
                                {aula.status === "Publicado" ? (
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
                                onClick={() => setAulaParaExcluir(aula.id)}
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
      <AlertDialog open={!!aulaParaExcluir} onOpenChange={() => setAulaParaExcluir(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta aula? Esta ação não pode ser desfeita.
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