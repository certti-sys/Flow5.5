import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Copy, Plus, Eye, Settings, Zap, Database, ArrowRight,
  FlaskConical, Package, ToggleLeft, BarChart3, RefreshCw,
  Globe, Shield, ChevronRight, ActivitySquare
} from "lucide-react";
import { WebhookSchemaViewer } from "@/components/admin/webhook/WebhookSchemaViewer";
import { FieldMappingEditor } from "@/components/admin/webhook/FieldMappingEditor";
import { WebhookTransactionsList } from "@/components/admin/webhook/WebhookTransactionsList";
import { PlatformConfigModal } from "@/components/admin/webhook/PlatformConfigModal";
import { WebhookTestPanel } from "@/components/admin/webhook/WebhookTestPanel";
import { ProductMappingsEditor } from "@/components/admin/webhook/ProductMappingsEditor";
import { StatusMappingsEditor } from "@/components/admin/webhook/StatusMappingsEditor";
import { WebhookAnalytics } from "@/components/admin/webhook/WebhookAnalytics";
import { EventReceiverWizard } from "@/components/admin/webhook/EventReceiverWizard";
import { EventReceiversList } from "@/components/admin/webhook/EventReceiversList";
import { DataHealthPanel } from "@/components/admin/webhook/DataHealthPanel";

const WEBHOOK_URL = `https://lznckhxqbkqldedlmbfb.supabase.co/functions/v1/webhooks-ingest`;

