import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  useWhatsAppSettings, useMessageTemplates, useWhatsAppLogs, useSendWhatsApp,
  type WhatsAppSettings as WhatsAppSettingsType
} from '@/hooks/useWhatsAppSettings';
import {
  MessageSquare, Settings2, FileText, Variable, Send, History, Copy, Check,
  Save, RefreshCw, Phone, CheckCircle2, XCircle, Clock, Lock, Database
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AdminHeader } from "@/components/admin/AdminHeader";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemAnim = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

const providers = [
  { id: 'evolution', name: 'Evolution API', description: 'API open-source para WhatsApp', available: true, recommended: true },
  { id: 'meta', name: 'Meta Cloud API', description: 'API oficial do Meta', available: false },
];

const availableVariables = [
  { name: '{{user_name}}', desc: 'Nome do usuário' }, { name: '{{user_email}}', desc: 'Email do usuário' },
  { name: '{{temp_password}}', desc: 'Senha temporária' }, { name: '{{login_url}}', desc: 'URL de login' },
  { name: '{{course_name}}', desc: 'Nome do curso' }, { name: '{{lesson_name}}', desc: 'Nome da aula' },
  { name: '{{customer_name}}', desc: 'Nome do cliente' }, { name: '{{customer_email}}', desc: 'Email do cliente' },
  { name: '{{customer_phone}}', desc: 'Telefone do cliente' }, { name: '{{amount}}', desc: 'Valor pago' },
  { name: '{{payment_method}}', desc: 'Método de pagamento' }, { name: '{{order_id}}', desc: 'ID do pedido' },
  { name: '{{level}}', desc: 'Nível atual do aluno' }, { name: '{{xp}}', desc: 'XP total do aluno' },
  { name: '{{medalha}}', desc: 'Nome da conquista' }, { name: '{{xp_medalha}}', desc: 'XP da conquista' },
  { name: '{{dias_ofensiva}}', desc: 'Dias de ofensiva' },
];

const categoryLabels: Record<string, string> = {
  welcome: 'Boas-vindas', notification: 'Notificações', payment: 'Pagamentos',
  admin: 'Administração', general: 'Geral', gamification: 'Gamificação',
};

const categoryIcons: Record<string, string> = {
  welcome: '🎉', notification: '🔔', payment: '💳', admin: '👤', general: '📝', gamification: '🏆',
};

