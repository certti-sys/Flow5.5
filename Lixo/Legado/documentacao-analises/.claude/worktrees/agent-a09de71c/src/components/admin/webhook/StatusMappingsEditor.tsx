import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, XCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";

interface StatusMappingsEditorProps {
  platforms: any[];
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
}

interface StatusMapping {
  id: string;
  platform_id: string;
  external_value: string;
  internal_status: string;
  created_at: string;
}

const INTERNAL_STATUSES = [
  { value: 'approved', label: 'Aprovado', description: 'Concede acesso ao curso', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'refunded', label: 'Reembolso', description: 'Remove acesso ao curso', icon: XCircle, color: 'text-red-500' },
  { value: 'cancelled', label: 'Cancelado', description: 'Remove acesso ao curso', icon: XCircle, color: 'text-orange-500' },
  { value: 'pending', label: 'Pendente', description: 'Nenhuma ação automática', icon: Clock, color: 'text-yellow-500' },
];

const COMMON_STATUS_SUGGESTIONS: Record<string, { external: string; internal: string }[]> = {
  approved: [
    { external: 'paid', internal: 'approved' },
    { external: 'approved', internal: 'approved' },
    { external: 'completed', internal: 'approved' },
    { external: 'complete', internal: 'approved' },
    { external: 'success', internal: 'approved' },
    { external: 'active', internal: 'approved' },
  ],
  refunded: [
    { external: 'refunded', internal: 'refunded' },
    { external: 'refund', internal: 'refunded' },
    { external: 'chargeback', internal: 'refunded' },
    { external: 'chargedback', internal: 'refunded' },
    { external: 'dispute', internal: 'refunded' },
  ],
  cancelled: [
    { external: 'cancelled', internal: 'cancelled' },
    { external: 'canceled', internal: 'cancelled' },
    { external: 'expired', internal: 'cancelled' },
    { external: 'inactive', internal: 'cancelled' },
    { external: 'subscription_cancelled', internal: 'cancelled' },
  ],
  pending: [
    { external: 'pending', internal: 'pending' },
    { external: 'waiting', internal: 'pending' },
    { external: 'processing', internal: 'pending' },
    { external: 'waiting_payment', internal: 'pending' },
  ],
};

