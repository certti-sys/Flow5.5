import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Eye, RefreshCw, CheckCircle2, XCircle, Clock, AlertTriangle, Wand2, Trash2, Loader2, UserPlus, KeyRound, ShieldCheck, ShieldOff, ChevronDown, Activity, UserCheck, UserX, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConfigureMappingsWizard } from "./ConfigureMappingsWizard";
import { toast } from "sonner";

interface Platform {
  id: string;
  name: string;
  display_name: string;
}

interface WebhookTransactionsListProps {
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
  platforms: Platform[];
}

// Helper para extrair ações do processing_result
function extractActions(processingResult: any): { type: 'granted' | 'revoked' | 'none' | 'error'; actions: string[] } {
  if (!processingResult) {
    return { type: 'none', actions: [] };
  }

  const actions: string[] = [];
  let hasGranted = false;
  let hasRevoked = false;

  // Extrair ações do autoProcess
  if (processingResult.autoProcess?.actions) {
    const autoActions = processingResult.autoProcess.actions;
    if (Array.isArray(autoActions)) {
      autoActions.forEach((action: string) => {
        actions.push(action);
        if (action.toLowerCase().includes('concedido') || action.toLowerCase().includes('criado')) {
          hasGranted = true;
        }
        if (action.toLowerCase().includes('removido') || action.toLowerCase().includes('revogado')) {
          hasRevoked = true;
        }
      });
    }
  }

  // Verificar erros
  if (processingResult.autoProcess?.error || processingResult.error) {
    return { type: 'error', actions };
  }

  if (hasRevoked) return { type: 'revoked', actions };
  if (hasGranted) return { type: 'granted', actions };
  return { type: 'none', actions };
}