export default function WebhookHub() {
  const [activeTab, setActiveTab] = useState("platforms");
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<any>(null);
  const [showReceiverWizard, setShowReceiverWizard] = useState(false);
  const queryClient = useQueryClient();

  // Buscar plataformas
  const { data: platforms, isLoading: loadingPlatforms, refetch } = useQuery({
    queryKey: ['webhook-platforms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_platforms')
        .select('*')
        .order('display_name');
      if (error) throw error;
      return data;
    }
  });

  // Buscar schemas descobertos
  const { data: schemas, isLoading: loadingSchemas } = useQuery({
    queryKey: ['webhook-schemas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_schemas')
        .select(`
          *,
          platform:webhook_platforms(name, display_name)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Buscar mapeamentos
  const { data: mappings, isLoading: loadingMappings } = useQuery({
    queryKey: ['webhook-field-mappings', selectedPlatform],
    queryFn: async () => {
      let query = supabase
        .from('webhook_field_mappings')
        .select(`
          *,
          platform:webhook_platforms(name, display_name)
        `)
        .order('created_at', { ascending: false });

      if (selectedPlatform) {
        query = query.eq('platform_id', selectedPlatform);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: activeTab === 'mappings'
  });

  // Copiar URL do webhook
  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast.success("URL do webhook copiada!");
  };

  // Abrir modal de configuração
  const openConfigModal = (platform?: any) => {
    setEditingPlatform(platform || null);
    setConfigModalOpen(true);
  };

  const stats = {
    total: platforms?.length ?? 0,
    active: platforms?.filter((p: any) => p.is_active).length ?? 0,
    schemas: schemas?.length ?? 0,
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-[36px]">
            Hub de Webhooks
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
            Endpoint único com auto discovery de payloads
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="glass-card border-white/10 hover:bg-white/5 h-[40px] px-4 rounded-[12px]"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loadingPlatforms && "animate-spin")} />
            Atualizar
          </Button>
          <Button
            onClick={() => openConfigModal()}
            className="gradient-primary shadow-glow hover:scale-105 transition-all h-[40px] px-6 rounded-[12px] font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Plataforma
          </Button>
        </div>
      </motion.div>

      {/* Bento Grid Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-[16px]"
      >
        {[
          { label: "Plataformas", value: String(stats.total), icon: Globe, color: "text-blue-500" },
          { label: "Ativas", value: String(stats.active), icon: Zap, color: "text-emerald-500" },
          { label: "Schemas", value: String(stats.schemas), icon: Database, color: "text-purple-500" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
          >
            <div className="glass-card p-[24px] relative overflow-hidden group border border-white/10 hover:border-white/20 transition-all duration-500 rounded-[16px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500" />
              <div className="flex items-center gap-[8px] mb-[16px]">
                <div className={`p-[10px] rounded-[12px] bg-black/40 border border-white/10 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <h3 className="text-[24px] font-bold font-geist tracking-tighter leading-[28px]">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* URL do Webhook — Glass Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-card p-[20px] border border-white/10 rounded-[16px] bg-black/20"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-[12px] shrink-0">
            <div className="w-[40px] h-[40px] rounded-[10px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-widest font-bold text-white/40">Endpoint Único</p>
              <p className="text-[11px] text-white/20">Use essa URL em todas as plataformas</p>
            </div>
          </div>
          <div className="flex gap-2 flex-1 w-full">
            <Input
              value={WEBHOOK_URL}
              readOnly
              className="bg-black/40 border-white/5 font-mono text-[12px] h-[40px] rounded-[10px] text-white/60 flex-1"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={copyWebhookUrl}
              className="glass-card border-white/10 hover:bg-white/10 w-[40px] h-[40px] rounded-[10px] shrink-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          <Badge
            variant="outline"
            className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 font-bold text-[10px] uppercase tracking-wider shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            <Zap className="w-3 h-3 mr-1" />
            Auto Discovery
          </Badge>
        </div>
      </motion.div>

      {/* Tabs — Premium Styled */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="glass-card border border-white/10 rounded-[16px] p-[6px] mb-6">
          <TabsList className="!flex w-full overflow-x-auto scrollbar-none bg-transparent gap-1">
            {[
              { value: "platforms", label: "Visão Geral", icon: Globe },
              { value: "history", label: "Histórico e Logs", icon: BarChart3 },
              { value: "rules", label: "Regras de Acesso", icon: Package },
              { value: "health", label: "Saúde de Dados", icon: ActivitySquare },
              { value: "advanced", label: "Avançado", icon: Settings },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className={cn(
                  "flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all",
                  "data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg",
                  "data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60"
                )}
              >
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* 1. VISÃO GERAL (Plataformas + Guias) */}
        <TabsContent value="platforms" className="space-y-8">
          {loadingPlatforms ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-48 w-full animate-pulse bg-white/5 rounded-[16px]" />
              ))}
            </div>
          ) : platforms && platforms.length > 0 ? (
            <div className="grid gap-[16px] sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {platforms.map((platform: any, idx: number) => (
                  <motion.div
                    key={platform.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="glass-card p-[24px] border border-white/10 hover:border-white/20 rounded-[16px] relative overflow-hidden group transition-all"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500" />

                    <div className="flex items-center justify-between mb-[16px] relative z-10">
                      <div className="flex items-center gap-[12px]">
                        <div className="w-[40px] h-[40px] rounded-[10px] bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/10">
                          <Globe className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="text-[14px] font-bold text-white">{platform.display_name}</h4>
                          <p className="text-[11px] font-mono text-white/30">{platform.name}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          platform.is_active
                            ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                            : "bg-white/5 text-white/40 border-white/10"
                        )}
                      >
                        {platform.is_active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    {platform.webhook_secret && (
                      <div className="mb-[16px] p-[12px] bg-black/40 rounded-[10px] border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-1">Secret</p>
                        <code className="text-[11px] font-mono text-white/40 block truncate">
                          {platform.webhook_secret.substring(0, 24)}...
                        </code>
                      </div>
                    )}

                    <div className="flex gap-2 relative z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 glass-card border-white/10 hover:bg-white/10 h-[36px] rounded-[10px] text-[11px] uppercase tracking-widest font-bold"
                        onClick={() => openConfigModal(platform)}
                      >
                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                        Configurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="glass-card border-white/10 hover:bg-white/10 w-[36px] h-[36px] rounded-[10px] p-0"
                        onClick={() => {
                          setSelectedPlatform(platform.id);
                          setActiveTab('history');
                        }}
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-[64px] flex flex-col items-center justify-center text-center gap-4 border-dashed border-white/10 rounded-[16px]"
            >
              <div className="w-[80px] h-[80px] rounded-full bg-white/5 flex items-center justify-center">
                <Globe className="w-10 h-10 text-white/10" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Nenhuma plataforma configurada</h3>
                <p className="text-white/40 max-w-[300px] mt-1 text-[14px]">
                  Adicione sua primeira plataforma para começar a receber webhooks.
                </p>
              </div>
              <Button
                onClick={() => openConfigModal()}
                className="gradient-primary shadow-glow hover:scale-105 transition-all h-[40px] px-6 rounded-[12px] font-medium mt-4"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Plataforma
              </Button>
            </motion.div>
          )}

          {/* Guias de Integração */}
          <div className="glass-card p-[24px] border border-white/10 rounded-[16px]">
            <div className="mb-6">
              <h3 className="text-[18px] font-semibold tracking-tight text-white">Como Integrar com as Plataformas</h3>
              <p className="text-[13px] text-white/50 mt-1">Guias passo a passo para configurar o endpoint de webhook em cada plataforma.</p>
            </div>
            
            <Accordion type="single" collapsible className="w-full space-y-2">
              <AccordionItem value="hotmart" className="border-white/10 bg-black/20 rounded-[12px] px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#F26522' }} />
                    <span className="font-semibold text-white">Hotmart</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-6">
                  <ol className="list-decimal list-inside space-y-2 text-[13px] text-white/70">
                    <li>Acesse o <strong>Painel Hotmart</strong> → Navegue (menu lateral) → Ferramentas.</li>
                    <li>Busque por <strong>Webhook (API e Notificações)</strong>.</li>
                    <li>Clique na aba de <strong>Autenticação</strong> e pegue o seu 'Hottok' e insira na configuração desta plataforma no Hub.</li>
                    <li>Clique em <strong>Cadastrar configuração</strong>.</li>
                    <li>Cole a URL do Endpoint Único deste Hub.</li>
                    <li>Selecione os eventos de <strong>Compra Aprovada</strong> e <strong>Compra Recusada/Cancelada</strong>.</li>
                    <li>Salve e envie um teste.</li>
                  </ol>
                  <div className="p-3 bg-white/5 rounded-[8px] border border-white/5">
                    <p className="text-[12px] text-white/60">
                      <strong>Dica:</strong> Em Mapeamentos (Modo Avançado), o Flow5 já puxa o e-mail em `buyer.email`.
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="kiwify" className="border-white/10 bg-black/20 rounded-[12px] px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00C1A4' }} />
                    <span className="font-semibold text-white">Kiwify</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-6">
                  <ol className="list-decimal list-inside space-y-2 text-[13px] text-white/70">
                    <li>Acesse o <strong>Dashboard Kiwify</strong> → Menu lateral superior (Apps) → Webhooks.</li>
                    <li>Clique em <strong>Criar Webhook</strong>.</li>
                    <li>Cole a URL do Endpoint Único.</li>
                    <li>Ative os eventos: <code>Cartão Aprovado</code>, <code>Pix Aprovado</code>, <code>Boleto Aprovado</code>.</li>
                    <li>Clique em salvar. Se desejar usar assinatura, adicione o Webhook Token na configuração.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cakto" className="border-white/10 bg-black/20 rounded-[12px] px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#7C3AED' }} />
                    <span className="font-semibold text-white">Cakto</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2 pb-6">
                  <ol className="list-decimal list-inside space-y-2 text-[13px] text-white/70">
                    <li>Acesse o <strong>Painel Cakto</strong> → Produtos.</li>
                    <li>Selecione o seu produto e vá na aba <strong>Integrações</strong>.</li>
                    <li>Clique em <strong>Adicionar Webhook (Postback)</strong>.</li>
                    <li>Insira a URL do Endpoint Único.</li>
                    <li>Marque as opções relacionadas à Vendas Aprovadas.</li>
                    <li>Teste enviando um disparo simulado.</li>
                  </ol>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </TabsContent>

        {/* 2. HISTÓRICO E LOGS */}
        <TabsContent value="history" className="space-y-6">
          <WebhookAnalytics
            platforms={platforms || []}
            selectedPlatform={selectedPlatform}
            onSelectPlatform={setSelectedPlatform}
          />
          <WebhookTransactionsList
            selectedPlatform={selectedPlatform}
            onSelectPlatform={setSelectedPlatform}
            platforms={platforms || []}
          />
        </TabsContent>

        {/* 3. REGRAS DE ACESSO */}
        <TabsContent value="rules" className="space-y-6">
          <div className="glass-card p-[24px] border border-white/10 rounded-[16px]">
             <div className="mb-6">
                <h3 className="text-[18px] font-semibold tracking-tight text-white line-clamp-1">Regras de Negócio</h3>
                <p className="text-[13px] text-white/50 mt-1">Determine o que acontece quando uma transação é recebida.</p>
             </div>
             <div className="space-y-8">
               <ProductMappingsEditor
                 platforms={platforms || []}
                 selectedPlatform={selectedPlatform}
                 onSelectPlatform={setSelectedPlatform}
               />
               <StatusMappingsEditor
                 platforms={platforms || []}
                 selectedPlatform={selectedPlatform}
                 onSelectPlatform={setSelectedPlatform}
               />
             </div>
          </div>
        </TabsContent>

        {/* 4. SAUDE DOS DADOS */}
        <TabsContent value="health" className="space-y-6">
          <div className="glass-card p-[24px] border border-white/10 rounded-[16px]">
             <div className="mb-6">
                <h3 className="text-[18px] font-semibold tracking-tight text-white line-clamp-1">Auditoria e Saúde de Dados</h3>
                <p className="text-[13px] text-white/50 mt-1">Identifique e resolva discrepâncias entre pagamentos, cancelamentos e o registro de acessos dos alunos.</p>
             </div>
             <DataHealthPanel />
          </div>
        </TabsContent>

        {/* 5. MODO AVANÇADO (Desenvolvedor) */}
        <TabsContent value="advanced" className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-[12px] flex items-start gap-3">
             <div className="mt-0.5"><Zap className="w-5 h-5 text-amber-500" /></div>
             <div>
               <p className="text-amber-400 text-[14px] font-bold tracking-wide">ÁREA TÉCNICA E ENGENHARIA DE DADOS</p>
               <p className="text-amber-400/70 text-[12px] mt-1">Alterações nos mapeamentos estruturais, fluxos de recepção de eventos (pipelines) e schemas inferidos podem quebrar o funcionamento automático. Seja cauteloso.</p>
             </div>
          </div>

          <div className="glass-card p-[6px] border border-white/10 rounded-[16px]">
            <Tabs defaultValue="schemas">
              <TabsList className="bg-transparent h-auto p-0 flex flex-wrap gap-1 px-4 py-2 border-b border-white/5 w-full justify-start">
                <TabsTrigger value="schemas" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-[8px] px-4 py-2 text-[12px] font-medium transition-all">Schemas Descobertos</TabsTrigger>
                <TabsTrigger value="mappings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-[8px] px-4 py-2 text-[12px] font-medium transition-all">Mapping de JSON</TabsTrigger>
                <TabsTrigger value="receivers" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-[8px] px-4 py-2 text-[12px] font-medium transition-all">Pipelines (Receptores)</TabsTrigger>
                <TabsTrigger value="test" className="data-[state=active]:bg-white/10 data-[state=active]:text-white rounded-[8px] px-4 py-2 text-[12px] font-medium transition-all">Payload Tester</TabsTrigger>
              </TabsList>

              <div className="p-4">
                <TabsContent value="schemas">
                  <WebhookSchemaViewer
                    schemas={schemas || []}
                    loading={loadingSchemas}
                    selectedPlatform={selectedPlatform}
                    onSelectPlatform={setSelectedPlatform}
                    platforms={platforms || []}
                  />
                </TabsContent>

                <TabsContent value="mappings">
                  <FieldMappingEditor
                    mappings={mappings || []}
                    loading={loadingMappings}
                    schemas={schemas || []}
                    platforms={platforms || []}
                    selectedPlatform={selectedPlatform}
                    onSelectPlatform={setSelectedPlatform}
                  />
                </TabsContent>

                <TabsContent value="receivers">
                  {showReceiverWizard ? (
                    <EventReceiverWizard
                      platforms={platforms || []}
                      onComplete={() => {
                        setShowReceiverWizard(false);
                        queryClient.invalidateQueries({ queryKey: ['event-receivers'] });
                      }}
                      onCancel={() => setShowReceiverWizard(false)}
                    />
                  ) : (
                    <EventReceiversList
                      onCreateNew={() => setShowReceiverWizard(true)}
                    />
                  )}
                </TabsContent>

                <TabsContent value="test">
                  <WebhookTestPanel
                    platforms={platforms || []}
                    schemas={schemas || []}
                  />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Configuração */}
      <PlatformConfigModal
        open={configModalOpen}
        onOpenChange={setConfigModalOpen}
        platform={editingPlatform}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ['webhook-platforms'] });
        }}
      />
    </div>
  );
}