export function StatusMappingsEditor({ platforms, selectedPlatform, onSelectPlatform }: StatusMappingsEditorProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExternalValue, setNewExternalValue] = useState("");
  const [newInternalStatus, setNewInternalStatus] = useState("approved");

  // Buscar mapeamentos de status
  const { data: mappings, isLoading } = useQuery({
    queryKey: ['platform-status-mappings', selectedPlatform],
    queryFn: async () => {
      let query = supabase
        .from('platform_status_mappings')
        .select(`
          *,
          platform:webhook_platforms(name, display_name)
        `)
        .order('internal_status', { ascending: true });

      if (selectedPlatform) {
        query = query.eq('platform_id', selectedPlatform);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (StatusMapping & { platform: { name: string; display_name: string } })[];
    }
  });

  // Adicionar mapeamento
  const addMutation = useMutation({
    mutationFn: async (data: { platform_id: string; external_value: string; internal_status: string }) => {
      const { error } = await supabase
        .from('platform_status_mappings')
        .insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-status-mappings'] });
      toast.success("Mapeamento de status adicionado!");
      setIsAddModalOpen(false);
      setNewExternalValue("");
      setNewInternalStatus("approved");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Deletar mapeamento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('platform_status_mappings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-status-mappings'] });
      toast.success("Mapeamento removido!");
    },
    onError: (error: any) => {
      toast.error(`Erro: ${error.message}`);
    }
  });

  // Adicionar sugestão rápida
  const addSuggestion = async (external: string, internal: string) => {
    if (!selectedPlatform) {
      toast.error("Selecione uma plataforma primeiro");
      return;
    }
    addMutation.mutate({
      platform_id: selectedPlatform,
      external_value: external.toLowerCase(),
      internal_status: internal
    });
  };

  const handleAddMapping = () => {
    if (!selectedPlatform) {
      toast.error("Selecione uma plataforma primeiro");
      return;
    }
    if (!newExternalValue.trim()) {
      toast.error("Digite o valor externo");
      return;
    }
    addMutation.mutate({
      platform_id: selectedPlatform,
      external_value: newExternalValue.toLowerCase().trim(),
      internal_status: newInternalStatus
    });
  };

  // Agrupar mapeamentos por status interno
  const groupedMappings = mappings?.reduce((acc, mapping) => {
    const status = mapping.internal_status;
    if (!acc[status]) acc[status] = [];
    acc[status].push(mapping);
    return acc;
  }, {} as Record<string, typeof mappings>) || {};

  // Verificar quais sugestões já existem
  const existingExternalValues = new Set(mappings?.map(m => m.external_value.toLowerCase()) || []);

  return (
    <div className="space-y-6">
      {/* Seletor de Plataforma */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex-1 max-w-xs">
          <Label className="mb-2 block">Plataforma</Label>
          <Select value={selectedPlatform || ""} onValueChange={(v) => onSelectPlatform(v || null)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma plataforma" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} disabled={!selectedPlatform}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Mapeamento
        </Button>
      </div>

      {!selectedPlatform ? (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Selecione uma plataforma para configurar os mapeamentos de status.
            </p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="text-center py-8 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          Carregando...
        </div>
      ) : (
        <>
          {/* Cards por Status */}
          <div className="grid gap-4 md:grid-cols-2">
            {INTERNAL_STATUSES.map((status) => {
              const StatusIcon = status.icon;
              const statusMappings = groupedMappings[status.value] || [];
              const suggestions = COMMON_STATUS_SUGGESTIONS[status.value] || [];
              const availableSuggestions = suggestions.filter(
                s => !existingExternalValues.has(s.external.toLowerCase())
              );

              return (
                <Card key={status.value}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                      <CardTitle className="text-base">{status.label}</CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {status.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Mapeamentos existentes */}
                    {statusMappings.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {statusMappings.map((mapping) => (
                          <Badge
                            key={mapping.id}
                            variant="secondary"
                            className="pl-2 pr-1 py-1 flex items-center gap-1"
                          >
                            <code className="text-xs">{mapping.external_value}</code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 ml-1 hover:bg-destructive/20"
                              onClick={() => deleteMutation.mutate(mapping.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Nenhum valor mapeado
                      </p>
                    )}

                    {/* Sugestões rápidas */}
                    {availableSuggestions.length > 0 && (
                      <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Sugestões:</p>
                        <div className="flex flex-wrap gap-1">
                          {availableSuggestions.map((suggestion) => (
                            <Button
                              key={suggestion.external}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs px-2"
                              onClick={() => addSuggestion(suggestion.external, suggestion.internal)}
                              disabled={addMutation.isPending}
                            >
                              + {suggestion.external}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Explicação do fluxo de Remoção de Acesso */}
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-2 text-blue-600 dark:text-blue-400">📋 Como funciona a Remoção de Acesso (Reembolso/Cancelamento)</p>
                  <ol className="text-muted-foreground space-y-2 text-xs list-decimal list-inside">
                    <li>Quando o webhook recebe um status mapeado como <strong>"Reembolso"</strong> ou <strong>"Cancelado"</strong>...</li>
                    <li>O sistema identifica o usuário pelo <strong>email</strong> do cliente no payload</li>
                    <li>Busca o <strong>mapeamento de produto</strong> (aba Produtos) para saber qual curso/categoria</li>
                    <li>Remove automaticamente o <strong>acesso ao curso</strong> ou à <strong>categoria</strong> do usuário</li>
                  </ol>
                  <div className="mt-3 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                      ⚠️ Importante: Para a remoção funcionar, você precisa:
                    </p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      <li>1. Mapear os status de reembolso/cancelamento aqui</li>
                      <li>2. Configurar o mapeamento de produto na aba "Produtos"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Explicação geral do fluxo */}
          <Card className="bg-muted/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium mb-1">Resumo do mapeamento de status:</p>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    <li>• <strong className="text-green-500">Aprovado:</strong> Cria/identifica o usuário e concede acesso ao curso.</li>
                    <li>• <strong className="text-red-500">Reembolso/Cancelado:</strong> Remove o acesso do usuário ao curso.</li>
                    <li>• <strong className="text-yellow-500">Pendente:</strong> Registra a transação mas não dispara ação automática.</li>
                    <li>• Se um status não estiver mapeado, o sistema tenta usar regras de fallback.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Modal de Adicionar */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Mapeamento de Status</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label className="mb-2 block">Valor Externo (da plataforma)</Label>
              <Input
                placeholder="Ex: paid, refunded, chargeback..."
                value={newExternalValue}
                onChange={(e) => setNewExternalValue(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                O valor exato que a plataforma envia no webhook
              </p>
            </div>

            <div>
              <Label className="mb-2 block">Ação Interna</Label>
              <Select value={newInternalStatus} onValueChange={setNewInternalStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERNAL_STATUSES.map((status) => {
                    const StatusIcon = status.icon;
                    return (
                      <SelectItem key={status.value} value={status.value}>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${status.color}`} />
                          <span>{status.label}</span>
                          <span className="text-xs text-muted-foreground">
                            - {status.description}
                          </span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-white/5">
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddMapping} disabled={addMutation.isPending}>
              {addMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