export function WebhookTransactionsList({
  selectedPlatform,
  onSelectPlatform,
  platforms
}: WebhookTransactionsListProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardTransaction, setWizardTransaction] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteAllConfirmOpen, setDeleteAllConfirmOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['webhook-transactions', selectedPlatform, statusFilter, search],
    queryFn: async () => {
      let query = supabase
        .from('webhook_transactions')
        .select(`
          *,
          platform:webhook_platforms(name, display_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (selectedPlatform) {
        query = query.eq('platform_id', selectedPlatform);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (search) {
        query = query.or(`customer_email.ilike.%${search}%,external_transaction_id.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Filtrar por tipo de ação (client-side)
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (actionFilter === 'all') return transactions;

    return transactions.filter(tx => {
      const { type } = extractActions(tx.processing_result);
      return type === actionFilter;
    });
  }, [transactions, actionFilter]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    if (!transactions) return { total: 0, granted: 0, revoked: 0, errors: 0 };

    let granted = 0;
    let revoked = 0;
    let errors = 0;

    transactions.forEach(tx => {
      const { type } = extractActions(tx.processing_result);
      if (type === 'granted') granted++;
      else if (type === 'revoked') revoked++;
      else if (type === 'error' || tx.status === 'error') errors++;
    });

    return { total: transactions.length, granted, revoked, errors };
  }, [transactions]);

  // Mutation para deletar uma transação
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-transactions'] });
      toast.success("Transação removida com sucesso!");
      setDeleteConfirmOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  // Mutation para deletar todas as transações filtradas
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      let query = supabase
        .from('webhook_transactions')
        .delete();

      if (selectedPlatform) {
        query = query.eq('platform_id', selectedPlatform);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (search) {
        query = query.or(`customer_email.ilike.%${search}%,external_transaction_id.ilike.%${search}%`);
      }

      // Necessário adicionar um filtro para que o delete funcione
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhook-transactions'] });
      toast.success("Transações removidas com sucesso!");
      setDeleteAllConfirmOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Processado</Badge>;
      case 'received':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Recebido</Badge>;
      case 'failed':
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Falhou</Badge>;
      case 'pending':
        return <Badge variant="outline"><AlertTriangle className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getActionBadge = (processingResult: any) => {
    const { type } = extractActions(processingResult);

    switch (type) {
      case 'granted':
        return (
          <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Acesso Concedido
          </Badge>
        );
      case 'revoked':
        return (
          <Badge variant="outline" className="border-rose-500/50 text-rose-400 bg-rose-500/10">
            <ShieldOff className="w-3 h-3 mr-1" />
            Acesso Removido
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Erro
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-muted-foreground">
            <Minus className="w-3 h-3 mr-1" />
            Sem Ação
          </Badge>
        );
    }
  };

  const openDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setDetailsOpen(true);
    setJsonExpanded(false);
  };

  const openMappingWizard = (transaction: any) => {
    setWizardTransaction(transaction);
    setWizardOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (transactionToDelete) {
      deleteMutation.mutate(transactionToDelete);
    }
  };

  const confirmDeleteAll = () => {
    deleteAllMutation.mutate();
  };

  // Renderizar cards de ações no modal de detalhes
  const renderActionCards = (processingResult: any) => {
    if (!processingResult) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum resultado de processamento disponível
        </div>
      );
    }

    const { actions } = extractActions(processingResult);
    const autoProcess = processingResult.autoProcess;

    return (
      <div className="space-y-4">
        {/* Status Geral */}
        <Card className={autoProcess?.success ? "border-green-200 bg-green-50/50 dark:bg-green-950/20" : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"}>
          <CardContent className="py-3">
            <div className="flex items-center gap-2">
              {autoProcess?.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
              <span className="font-medium">
                {autoProcess?.success ? "Processado com sucesso" : "Processado com avisos"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ações Executadas */}
        {actions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Ações Executadas:</p>
            {actions.map((action, index) => {
              const isGrant = action.toLowerCase().includes('concedido') || action.toLowerCase().includes('criado');
              const isRevoke = action.toLowerCase().includes('removido') || action.toLowerCase().includes('revogado');

              return (
                <Card key={index} className="border-l-4" style={{
                  borderLeftColor: isRevoke ? 'hsl(var(--destructive))' : isGrant ? 'hsl(142 76% 36%)' : 'hsl(var(--muted))'
                }}>
                  <CardContent className="py-2 px-3 flex items-center gap-2">
                    {action.includes('Usuário criado') && <UserPlus className="w-4 h-4 text-blue-500" />}
                    {action.includes('Senha temporária') && <KeyRound className="w-4 h-4 text-amber-500" />}
                    {action.includes('concedido') && <ShieldCheck className="w-4 h-4 text-green-500" />}
                    {action.includes('removido') && <ShieldOff className="w-4 h-4 text-red-500" />}
                    <span className="text-sm">{action}</span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Erro se houver */}
        {autoProcess?.error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-3">
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Erro: {autoProcess.error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* JSON Colapsável */}
        <Collapsible open={jsonExpanded} onOpenChange={setJsonExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between text-muted-foreground">
              <span>Ver JSON completo</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${jsonExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[200px] rounded-md border bg-muted/30 mt-2">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                {JSON.stringify(processingResult, null, 2)}
              </pre>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total - Neutro/Roxo primário */}
        <Card className="bg-card border-white/[0.08]">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <Activity className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acessos Concedidos - Verde vibrante */}
        <Card className="bg-emerald-500/10 border-emerald-500/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <UserCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">{stats.granted}</p>
                <p className="text-xs text-emerald-400/70">Acessos Concedidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Acessos Removidos - Vermelho/Rosa */}
        <Card className="bg-rose-500/10 border-rose-500/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-rose-500/20">
                <UserX className="w-4 h-4 text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-400">{stats.revoked}</p>
                <p className="text-xs text-rose-400/70">Acessos Removidos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Erros - Âmbar/Amarelo */}
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{stats.errors}</p>
                <p className="text-xs text-amber-400/70">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou ID da transação..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedPlatform || "all"}
          onValueChange={(v) => onSelectPlatform(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {platforms.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="completed">Processado</SelectItem>
            <SelectItem value="received">Recebido</SelectItem>
            <SelectItem value="error">Falhou</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Ações</SelectItem>
            <SelectItem value="granted">Acesso Concedido</SelectItem>
            <SelectItem value="revoked">Acesso Removido</SelectItem>
            <SelectItem value="none">Sem Ação</SelectItem>
            <SelectItem value="error">Com Erro</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
        </Button>
        {filteredTransactions && filteredTransactions.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteAllConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Limpar Todas
          </Button>
        )}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : filteredTransactions && filteredTransactions.length > 0 ? (
        <div className="space-y-2">
          {filteredTransactions.map((tx) => (
            <Card key={tx.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{tx.customer_email}</span>
                      {tx.platform && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {tx.platform.display_name}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="font-mono text-xs shrink-0">
                        {tx.event_type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="font-mono truncate max-w-[200px]">
                        {tx.external_transaction_id}
                      </span>
                      <span>
                        {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {getActionBadge(tx.processing_result)}
                    {getStatusBadge(tx.status)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openMappingWizard(tx)}
                      className="hidden sm:flex"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      Configurar
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDetails(tx)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(tx.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhuma transação encontrada
          </CardContent>
        </Card>
      )}

      {/* Modal de Detalhes */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-[920px] max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>Detalhes da Transação</DialogTitle>
            <DialogDescription>
              {selectedTransaction?.external_transaction_id}
            </DialogDescription>
          </DialogHeader>

          {selectedTransaction && (
            <div className="flex-1 overflow-y-auto pr-2">
              <Tabs defaultValue="info">
                <TabsList className="mb-4">
                  <TabsTrigger value="info">Informações</TabsTrigger>
                  <TabsTrigger value="payload">Payload</TabsTrigger>
                  <TabsTrigger value="result">Resultado</TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="space-y-4">
                  {/* Badge de ação no topo */}
                  <div className="flex items-center gap-2">
                    {getActionBadge(selectedTransaction.processing_result)}
                    {getStatusBadge(selectedTransaction.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Plataforma</p>
                      <p className="font-medium">{selectedTransaction.platform?.display_name || 'Não identificada'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedTransaction.customer_email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Nome</p>
                      <p className="font-medium">{selectedTransaction.customer_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tipo de Evento</p>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">{selectedTransaction.event_type}</code>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Produto Externo</p>
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">{selectedTransaction.external_product_id || '-'}</code>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recebido em</p>
                      <p className="font-medium">
                        {format(new Date(selectedTransaction.created_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Processado em</p>
                      <p className="font-medium">
                        {selectedTransaction.processed_at
                          ? format(new Date(selectedTransaction.processed_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })
                          : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Botão para abrir wizard */}
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => {
                        setDetailsOpen(false);
                        openMappingWizard(selectedTransaction);
                      }}
                      className="w-full"
                    >
                      <Wand2 className="w-4 h-4 mr-2" />
                      Configurar Mapeamentos com Este Webhook
                    </Button>
                  </div>

                  {selectedTransaction.error_message && (
                    <div className="p-3 bg-destructive/10 rounded-md">
                      <p className="text-sm font-medium text-destructive">Erro</p>
                      <p className="text-sm mt-1">{selectedTransaction.error_message}</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="payload">
                  <ScrollArea className="h-[400px] rounded-md border bg-muted/30">
                    <pre className="p-4 text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedTransaction.raw_payload, null, 2)}
                    </pre>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="result">
                  {renderActionCards(selectedTransaction.processing_result)}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Wizard de Mapeamento */}
      <ConfigureMappingsWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        transaction={wizardTransaction}
        platforms={platforms}
      />

      {/* Confirmação de Deleção Individual */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Deleção em Lote */}
      <AlertDialog open={deleteAllConfirmOpen} onOpenChange={setDeleteAllConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Limpar Transações</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover todas as transações {statusFilter !== 'all' ? 'com este filtro' : ''}?
              Esta ação não pode ser desfeita e removerá {filteredTransactions?.length || 0} transações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
