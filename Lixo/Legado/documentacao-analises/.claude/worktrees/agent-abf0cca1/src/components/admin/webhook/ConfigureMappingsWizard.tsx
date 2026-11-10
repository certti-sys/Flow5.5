import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { ArrowRight, Save, Wand2, Mail, User, Package, CreditCard, Hash, DollarSign, Phone } from "lucide-react";

// Campos internos do sistema com ícones
const INTERNAL_FIELDS = [
  { value: 'user_email', label: 'Email do Usuário', icon: Mail, description: 'Email para criar/identificar usuário', required: true },
  { value: 'user_name', label: 'Nome do Usuário', icon: User, description: 'Nome completo do usuário' },
  { value: 'user_phone', label: 'Telefone', icon: Phone, description: 'WhatsApp ou telefone' },
  { value: 'product_id', label: 'ID do Produto', icon: Package, description: 'Identificador externo do produto', required: true },
  { value: 'product_name', label: 'Nome do Produto', icon: Package, description: 'Nome do produto/curso' },
  { value: 'event_status', label: 'Status do Evento', icon: CreditCard, description: 'Status da compra (approved, refunded)', required: true },
  { value: 'transaction_id', label: 'ID da Transação', icon: Hash, description: 'Identificador único da transação' },
  { value: 'amount', label: 'Valor', icon: DollarSign, description: 'Valor da transação' },
  { value: 'currency', label: 'Moeda', icon: DollarSign, description: 'Moeda (BRL, USD)' },
];

interface DiscoveredField {
  path: string;
  type: string;
  example: any;
}

interface Platform {
  id: string;
  name: string;
  display_name: string;
}

interface ConfigureMappingsWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  platforms: Platform[];
}

