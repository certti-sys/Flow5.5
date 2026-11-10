import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  User,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Copy
} from "lucide-react";

interface Platform {
  id: string;
  name: string;
  display_name: string;
}

interface Schema {
  id: string;
  platform_id: string | null;
  event_type: string;
  fields_json: any[];
}

interface WebhookTestPanelProps {
  platforms: Platform[];
  schemas: Schema[];
}

interface SimulationResult {
  detected_provider: string | null;
  detected_event_type: string | null;
  discovered_fields: any[];
  applied_mappings: any[];
  internal_data: Record<string, any>;
  normalized_status: string | null;
  product_mapping: any | null;
  simulated_actions: string[];
  errors: string[];
}

// Extrair valor de um path no objeto
function getValueByPath(obj: any, path: string): any {
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

// Descobrir campos do payload
function discoverFields(obj: any, prefix: string = ''): any[] {
  const fields: any[] = [];
  
  if (obj === null || obj === undefined) return fields;
  
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object') {
      const arrayFields = discoverFields(obj[0], `${prefix}[0]`);
      fields.push(...arrayFields);
    }
    fields.push({ path: prefix || 'root', type: 'array', example: `Array[${obj.length}]` });
  } else if (typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      
      if (value === null) {
        fields.push({ path, type: 'null', example: null });
      } else if (Array.isArray(value)) {
        fields.push({ path, type: 'array', example: `Array[${value.length}]` });
        if (value.length > 0 && typeof value[0] === 'object') {
          const nestedFields = discoverFields(value[0], `${path}[0]`);
          fields.push(...nestedFields);
        }
      } else if (typeof value === 'object') {
        fields.push({ path, type: 'object', example: '{...}' });
        const nestedFields = discoverFields(value, path);
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

// Detectar provider
function detectProvider(payload: any): { slug: string | null; eventType: string | null } {
  // Kiwify
  if (payload?.webhook_event_type) {
    return { slug: 'kiwify', eventType: `kiwify.${payload.webhook_event_type}` };
  }
  
  // Hotmart
  if (payload?.event || payload?.data?.product?.name) {
    const eventType = payload?.event || 'purchase';
    return { slug: 'hotmart', eventType: `hotmart.${eventType}` };
  }
  
  // Monetizze
  if (payload?.chave_unica || payload?.produto?.codigo) {
    const eventType = payload?.tipoPostback?.codigo || payload?.status || 'unknown';
    return { slug: 'monetizze', eventType: `monetizze.${eventType}` };
  }
  
  // Eduzz
  if (payload?.eduzz_webhook || payload?.trans?.recurrence_code) {
    const eventType = payload?.trans?.status || 'unknown';
    return { slug: 'eduzz', eventType: `eduzz.${eventType}` };
  }
  
  // WooCommerce (check common fields)
  if (payload?.billing || payload?.line_items || payload?.order_key) {
    return { slug: 'woocommerce', eventType: 'woocommerce.order' };
  }
  
  // Generic event
  if (payload?.event) {
    return { slug: null, eventType: payload.event };
  }
  if (payload?.type) {
    return { slug: null, eventType: payload.type };
  }
  
  return { slug: null, eventType: 'unknown' };
}

const SAMPLE_PAYLOADS: Record<string, any> = {
  hotmart: {
    event: "PURCHASE_APPROVED",
    data: {
      buyer: {
        email: "cliente@exemplo.com",
        name: "João Silva"
      },
      product: {
        id: "12345",
        name: "Curso de Marketing Digital"
      },
      purchase: {
        transaction: "HP123456789",
        status: "approved"
      }
    }
  },
  kiwify: {
    webhook_event_type: "order_paid",
    order_id: "KW123456",
    order_status: "paid",
    Customer: {
      email: "cliente@exemplo.com",
      full_name: "Maria Santos"
    },
    Product: {
      product_id: "prod_abc123",
      product_name: "Curso de Vendas"
    }
  },
  woocommerce: {
    id: 1234,
    order_key: "wc_order_abc123",
    status: "completed",
    billing: {
      email: "cliente@exemplo.com",
      first_name: "Pedro",
      last_name: "Almeida"
    },
    line_items: [
      {
        product_id: 567,
        name: "Curso Online Premium"
      }
    ]
  }
};

export function WebhookTestPanel({ platforms, schemas }: WebhookTestPanelProps) {
  const [payload, setPayload] = useState<string>("");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("auto");
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);

  const loadSamplePayload = (platformName: string) => {
    const sample = SAMPLE_PAYLOADS[platformName];
    if (sample) {
      setPayload(JSON.stringify(sample, null, 2));
      toast.success(`Payload de exemplo ${platformName} carregado`);
    }
  };

  const simulateWebhook = async () => {
    if (!payload.trim()) {
      toast.error("Cole um payload JSON para simular");
      return;
    }

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      toast.error("JSON inválido. Verifique a sintaxe.");
      return;
    }

    setIsSimulating(true);
    setResult(null);

    try {
      const simResult: SimulationResult = {
        detected_provider: null,
        detected_event_type: null,
        discovered_fields: [],
        applied_mappings: [],
        internal_data: {},
        normalized_status: null,
        product_mapping: null,
        simulated_actions: [],
        errors: []
      };

      // 1. Detectar provider
      let detectedSlug: string | null = null;
      let detectedEventType: string | null = null;

      if (selectedPlatform !== "auto") {
        const platform = platforms.find(p => p.id === selectedPlatform);
        detectedSlug = platform?.name || null;
        detectedEventType = `${detectedSlug}.unknown`;
      } else {
        const detected = detectProvider(parsedPayload);
        detectedSlug = detected.slug;
        detectedEventType = detected.eventType;
      }

      simResult.detected_provider = detectedSlug;
      simResult.detected_event_type = detectedEventType;

      // 2. Descobrir campos
      simResult.discovered_fields = discoverFields(parsedPayload);

      // 3. Buscar platform_id
      let platformId: string | null = null;
      if (detectedSlug) {
        const platform = platforms.find(p => p.name === detectedSlug);
        platformId = platform?.id || null;
      }

      if (!platformId && selectedPlatform !== "auto") {
        platformId = selectedPlatform;
      }

      // 4. Buscar e aplicar mapeamentos
      if (platformId) {
        const { data: mappings } = await supabase
          .from('webhook_field_mappings')
          .select('*')
          .eq('platform_id', platformId);

        if (mappings && mappings.length > 0) {
          simResult.applied_mappings = mappings;
          
          for (const mapping of mappings) {
            const value = getValueByPath(parsedPayload, mapping.source_path);
            if (value !== undefined) {
              simResult.internal_data[mapping.internal_field] = value;
            }
          }
        }

        // 5. Normalizar status
        const rawStatus = simResult.internal_data.event_status || 
                         getValueByPath(parsedPayload, 'status') ||
                         getValueByPath(parsedPayload, 'order_status') ||
                         getValueByPath(parsedPayload, 'payment_status');

        if (rawStatus) {
          const { data: statusMapping } = await supabase
            .from('platform_status_mappings')
            .select('internal_status')
            .eq('platform_id', platformId)
            .eq('external_value', String(rawStatus).toLowerCase())
            .maybeSingle();

          if (statusMapping) {
            simResult.normalized_status = statusMapping.internal_status;
          } else {
            // Fallback
            const statusLower = String(rawStatus).toLowerCase();
            if (['paid', 'approved', 'completed', 'complete', 'success'].includes(statusLower)) {
              simResult.normalized_status = 'approved';
            } else if (['refunded', 'refund', 'chargeback'].includes(statusLower)) {
              simResult.normalized_status = 'refunded';
            } else if (['cancelled', 'canceled', 'expired'].includes(statusLower)) {
              simResult.normalized_status = 'cancelled';
            } else {
              simResult.normalized_status = statusLower;
            }
          }
        }

        // 6. Buscar product mapping
        const productId = simResult.internal_data.product_id;
        if (productId) {
          const { data: productMapping } = await supabase
            .from('product_mappings')
            .select(`
              *,
              course:courses(id, title)
            `)
            .eq('platform_id', platformId)
            .eq('external_product_id', String(productId))
            .eq('is_active', true)
            .maybeSingle();

          simResult.product_mapping = productMapping;
        }

        // 7. Simular ações
        const userEmail = simResult.internal_data.user_email;
        const userName = simResult.internal_data.user_name || 'Usuário';

        if (!userEmail) {
          simResult.errors.push("Campo user_email não encontrado - configure o mapeamento");
        } else {
          // Verificar se usuário existe
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('email', userEmail.toLowerCase())
            .maybeSingle();

          if (simResult.normalized_status === 'approved') {
            if (existingProfile) {
              simResult.simulated_actions.push(`✓ Usuário existente: ${existingProfile.name} (${userEmail})`);
            } else {
              simResult.simulated_actions.push(`+ Criar usuário: ${userName} (${userEmail}) com senha temporária`);
            }

            if (simResult.product_mapping) {
              if (simResult.product_mapping.grant_type === 'course' && simResult.product_mapping.course) {
                simResult.simulated_actions.push(`+ Conceder acesso ao curso: ${simResult.product_mapping.course.title}`);
              } else if (simResult.product_mapping.grant_type === 'category') {
                simResult.simulated_actions.push(`+ Conceder acesso à categoria: ${simResult.product_mapping.category}`);
              }
            } else if (productId) {
              simResult.errors.push(`Produto ${productId} não está mapeado - acesso não será concedido`);
            }
          } else if (simResult.normalized_status === 'refunded' || simResult.normalized_status === 'cancelled') {
            if (existingProfile) {
              if (simResult.product_mapping) {
                if (simResult.product_mapping.grant_type === 'course') {
                  simResult.simulated_actions.push(`- Remover acesso ao curso: ${simResult.product_mapping.course?.title}`);
                } else {
                  simResult.simulated_actions.push(`- Remover acesso à categoria: ${simResult.product_mapping.category}`);
                }
              }
            } else {
              simResult.simulated_actions.push(`⚠ Usuário não encontrado para remoção de acesso`);
            }
          } else {
            simResult.simulated_actions.push(`ℹ Status "${simResult.normalized_status}" não requer ação automática`);
          }
        }
      } else {
        simResult.errors.push("Plataforma não identificada - configure manualmente ou adicione a plataforma");
      }

      setResult(simResult);
      toast.success("Simulação concluída!");

    } catch (error: any) {
      toast.error(`Erro na simulação: ${error.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const copyInternalData = () => {
    if (result?.internal_data) {
      navigator.clipboard.writeText(JSON.stringify(result.internal_data, null, 2));
      toast.success("Dados internos copiados!");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            Painel de Teste de Webhooks
          </CardTitle>
          <CardDescription>
            Cole um payload JSON para simular como seria processado pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sample Payloads */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground mr-2">Exemplos:</span>
            {Object.keys(SAMPLE_PAYLOADS).map((name) => (
              <Button
                key={name}
                variant="outline"
                size="sm"
                onClick={() => loadSamplePayload(name)}
              >
                {name.charAt(0).toUpperCase() + name.slice(1)}
              </Button>
            ))}
          </div>

          {/* Platform Selection */}
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium mb-1.5 block">Plataforma</label>
              <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Auto detectar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto Detectar</SelectItem>
                  {platforms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Payload Input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Payload JSON</label>
            <Textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              placeholder='{"event": "purchase_approved", "buyer": {"email": "..."}}'
              className="font-mono text-xs min-h-[200px]"
            />
          </div>

          {/* Simulate Button */}
          <Button 
            onClick={simulateWebhook} 
            disabled={isSimulating || !payload.trim()}
            className="w-full"
          >
            {isSimulating ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Simulando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Simular Processamento
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultado da Simulação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Detection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Provider Detectado</p>
                <Badge variant={result.detected_provider ? "default" : "secondary"}>
                  {result.detected_provider || "Não identificado"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tipo de Evento</p>
                <Badge variant="outline">
                  {result.detected_event_type || "unknown"}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Discovered Fields */}
            <div>
              <p className="text-sm font-medium mb-2">
                Campos Descobertos ({result.discovered_fields.length})
              </p>
              <ScrollArea className="h-[120px] rounded border p-2">
                <div className="space-y-1">
                  {result.discovered_fields
                    .filter(f => f.type !== 'object' && f.type !== 'array')
                    .slice(0, 20)
                    .map((field, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <code className="text-muted-foreground">{field.path}</code>
                        <span className="text-foreground truncate max-w-[200px]">
                          {String(field.example)}
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>

            <Separator />

            {/* Mappings Applied */}
            <div>
              <p className="text-sm font-medium mb-2">
                Mapeamentos Aplicados ({result.applied_mappings.length})
              </p>
              {result.applied_mappings.length > 0 ? (
                <div className="space-y-1">
                  {result.applied_mappings.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <code className="text-muted-foreground">{m.source_path}</code>
                      <ArrowRight className="w-3 h-3" />
                      <Badge variant="outline">{m.internal_field}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum mapeamento configurado para esta plataforma
                </p>
              )}
            </div>

            {/* Internal Data */}
            {Object.keys(result.internal_data).length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-medium">Dados Internos Extraídos</p>
                    <Button variant="ghost" size="sm" onClick={copyInternalData}>
                      <Copy className="w-3 h-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <div className="bg-muted/50 rounded p-3 space-y-1">
                    {Object.entries(result.internal_data).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Status */}
            {result.normalized_status && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Status Normalizado</p>
                  <Badge 
                    variant={
                      result.normalized_status === 'approved' ? 'default' :
                      result.normalized_status === 'refunded' ? 'destructive' :
                      'secondary'
                    }
                  >
                    {result.normalized_status}
                  </Badge>
                </div>
              </>
            )}

            {/* Product Mapping */}
            {result.product_mapping && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">Produto Mapeado</p>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-muted-foreground" />
                    <span>
                      {result.product_mapping.grant_type === 'course' 
                        ? result.product_mapping.course?.title 
                        : `Categoria: ${result.product_mapping.category}`}
                    </span>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Simulated Actions */}
            <div>
              <p className="text-sm font-medium mb-2">Ações Simuladas</p>
              <div className="space-y-2">
                {result.simulated_actions.map((action, i) => (
                  <Alert key={i} variant={action.startsWith('+') ? 'default' : action.startsWith('-') ? 'destructive' : 'default'}>
                    {action.startsWith('+') && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {action.startsWith('-') && <XCircle className="w-4 h-4 text-red-500" />}
                    {action.startsWith('✓') && <User className="w-4 h-4" />}
                    <AlertDescription>{action}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2 text-destructive">Problemas Detectados</p>
                  <div className="space-y-2">
                    {result.errors.map((error, i) => (
                      <Alert key={i} variant="destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
