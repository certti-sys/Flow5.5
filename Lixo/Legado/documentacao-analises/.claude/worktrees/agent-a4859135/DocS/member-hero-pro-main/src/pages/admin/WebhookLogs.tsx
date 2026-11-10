import { useState, useMemo } from "react";
import { ArrowLeft, Search, RefreshCw, Trash2, CheckCircle2, XCircle, Clock, Filter } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useSupabaseWebhooks } from "@/hooks/useSupabaseWebhooks";
import { useCourses } from "@/hooks/useCourses";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ITEMS_PER_PAGE = 10;

const plataformas = [
  { value: "hotmart", label: "Hotmart" },
  { value: "kiwify", label: "Kiwify" },
  { value: "monetizze", label: "Monetizze" },
  { value: "eduzz", label: "Eduzz" },
  { value: "bripe", label: "Bripe" },
];

export default function WebhookLogs() {
  const navigate = useNavigate();
  const { webhookLogs, limparLogs, isLoading } = useSupabaseWebhooks();
  const { cursos } = useCourses();
  
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [cursoFiltro, setCursoFiltro] = useState("todos");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [logSelecionado, setLogSelecionado] = useState<any | null>(null);
  const [confirmarLimpeza, setConfirmarLimpeza] = useState(false);

  const logsFiltrados = useMemo(() => {
    return webhookLogs.filter(log => {
      const matchBusca = !busca || 
        JSON.stringify(log.payload).toLowerCase().includes(busca.toLowerCase()) ||
        (log.message || '').toLowerCase().includes(busca.toLowerCase());
      const matchStatus = statusFiltro === "todos" || log.status === statusFiltro;
      const matchCurso = cursoFiltro === "todos" || log.course_id === cursoFiltro;
      return matchBusca && matchStatus && matchCurso;
    });
  }, [webhookLogs, busca, statusFiltro, cursoFiltro]);

  const totalPaginas = Math.ceil(logsFiltrados.length / ITEMS_PER_PAGE);
  const logsPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITEMS_PER_PAGE;
    return logsFiltrados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [logsFiltrados, paginaAtual]);

  const getCursoNome = (cursoId: string | null) => {
    if (!cursoId) return 'Curso não especificado';
    return cursos.find(c => c.id === cursoId)?.titulo || 'Curso não encontrado';
  };

  const getPlataformaLabel = (plataforma: string) => {
    return plataformas.find(p => p.value === plataforma)?.label || plataforma;
  };

  const formatarData = (dataString: string) => {
    return new Date(dataString).toLocaleString("pt-BR");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-primary" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Sucesso</Badge>;
      case 'error':
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Erro</Badge>;
      case 'pending':
        return <Badge className="bg-primary/20 text-primary border-primary/30">Processando</Badge>;
      default:
        return <Badge className="bg-muted/20 text-muted-foreground border-muted/30">{status}</Badge>;
    }
  };

  const handleLimparLogs = () => {
    limparLogs();
    toast.success("Logs limpos com sucesso!");
    setConfirmarLimpeza(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando logs...</div>
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
            onClick={() => navigate("/admin/webhooks")}
            className="h-10 w-10 rounded-xl"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Logs de Webhooks</h1>
            <p className="text-muted-foreground mt-1">
              Histórico de eventos recebidos
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-border/50 gap-2"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          {webhookLogs.length > 0 && (
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => setConfirmarLimpeza(true)}
            >
              <Trash2 className="h-4 w-4" />
              Limpar Logs
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar nos logs..."
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPaginaAtual(1); }}
            className="pl-10 bg-card/50 border-border/50"
          />
        </div>
        <Select value={statusFiltro} onValueChange={(v) => { setStatusFiltro(v); setPaginaAtual(1); }}>
          <SelectTrigger className="w-full sm:w-40 bg-card/50 border-border/50">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="sucesso">Sucesso</SelectItem>
            <SelectItem value="erro">Erro</SelectItem>
            <SelectItem value="processando">Processando</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cursoFiltro} onValueChange={(v) => { setCursoFiltro(v); setPaginaAtual(1); }}>
          <SelectTrigger className="w-full sm:w-48 bg-card/50 border-border/50">
            <SelectValue placeholder="Curso" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border/50">
            <SelectItem value="todos">Todos os cursos</SelectItem>
            {cursos.map(curso => (
              <SelectItem key={curso.id} value={curso.id}>
                {curso.titulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Logs */}
      {webhookLogs.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-medium text-foreground mb-2">
            Nenhum log registrado
          </h2>
          <p className="text-muted-foreground">
            Os eventos de webhook aparecerão aqui quando forem recebidos.
          </p>
        </div>
      ) : logsFiltrados.length === 0 ? (
        <div className="glass-card rounded-xl p-12 text-center">
          <Search className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
          <h2 className="text-xl font-medium text-foreground mb-2">
            Nenhum resultado encontrado
          </h2>
          <p className="text-muted-foreground">
            Tente ajustar os filtros de busca.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {logsPaginados.map((log) => (
            <div
              key={log.id}
              onClick={() => setLogSelecionado(log)}
              className="glass-card rounded-xl p-4 border border-border/50 cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {getStatusIcon(log.status)}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-foreground">
                        {log.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      {getStatusBadge(log.status)}
                      <Badge variant="outline" className="border-border/50 text-xs">
                        {getPlataformaLabel(log.platform)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getCursoNome(log.course_id)} • {log.message || 'Sem mensagem'}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {formatarData(log.created_at || new Date().toISOString())}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
            disabled={paginaAtual === 1}
            className="min-h-[44px]"
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {paginaAtual} de {totalPaginas}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaAtual === totalPaginas}
            className="min-h-[44px]"
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Modal de Detalhes do Log */}
      <Dialog open={!!logSelecionado} onOpenChange={() => setLogSelecionado(null)}>
        <DialogContent className="bg-card border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
          </DialogHeader>
          {logSelecionado && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Evento</p>
                  <p className="font-medium">{logSelecionado.event_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(logSelecionado.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plataforma</p>
                  <p className="font-medium">{getPlataformaLabel(logSelecionado.platform)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Curso</p>
                  <p className="font-medium">{getCursoNome(logSelecionado.course_id)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{formatarData(logSelecionado.created_at || new Date().toISOString())}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Mensagem</p>
                  <p className="font-medium">{logSelecionado.message || 'Sem mensagem'}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Payload</p>
                <pre className="p-4 rounded-lg bg-black/30 overflow-auto text-xs text-muted-foreground">
                  {JSON.stringify(logSelecionado.payload, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Limpeza */}
      <AlertDialog open={confirmarLimpeza} onOpenChange={setConfirmarLimpeza}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar todos os logs?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os logs de webhook serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border/50">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLimparLogs}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Limpar Logs
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
