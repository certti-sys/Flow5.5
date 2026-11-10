import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, ArrowRight, Save } from "lucide-react";

// Campos internos padrão do sistema
const INTERNAL_FIELDS = [
  { value: 'user_email', label: 'Email do Usuário', description: 'Email para criar/identificar usuário' },
  { value: 'user_name', label: 'Nome do Usuário', description: 'Nome completo do usuário' },
  { value: 'user_phone', label: 'Telefone', description: 'WhatsApp ou telefone' },
  { value: 'product_id', label: 'ID do Produto', description: 'Identificador externo do produto' },
  { value: 'product_name', label: 'Nome do Produto', description: 'Nome do produto/curso' },
  { value: 'event_status', label: 'Status do Evento', description: 'Status da compra (approved, refunded, etc)' },
  { value: 'transaction_id', label: 'ID da Transação', description: 'Identificador único da transação' },
  { value: 'amount', label: 'Valor', description: 'Valor da transação' },
  { value: 'currency', label: 'Moeda', description: 'Moeda da transação (BRL, USD)' },
];

interface DiscoveredField {
  path: string;
  type: string;
  example: any;
}

interface Mapping {
  id: string;
  platform_id: string;
  event_type: string | null;
  source_path: string;
  internal_field: string;
  is_primary: boolean;
  platform?: {
    name: string;
    display_name: string;
  };
}

interface Schema {
  id: string;
  platform_id: string;
  event_type: string;
  fields_json: DiscoveredField[];
  platform?: {
    name: string;
    display_name: string;
  };
}

interface Platform {
  id: string;
  name: string;
  display_name: string;
}

interface FieldMappingEditorProps {
  mappings: Mapping[];
  loading: boolean;
  schemas: Schema[];
  platforms: Platform[];
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
}