export default function WhatsAppSettings() {
  const { settings, isLoading: settingsLoading, updateSettings, isSaving } = useWhatsAppSettings();
  const { templates, isLoading: templatesLoading, updateTemplate, isUpdating } = useMessageTemplates();
  const { logs, isLoading: logsLoading, refetch: refetchLogs } = useWhatsAppLogs();
  const { sendMessage, isSending } = useSendWhatsApp();

  const [formData, setFormData] = useState<Partial<WhatsAppSettingsType>>({});
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('🔔 *Teste de Integração*\n\nEsta é uma mensagem de teste.\n\nSe você recebeu, a integração está funcionando! ✅');
  const [templateEdits, setTemplateEdits] = useState<Record<string, { message: string; active: boolean }>>({});

  const currentSettings = { ...settings, ...formData };

  const copyVariable = (varName: string) => {
    navigator.clipboard.writeText(varName);
    setCopiedVar(varName);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const getPreviewMessage = (message: string) => {
    return message
      .replace(/\{\{user_name\}\}/g, 'João Silva').replace(/\{\{user_email\}\}/g, 'joao@email.com')
      .replace(/\{\{temp_password\}\}/g, 'Ab12#$').replace(/\{\{login_url\}\}/g, 'https://plataforma.com/login')
      .replace(/\{\{course_name\}\}/g, 'Curso de React').replace(/\{\{lesson_name\}\}/g, 'Introdução ao React')
      .replace(/\{\{customer_name\}\}/g, 'Maria Santos').replace(/\{\{customer_email\}\}/g, 'maria@email.com')
      .replace(/\{\{customer_phone\}\}/g, '11999999999').replace(/\{\{amount\}\}/g, '97,00')
      .replace(/\{\{payment_method\}\}/g, 'PIX').replace(/\{\{order_id\}\}/g, 'ORD-123456')
      .replace(/\{\{level\}\}/g, '5').replace(/\{\{xp\}\}/g, '1250')
      .replace(/\{\{medalha\}\}/g, 'Explorador Veterano').replace(/\{\{dias_ofensiva\}\}/g, '7');
  };

  const handleSaveSettings = async () => {
    await updateSettings(formData);
    setFormData({});
  };

  const handleSendTest = async () => {
    if (!testPhone.trim()) return;
    await sendMessage({ phone: testPhone, message: testMessage });
  };

  const handleSaveTemplate = async (templateId: string) => {
    const edit = templateEdits[templateId];
    if (edit) {
      await updateTemplate({ id: templateId, ...edit });
      setTemplateEdits(prev => { const next = { ...prev }; delete next[templateId]; return next; });
    }
  };

  const getTemplateEdit = (templateId: string, template: { message: string; active: boolean }) => {
    return templateEdits[templateId] || template;
  };

  const isConfigured = Boolean(currentSettings.evolution_api_url && currentSettings.evolution_api_key && currentSettings.evolution_instance_name);

  const stats = useMemo(() => ({
    sent: logs?.filter(l => l.status === "sent").length || 0,
    failed: logs?.filter(l => l.status === "failed").length || 0,
    total: logs?.length || 0,
  }), [logs]);

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-20">
      {/* Header */}
      <motion.div variants={itemAnim} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white flex items-center gap-3">
            <MessageSquare className="w-6 h-6 text-primary" /> Notificações de WhatsApp
          </h1>
          <p className="text-muted-foreground mt-1">Configure a integração e gerencie os templates de mensagens disparados pela plataforma.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass-card flex items-center gap-3 px-4 py-2 border-white/10 rounded-[12px]">
            {isConfigured ? (
              <span className="text-[13px] font-medium tracking-wide text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> CONFIGURADO
              </span>
            ) : (
              <span className="text-[13px] font-medium tracking-wide text-amber-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> PENDENTE
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* Bento Grid Stats */}
      <motion.div variants={itemAnim} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Mensagens Registradas", value: String(stats.total), icon: Database, color: "text-blue-500" },
          { label: "Entregas com Sucesso", value: String(stats.sent), icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Falhas de Envio", value: String(stats.failed), icon: XCircle, color: "text-red-500" },
        ].map((stat, i) => (
          <motion.div key={i} variants={itemAnim} transition={{ delay: 0.1 + i * 0.06 }}>
            <div className="glass-card p-6 relative overflow-hidden group border border-white/10 hover:border-white/20 transition-all duration-500 rounded-[20px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-[12px] bg-black/40 border border-white/10 ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight">{stat.value}</h3>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <Tabs defaultValue="provider" className="space-y-6">
        <div className="glass-card border border-white/10 rounded-[16px] p-[6px]">
          <TabsList className="!flex w-full overflow-x-auto scrollbar-none bg-transparent gap-1">
            <TabsTrigger value="provider" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40">
              <Settings2 className="h-3.5 w-3.5" /> Provedor
            </TabsTrigger>
            <TabsTrigger value="config" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40">
              <Settings2 className="h-3.5 w-3.5" /> Configuração
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40">
              <FileText className="h-3.5 w-3.5" /> Templates
            </TabsTrigger>
            <TabsTrigger value="variables" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40">
              <Variable className="h-3.5 w-3.5" /> Variáveis
            </TabsTrigger>
            <TabsTrigger value="test" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40">
              <Send className="h-3.5 w-3.5" /> Teste
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40">
              <History className="h-3.5 w-3.5" /> Histórico
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Provider Tab */}
        <TabsContent value="provider">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-[18px] font-bold tracking-tight text-white">Provedor de WhatsApp</h2>
              <p className="text-[12px] text-muted-foreground">Escolha qual API será usada para enviar mensagens para seus clientes</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {providers.map((provider) => (
                  <div key={provider.id} className={cn("relative cursor-pointer transition-all duration-300 rounded-[16px] p-6 border border-white/10 overflow-hidden", currentSettings.provider === provider.id ? "bg-primary/5 ring-1 ring-primary shadow-glow" : provider.available ? "bg-black/20 hover:bg-white/5" : "bg-black/40 opacity-60 cursor-not-allowed")} onClick={() => { if (provider.available) { setFormData(prev => ({ ...prev, provider: provider.id })); } }}>
                    <div className="flex items-start justify-between relative z-10">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-[15px]">{provider.name}</h4>
                          {provider.recommended && (<Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 uppercase tracking-wider font-bold">Recomendado</Badge>)}
                          {!provider.available && (<Badge variant="outline" className="text-[10px] bg-white/5 text-white/40 border-white/10 uppercase tracking-wider font-bold"><Lock className="h-3 w-3 mr-1" /> Em breve</Badge>)}
                        </div>
                        <p className="text-[13px] text-white/50 mt-1">{provider.description}</p>
                      </div>
                      {currentSettings.provider === provider.id && (<CheckCircle2 className="h-5 w-5 text-primary" />)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Configuração Tab */}
        <TabsContent value="config">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight text-white">Configuração Evolution API</h2>
                <p className="text-[12px] text-muted-foreground">Preencha as credenciais da sua instância da Evolution API</p>
              </div>
              <Button onClick={handleSaveSettings} disabled={isSaving} className="gradient-primary shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px] tracking-tight">
                {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Salvar Configurações
              </Button>
            </div>

            <div className="p-6 space-y-8">
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-[12px] flex gap-3">
                <div className="mt-0.5"><MessageSquare className="w-5 h-5 text-primary" /></div>
                <div>
                  <h4 className="text-[13px] font-bold text-primary tracking-wide">COMO CONFIGURAR O WHATSAPP:</h4>
                  <ol className="text-[12px] text-primary/70 list-decimal list-inside mt-2 space-y-1">
                    <li>Instale o Evolution API em seu próprio servidor ou utilize uma hospedagem gerenciada.</li>
                    <li>Crie uma nova instância via dashboard do Evolution e escaneie o código QR com o WhatsApp de envio.</li>
                    <li>Preencha a URL da API do seu servidor, sua Global API Key e o Nome da Instância abaixo.</li>
                  </ol>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-white/80 font-medium text-[13px]">URL da API</Label>
                  <Input placeholder="https://api.evolution.exemplo.com" value={currentSettings.evolution_api_url || ''} onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_url: e.target.value }))} className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[12px]" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 font-medium text-[13px]">API Key <span className="text-white/40 font-normal">(Global ou Exclusiva)</span></Label>
                  <Input type="password" placeholder="Sua chave de API" value={currentSettings.evolution_api_key || ''} onChange={(e) => setFormData(prev => ({ ...prev, evolution_api_key: e.target.value }))} className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[12px] font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80 font-medium text-[13px]">Nome da Instância</Label>
                  <Input placeholder="minha-instancia-wpp" value={currentSettings.evolution_instance_name || ''} onChange={(e) => setFormData(prev => ({ ...prev, evolution_instance_name: e.target.value }))} className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[12px]" />
                </div>
              </div>

              <div className="border-t border-white/5 pt-6 space-y-6">
                <h4 className="font-semibold text-white text-[15px]">Ajustes Finos</h4>
                <div className="flex items-center justify-between bg-black/20 p-4 rounded-[12px] border border-white/5">
                  <div>
                    <Label className="text-white font-medium text-[13px]">Presença: Indicador de digitação</Label>
                    <p className="text-[12px] text-white/50">Simula que um humano está digitando antes de enviar a mensagem</p>
                  </div>
                  <Switch checked={currentSettings.send_typing_indicator ?? true} onCheckedChange={(checked) => setFormData(prev => ({ ...prev, send_typing_indicator: checked }))} />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/80 font-medium text-[13px]">Delay entre mensagens <span className="text-white/40">(ms)</span></Label>
                    <Input type="number" value={currentSettings.delay_between_messages ?? 1000} onChange={(e) => setFormData(prev => ({ ...prev, delay_between_messages: parseInt(e.target.value) || 1000 }))} className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[12px]" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/80 font-medium text-[13px]">DDI (País) Padrão</Label>
                    <Input placeholder="55" value={currentSettings.default_country_code || '55'} onChange={(e) => setFormData(prev => ({ ...prev, default_country_code: e.target.value }))} className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[12px]" />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-[18px] font-bold tracking-tight text-white">Templates de Mensagem</h2>
              <p className="text-[12px] text-muted-foreground">Personalize as mensagens automatizadas e gerencie seus disparos reais.</p>
            </div>
            <div className="p-6">
              {templatesLoading ? (
                <div className="space-y-4">{[1, 2, 3].map((i) => (<Skeleton key={i} className="h-20 w-full bg-white/5 rounded-[12px]" />))}</div>
              ) : (
                <Accordion type="single" collapsible className="space-y-3">
                  {templates.map((template) => {
                    const edit = getTemplateEdit(template.id, template);
                    const hasChanges = templateEdits[template.id] !== undefined;

                    return (
                      <AccordionItem key={template.id} value={template.id} className="border border-white/10 rounded-[12px] bg-black/20 data-[state=open]:bg-black/40 overflow-hidden px-0">
                        <AccordionTrigger className="hover:no-underline hover:bg-white/5 px-6 py-4">
                          <div className="flex items-center gap-4 text-left flex-1">
                            <div className="w-[40px] h-[40px] rounded-[10px] bg-white/5 border border-white/10 flex items-center justify-center text-[18px]">{categoryIcons[template.category] || '📝'}</div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white text-[14px]">{template.title}</p>
                                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0 border", edit.active ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-white/5 text-white/40 border-white/10")}>{edit.active ? 'Ativo' : 'Inativo'}</Badge>
                                <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 bg-white/5 border-white/10 text-white/60">{categoryLabels[template.category] || template.category}</Badge>
                              </div>
                              <p className="text-[12px] text-white/50 mt-1">{template.description}</p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-0 pb-6 px-6 relative">
                          <div className="block h-px w-full bg-white/5 mb-6" />
                          <div className="grid lg:grid-cols-2 gap-8">
                            <div className="space-y-6">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-[14px] font-semibold text-white">Ativação do Template</Label>
                                  <p className="text-[12px] text-white/50">Disparar ao ocorrer este evento</p>
                                </div>
                                <Switch checked={edit.active} onCheckedChange={(checked) => { setTemplateEdits(prev => ({ ...prev, [template.id]: { ...edit, active: checked } })); }} />
                              </div>

                              <div className="space-y-3">
                                <Label className="text-[13px] text-white/80 font-medium">Textos Dinâmicos</Label>
                                <div className="flex flex-wrap gap-1.5">{availableVariables.slice(0, 8).map((v) => (<button key={v.name} onClick={() => copyVariable(v.name)} className="px-2.5 py-1 text-[11px] font-mono bg-white/5 hover:bg-white/10 border border-white/5 rounded-[6px] text-white/80 transition-colors">{copiedVar === v.name ? (<span className="text-emerald-400">Copiado!</span>) : (v.name)}</button>))}</div>
                              </div>

                              <div className="space-y-3">
                                <Label className="text-[13px] text-white/80 font-medium">Corpo da Mensagem do WhatsApp</Label>
                                <Textarea value={edit.message} onChange={(e) => { setTemplateEdits(prev => ({ ...prev, [template.id]: { ...edit, message: e.target.value } })); }} rows={10} className="font-mono text-[13px] bg-black/40 border-white/10 text-white resize-none rounded-[10px]" placeholder="Use *negrito* para destacar texto..." />
                                <p className="text-[11px] text-muted-foreground">Suporta marcação nativa do WhatsApp: *negrito*, _itálico_, ~tachado~</p>
                              </div>

                              <div>
                                <Button size="sm" onClick={() => handleSaveTemplate(template.id)} disabled={isUpdating || !hasChanges} className={cn("h-[40px] px-6 rounded-[10px] w-full font-medium transition-all", hasChanges ? "gradient-primary shadow-glow" : "bg-white/5 text-white/40")}>{isUpdating ? (<RefreshCw className="h-4 w-4 mr-2 animate-spin" />) : (<Save className="h-4 w-4 mr-2" />)} Salvar Este Template</Button>
                              </div>
                            </div>

                            <div className="space-y-4 pt-1 lg:pt-0">
                              <Label className="text-[14px] font-semibold text-white">Visualização no Dispositivo</Label>
                              <p className="text-[12px] text-white/50">Simulação de como a mensagem chegará.</p>

                              <div className="rounded-[16px] bg-[#E5DDD5] overflow-hidden relative shadow-inner border border-white/10 min-h-[300px]">
                                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-cool-dark-green-new-theme-whatsapp.jpg")', backgroundSize: 'cover' }}></div>
                                <div className="h-12 bg-[#075E54] flex items-center px-4 relative z-10 shadow-md"><div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center"><span className="text-white text-xs font-bold font-sans">FM</span></div><div className="ml-3"><p className="text-white font-semibold text-[14px] leading-tight">Flow Members</p><p className="text-white/70 text-[11px] leading-tight mt-0.5">conta comercial verificada</p></div></div>
                                <div className="p-4 relative z-10 space-y-4"><div className="bg-[#DCF8C6] p-3 rounded-[12px] rounded-tl-sm shadow-sm max-w-[85%] self-end mx-auto relative ml-auto border border-black/5"><p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[#111111] font-sans">{getPreviewMessage(edit.message)}</p><div className="text-[10px] text-gray-500 text-right mt-1.5 flex items-center justify-end gap-1 font-sans">{format(new Date(), 'HH:mm', { locale: ptBR })}<svg viewBox="0 0 16 15" width="16" height="15"><path fill="#53bdeb" d="m15.01 3.316-.478-.372a.365.365 0 0 0-.51.063L8.666 9.88a.32.32 0 0 1-.484.032l-.358-.325a.32.32 0 0 0-.484.032l-.378.48a.418.418 0 0 0 .036.54l1.32 1.267c.143.14.361.125.484-.033l6.272-8.048a.366.366 0 0 0-.064-.512zm-4.1 0-.478-.372a.365.365 0 0 0-.51.063L4.566 9.88a.32.32 0 0 1-.484.032L1.892 7.72a.366.366 0 0 0-.516.005l-.423.433a.364.364 0 0 0 .006.514l3.255 3.185c.143.14.361.125.484-.033l6.272-8.048a.365.365 0 0 0-.063-.51z"></path></svg></div></div></div></div>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </div>
          </motion.div>
        </TabsContent>

        {/* Variables Tab */}
        <TabsContent value="variables">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-[18px] font-bold tracking-tight text-white">Guia de Variáveis de Contexto</h2>
              <p className="text-[12px] text-muted-foreground">Shortcodes interpretados nos templates</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">{availableVariables.map((v) => (<button key={v.name} onClick={() => copyVariable(v.name)} className="group flex flex-col items-start justify-center gap-1.5 p-4 bg-black/20 border border-white/5 hover:border-white/20 hover:bg-white/5 rounded-[12px] transition-all relative overflow-hidden"><div className="flex items-center justify-between w-full"><code className="text-[13px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-[6px] tracking-tight">{v.name}</code>{copiedVar === v.name ? <Check className="h-4 w-4 text-emerald-400 shrink-0" /> : <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-white/40 shrink-0 transition-opacity" />}</div><p className="text-[12px] text-white/50">{v.desc}</p></button>))}</div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Test Tab */}
        <TabsContent value="test">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02]">
              <h2 className="text-[18px] font-bold tracking-tight text-white flex items-center gap-2"><Phone className="w-5 h-5 text-primary" /> Testar Integração</h2>
              <p className="text-[12px] text-muted-foreground">Efetue o disparo de uma mensagem avulsa para verificar a saúde da API da Evolution.</p>
            </div>
            <div className="p-6 space-y-6">
              {!isConfigured && (<div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-[12px] flex items-center gap-3"><XCircle className="w-5 h-5 flex-shrink-0" /><div><p className="font-bold text-[14px]">Credenciais Ausentes</p><p className="text-[12px] text-red-400/80 mt-0.5">Preencha as configurações API na aba "Configuração" antes de tentar efetuar testes.</p></div></div>)}

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/80 font-medium text-[13px]">Telefone Destinatário</Label>
                    <Input placeholder="Ex: 5511999999999" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="font-mono bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[12px]" />
                    <p className="text-[11px] text-muted-foreground">Formato sem máscara e caracteres: código do país + DDD + número.</p>
                  </div>
                  <div className="pt-2"><Button onClick={handleSendTest} disabled={isSending || !testPhone.trim() || !isConfigured} className="w-full h-[48px] rounded-[12px] font-bold">{isSending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}{isSending ? 'Processando envio...' : 'Disparar Teste'}</Button></div>
                </div>
                <div className="space-y-2 relative">
                  <Label className="text-white/80 font-medium text-[13px]">Carga Utíl (Texto da Mensagem)</Label>
                  <Textarea value={testMessage} onChange={(e) => setTestMessage(e.target.value)} rows={6} className="font-mono text-[13px] bg-black/20 border-white/10 text-white resize-none rounded-[12px]" />
                </div>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
            <div className="p-6 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
              <div>
                <h2 className="text-[18px] font-bold tracking-tight text-white">Log de Mensagens de WhatsApp</h2>
                <p className="text-[12px] text-muted-foreground">Histórico da fila de processamento e tentativas recentes de entrega da API.</p>
              </div>
              <Button onClick={() => refetchLogs()} variant="outline" className="h-[40px] px-4 glass-card border-white/10 rounded-[10px] text-white"><RefreshCw className="h-4 w-4 mr-2" /> Refresh</Button>
            </div>

            <div className="p-6">
              {logsLoading ? (<div className="flex items-center justify-center py-20"><RefreshCw className="h-6 w-6 animate-spin text-white/20" /></div>) : logs.length === 0 ? (
                <div className="text-center py-20 bg-black/20 rounded-[12px] border border-white/5 border-dashed"><History className="h-8 w-8 mx-auto mb-3 text-white/20" /><p className="text-[15px] font-semibold text-white tracking-tight">Registro Vazio</p><p className="text-[13px] text-white/40 mt-1 max-w-[300px] mx-auto">Em breve seu histórico de disparos de mensageria ativa aparecerá aqui.</p></div>
              ) : (
                <ScrollArea className="h-[500px]"><div className="rounded-[12px] border border-white/5 overflow-hidden"><table className="w-full"><thead className="bg-black/40"><tr><th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Status</th><th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Telefone</th><th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Contexto (ID Template)</th><th className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Prévia do Conteúdo</th><th className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-white/40">Data/Hora</th></tr></thead><tbody className="divide-y divide-white/5">{logs.map((log) => (<tr key={log.id} className="border-b border-white/5 bg-black/20 hover:bg-white/5 transition-colors"><td className="px-6 py-3">{log.status === 'sent' ? (<Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold tracking-wider text-[10px] uppercase shadow-[0_0_10px_rgba(16,185,129,0.1)] gap-1"><CheckCircle2 className="h-3 w-3" /> Enviado</Badge>) : log.status === 'failed' ? (<Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 font-bold tracking-wider text-[10px] uppercase shadow-[0_0_10px_rgba(239,68,68,0.1)] gap-1"><XCircle className="h-3 w-3" /> Falhou</Badge>) : (<Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold tracking-wider text-[10px] uppercase shadow-[0_0_10px_rgba(245,158,11,0.1)] gap-1"><Clock className="h-3 w-3" /> Abortado</Badge>)}</td><td className="font-mono text-[12px] text-white/80 py-3">{log.phone}</td><td className="py-3">{log.template_key ? (<Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/60 font-mono py-0">{log.template_key}</Badge>) : (<span className="text-white/20">-</span>)}</td><td className="max-w-[250px] truncate text-[12px] py-3 text-white/60">{log.message_preview || '-'}</td><td className="text-white/40 text-[12px] text-right py-3 tabular-nums">{format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</td></tr>))}</tbody></table></div></ScrollArea>
              )}
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}