export function ConfigureMappingsWizard({
  open,
  onOpenChange,
  transaction,
  platforms
}: ConfigureMappingsWizardProps) {
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const queryClient = useQueryClient();

  // Extrair campos descobertos do payload
  const discoveredFields: DiscoveredField[] = transaction?.raw_payload 
    ? discoverFieldsFromPayload(transaction.raw_payload)
    : [];

  // Campos úteis (não objetos ou arrays)
  const usableFields = discoveredFields.filter(f => 
    f.type !== 'object' && f.type !== 'array' && f.path !== 'root'
  );

  // Inicializar com plataforma da transação
  useEffect(() => {
    if (transaction?.platform_id) {
      setSelectedPlatform(transaction.platform_id);
    }
  }, [transaction]);

  // Auto-mapear campos com sugestões inteligentes
  useEffect(() => {
    if (usableFields.length > 0) {
      const autoMappings: Record<string, string> = {};
      
      // Sugestões baseadas em padrões comuns
      const suggestions: Record<string, string[]> = {
        'user_email': ['email', 'client.email', 'data.client.email', 'buyer.email', 'customer.email'],
        'user_name': ['name', 'full_name', 'client.full_name', 'data.client.full_name', 'buyer.name', 'customer.name'],
        'user_phone': ['phone', 'client.phone', 'data.client.phone', 'buyer.phone'],
        'product_id': ['product.id', 'data.offer.product.id', 'offer.product.id', 'product_id'],
        'product_name': ['product.name', 'data.offer.product.name', 'offer.name', 'product_name'],
        'event_status': ['status', 'transaction.status', 'data.transaction.status', 'payment_status'],
        'transaction_id': ['transaction.id', 'data.transaction.id', 'order_id', 'id'],
        'amount': ['amount', 'transaction.amount', 'data.transaction.amount', 'value'],
        'currency': ['currency', 'transaction.currency', 'data.transaction.currency'],
      };

      for (const [internalField, possiblePaths] of Object.entries(suggestions)) {
        for (const path of possiblePaths) {
          const found = usableFields.find(f => 
            f.path === path || f.path.endsWith(`.${path}`) || f.path.includes(path)
          );
          if (found && !autoMappings[internalField]) {
            autoMappings[internalField] = found.path;
            break;
          }
        }
      }

      setMappings(autoMappings);
    }
  }, [usableFields.length]);

  // Salvar mapeamentos
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPlatform) throw new Error('Selecione uma plataforma');
      
      const mappingsToCreate = Object.entries(mappings)
        .filter(([_, sourcePath]) => sourcePath)
        .map(([internalField, sourcePath]) => ({
          platform_id: selectedPlatform,
          event_type: transaction?.event_type || null,
          source_path: sourcePath,
          internal_field: internalField,
          is_primary: ['user_email', 'product_id', 'event_status'].includes(internalField)
        }));

      if (mappingsToCreate.length === 0) {
        throw new Error('Configure pelo menos um mapeamento');
      }

      // Deletar mapeamentos existentes para esta plataforma/evento
      await supabase
        .from('webhook_field_mappings')
        .delete()
        .eq('platform_id', selectedPlatform)
        .eq('event_type', transaction?.event_type || '');

      // Criar novos mapeamentos
      const { error } = await supabase
        .from('webhook_field_mappings')
        .insert(mappingsToCreate);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Mapeamentos salvos com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['webhook-field-mappings'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar: ' + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[920px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            <DialogTitle>Configurar Mapeamentos</DialogTitle>
          </div>
          <DialogDescription>
            Conecte os campos do webhook aos campos internos do sistema. Campos com * são obrigatórios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Seletor de Plataforma */}
          <div className="space-y-2">
            <Label>Plataforma *</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
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

          {/* Info do Evento */}
          {transaction && (
            <Card className="bg-muted/30">
              <CardContent className="py-3">
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">{transaction.event_type}</Badge>
                  <span className="text-muted-foreground">{transaction.customer_email}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapeamentos Visuais */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Mapeamento de Campos</Label>
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {INTERNAL_FIELDS.map((field) => {
                  const IconComponent = field.icon;
                  return (
                    <div key={field.value} className="grid grid-cols-[1fr,auto,1fr] gap-3 items-center">
                      {/* Campo de Origem */}
                      <div className="space-y-1.5">
                      <Select 
                          value={mappings[field.value] || "__none__"} 
                          onValueChange={(v) => setMappings(prev => ({ ...prev, [field.value]: v === "__none__" ? "" : v }))}
                        >
                          <SelectTrigger className="font-mono text-xs">
                            <SelectValue placeholder="Selecionar campo..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Não mapear</SelectItem>
                            {usableFields.filter(f => f.path).map((f, idx) => (
                              <SelectItem key={idx} value={f.path || `field_${idx}`}>
                                <div className="flex flex-col">
                                  <span className="font-mono text-xs">{f.path}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {f.type}: {String(f.example).substring(0, 30)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {mappings[field.value] && (
                          <div className="px-2 py-1 bg-muted rounded text-[10px] font-mono truncate">
                            Exemplo: {getFieldExample(usableFields, mappings[field.value])}
                          </div>
                        )}
                      </div>

                      {/* Seta */}
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                      {/* Campo Interno */}
                      <Card className={`${mappings[field.value] ? 'border-primary/50 bg-primary/5' : ''}`}>
                        <CardContent className="py-2 px-3">
                          <div className="flex items-center gap-2">
                            <IconComponent className="w-4 h-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="font-medium text-sm flex items-center gap-1">
                                {field.label}
                                {field.required && <span className="text-destructive">*</span>}
                              </p>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {field.description}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Resumo */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="font-medium">
                    {Object.values(mappings).filter(Boolean).length}
                  </span>
                  <span className="text-muted-foreground"> campos mapeados</span>
                </div>
                <Badge variant={
                  mappings['user_email'] && mappings['event_status'] 
                    ? "default" 
                    : "destructive"
                }>
                  {mappings['user_email'] && mappings['event_status'] 
                    ? "Pronto para salvar" 
                    : "Campos obrigatórios faltando"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="shrink-0 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || !selectedPlatform || !mappings['user_email']}
          >
            <Save className="w-4 h-4 mr-2" />
            Salvar Mapeamentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Função para extrair campos do payload
function discoverFieldsFromPayload(obj: any, prefix: string = ''): DiscoveredField[] {
  const fields: DiscoveredField[] = [];
  
  if (obj === null || obj === undefined) return fields;
  
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      const arrayFields = discoverFieldsFromPayload(obj[0], `${prefix}[0]`);
      fields.push(...arrayFields);
    }
    fields.push({
      path: prefix || 'root',
      type: 'array',
      example: `Array[${obj.length}]`
    });
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (value === null) {
        fields.push({ path, type: 'null', example: null });
      } else if (Array.isArray(value)) {
        fields.push({ path, type: 'array', example: `Array[${value.length}]` });
        if (value.length > 0 && typeof value[0] === 'object') {
          const nestedFields = discoverFieldsFromPayload(value[0], `${path}[0]`);
          fields.push(...nestedFields);
        }
      } else if (typeof value === 'object') {
        fields.push({ path, type: 'object', example: '{...}' });
        const nestedFields = discoverFieldsFromPayload(value, path);
        fields.push(...nestedFields);
      } else {
        const type = typeof value;
        let example = value;
        if (typeof value === 'string' && value.length > 50) {
          example = value.substring(0, 50) + '...';
        }
        fields.push({ path, type, example });
      }
    }
  }
  
  return fields;
}

// Obter exemplo de um campo
function getFieldExample(fields: DiscoveredField[], path: string): string {
  const field = fields.find(f => f.path === path);
  if (!field) return '-';
  const example = String(field.example);
  return example.length > 30 ? example.substring(0, 30) + '...' : example;
}