export function FieldMappingEditor({
  mappings,
  loading,
  schemas,
  platforms,
  selectedPlatform,
  onSelectPlatform
}: FieldMappingEditorProps) {
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newMapping, setNewMapping] = useState({
    platform_id: '',
    event_type: '',
    source_path: '',
    internal_field: '',
    is_primary: false
  });
  const queryClient = useQueryClient();

  const filteredMappings = selectedPlatform
    ? mappings.filter(m => m.platform_id === selectedPlatform)
    : mappings;

  const selectedSchema = schemas.find(s =>
    s.platform_id === newMapping.platform_id &&
    (!newMapping.event_type || s.event_type === newMapping.event_type)
  );

  // Criar mapeamento
  const createMutation = useMutation({
    mutationFn: async (data: typeof newMapping) => {
      const { error } = await supabase
        .from('webhook_field_mappings')
        .insert({
          platform_id: data.platform_id,
          event_type: data.event_type || null,
          source_path: data.source_path,
          internal_field: data.internal_field,
          is_primary: data.is_primary
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapeamento criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['webhook-field-mappings'] });
      setAddModalOpen(false);
      setNewMapping({
        platform_id: '',
        event_type: '',
        source_path: '',
        internal_field: '',
        is_primary: false
      });
    },
    onError: (error: any) => {
      toast.error('Erro ao criar mapeamento: ' + error.message);
    }
  });

  // Deletar mapeamento
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhook_field_mappings')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapeamento removido!');
      queryClient.invalidateQueries({ queryKey: ['webhook-field-mappings'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const handleCreate = () => {
    if (!newMapping.platform_id || !newMapping.source_path || !newMapping.internal_field) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    createMutation.mutate(newMapping);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select
            value={selectedPlatform || "all"}
            onValueChange={(v) => onSelectPlatform(v === "all" ? null : v)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Todas as plataformas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as plataformas</SelectItem>
              {platforms.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline">
            {filteredMappings.length} mapeamento(s)
          </Badge>
        </div>
        <Button onClick={() => setAddModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Mapeamento
        </Button>
      </div>

      {/* Lista de Mapeamentos */}
      {filteredMappings.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ArrowRight className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              Nenhum mapeamento configurado. Crie mapeamentos para conectar campos do webhook aos campos internos do sistema.
            </p>
            <Button onClick={() => setAddModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Mapeamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMappings.map((mapping) => (
            <Card key={mapping.id}>
              <CardContent className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-wrap">
                    <Badge variant="outline" className="font-mono text-xs">
                      {mapping.platform?.display_name}
                    </Badge>
                    {mapping.event_type && (
                      <Badge variant="secondary" className="font-mono text-xs">
                        {mapping.event_type}
                      </Badge>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      <code className="bg-muted px-2 py-0.5 rounded text-xs">
                        {mapping.source_path}
                      </code>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                      <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-medium">
                        {mapping.internal_field}
                      </code>
                    </div>
                    {mapping.is_primary && (
                      <Badge variant="default" className="text-xs">Primário</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(mapping.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Adicionar */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo Mapeamento de Campo</DialogTitle>
            <DialogDescription>
              Conecte um campo do webhook a um campo interno do sistema
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Plataforma */}
            <div className="space-y-2">
              <Label>Plataforma *</Label>
              <Select
                value={newMapping.platform_id}
                onValueChange={(v) => setNewMapping(prev => ({ ...prev, platform_id: v, event_type: '' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a plataforma" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Evento (opcional) */}
            <div className="space-y-2">
              <Label>Tipo de Evento (opcional)</Label>
              <Select
                value={newMapping.event_type}
                onValueChange={(v) => setNewMapping(prev => ({ ...prev, event_type: v === 'all' ? '' : v }))}
                disabled={!newMapping.platform_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os eventos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os eventos</SelectItem>
                  {schemas
                    .filter(s => s.platform_id === newMapping.platform_id)
                    .map(s => (
                      <SelectItem key={s.id} value={s.event_type}>{s.event_type}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Campo de Origem */}
            <div className="space-y-2">
              <Label>Campo de Origem (source_path) *</Label>
              {selectedSchema ? (
                <Select
                  value={newMapping.source_path}
                  onValueChange={(v) => setNewMapping(prev => ({ ...prev, source_path: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o campo" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedSchema.fields_json as DiscoveredField[])
                      ?.filter(f => f.type !== 'object' && f.type !== 'array')
                      .map((field, idx) => (
                        <SelectItem key={idx} value={field.path}>
                          <span className="font-mono">{field.path}</span>
                          <span className="text-muted-foreground ml-2 text-xs">({field.type})</span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="ex: buyer.email"
                  value={newMapping.source_path}
                  onChange={(e) => setNewMapping(prev => ({ ...prev, source_path: e.target.value }))}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Caminho do campo no JSON do webhook (ex: buyer.email, data.customer.name)
              </p>
            </div>

            {/* Campo Interno */}
            <div className="space-y-2">
              <Label>Campo Interno *</Label>
              <Select
                value={newMapping.internal_field}
                onValueChange={(v) => setNewMapping(prev => ({ ...prev, internal_field: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o campo interno" />
                </SelectTrigger>
                <SelectContent>
                  {INTERNAL_FIELDS.map(field => (
                    <SelectItem key={field.value} value={field.value}>
                      <div>
                        <span className="font-medium">{field.label}</span>
                        <span className="text-muted-foreground ml-2 text-xs">({field.value})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Campo do sistema que receberá o valor
              </p>
            </div>

            {/* Primário */}
            <div className="flex items-center space-x-2">
              <Switch
                id="is_primary"
                checked={newMapping.is_primary}
                onCheckedChange={(checked) => setNewMapping(prev => ({ ...prev, is_primary: checked }))}
              />
              <Label htmlFor="is_primary">Campo primário (obrigatório para processamento)</Label>
            </div>
          </div>

          <DialogFooter className="mt-6 pt-4 border-t border-white/5">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              Criar Mapeamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}