import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Database, FileJson, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DiscoveredField {
  path: string;
  type: string;
  example: any;
}

interface Schema {
  id: string;
  platform_id: string;
  event_type: string;
  fields_json: DiscoveredField[];
  sample_payload: any;
  is_learned: boolean;
  created_at: string;
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

interface WebhookSchemaViewerProps {
  schemas: Schema[];
  loading: boolean;
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
  platforms: Platform[];
}

export function WebhookSchemaViewer({
  schemas,
  loading,
  selectedPlatform,
  onSelectPlatform,
  platforms
}: WebhookSchemaViewerProps) {
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());
  const [showPayload, setShowPayload] = useState<string | null>(null);

  const filteredSchemas = selectedPlatform 
    ? schemas.filter(s => s.platform_id === selectedPlatform)
    : schemas;

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSchemas(newExpanded);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'object': return 'text-orange-600 dark:text-orange-400';
      case 'array': return 'text-pink-600 dark:text-pink-400';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Carregando schemas...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtro */}
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
          {filteredSchemas.length} schema(s) descoberto(s)
        </Badge>
      </div>

      {/* Lista de Schemas */}
      {filteredSchemas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              Nenhum schema descoberto ainda. Envie webhooks para o endpoint e eles serão detectados automaticamente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredSchemas.map((schema) => (
            <Card key={schema.id}>
              <Collapsible 
                open={expandedSchemas.has(schema.id)}
                onOpenChange={() => toggleExpanded(schema.id)}
              >
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {expandedSchemas.has(schema.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <div>
                          <CardTitle className="text-base font-mono">
                            {schema.event_type}
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {schema.platform?.display_name || 'Plataforma não identificada'}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {(schema.fields_json as DiscoveredField[])?.length || 0} campos
                        </Badge>
                        {schema.is_learned ? (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Aprendido
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            Novo
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <CardContent className="pt-0 space-y-4">
                    {/* Campos descobertos */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Campos Descobertos</h4>
                      <ScrollArea className="h-[300px] rounded-md border">
                        <div className="p-3 space-y-1">
                          {(schema.fields_json as DiscoveredField[])
                            ?.filter(f => f.type !== 'object' && f.type !== 'array')
                            .map((field, idx) => (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50 text-sm font-mono"
                            >
                              <span className="text-foreground">{field.path}</span>
                              <div className="flex items-center gap-3">
                                <span className={`text-xs ${getTypeColor(field.type)}`}>
                                  {field.type}
                                </span>
                                <span className="text-xs text-muted-foreground max-w-[150px] truncate">
                                  {String(field.example)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Payload de exemplo */}
                    {schema.sample_payload && (
                      <div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowPayload(showPayload === schema.id ? null : schema.id)}
                        >
                          <FileJson className="w-4 h-4 mr-2" />
                          {showPayload === schema.id ? 'Ocultar' : 'Ver'} Payload de Exemplo
                        </Button>
                        
                        {showPayload === schema.id && (
                          <ScrollArea className="h-[200px] mt-3 rounded-md border bg-muted/30">
                            <pre className="p-3 text-xs font-mono">
                              {JSON.stringify(schema.sample_payload, null, 2)}
                            </pre>
                          </ScrollArea>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="text-xs text-muted-foreground">
                      Descoberto em: {format(new Date(schema.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}