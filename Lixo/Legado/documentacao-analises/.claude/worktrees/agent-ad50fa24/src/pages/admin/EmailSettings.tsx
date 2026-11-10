import { useState, useEffect, useMemo } from "react";
import { useEmailSettings, useEmailLogs } from "@/hooks/useEmailSettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
   Mail,
   Settings2,
   FileText,
   History,
   CheckCircle2,
   XCircle,
   Send,
   Eye,
   EyeOff,
   Loader2,
   ExternalLink,
   ShoppingCart,
   CreditCard,
   UserPlus,
   RotateCcw,
   Variable,
   Copy,
   Check,
   Server,
   Database,
   RefreshCw,
   Save,
   Trophy,
   Flame,
   TrendingUp
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

// Email notification types (aligned with WhatsApp templates)
const notificationTypes = [
   {
      id: "new_sale_admin",
      title: "Nova Venda - Admin",
      description: "Notificação para admin sobre nova venda",
      icon: ShoppingCart,
      category: "Administração",
      defaultSubject: "Nova venda realizada! 🛒",
      defaultGreeting: "Olá Admin,",
      defaultMessage: "Uma nova venda foi realizada na plataforma!\n\nCliente: {{nome}}\nValor: {{total}}\nProduto: {{produto}}",
   },
   {
      id: "course_access",
      title: "Acesso ao Curso",
      description: "Enviada quando o aluno recebe acesso a um curso",
      icon: UserPlus,
      category: "Notificações",
      defaultSubject: "Você tem acesso a um novo curso! 🎓",
      defaultGreeting: "Olá {{nome}},",
      defaultMessage: "Você acaba de receber acesso ao curso {{curso}}!\n\nAcesse agora e comece sua jornada de aprendizado.",
   },
   {
      id: "lesson_reminder",
      title: "Lembrete de Aula",
      description: "Lembrete para continuar estudando",
      icon: Send,
      category: "Notificações",
      defaultSubject: "Hora de continuar estudando! 📚",
      defaultGreeting: "Olá {{nome}},",
      defaultMessage: "Não esqueça de continuar sua jornada!\n\nVocê parou na aula: {{aula}}\n\nVamos lá, seu progresso está esperando por você!",
   },
   {
      id: "payment_approved",
      title: "Pagamento Confirmado",
      description: "Enviada quando o pagamento é aprovado",
      icon: CreditCard,
      category: "Pagamentos",
      defaultSubject: "Pagamento confirmado! ✅",
      defaultGreeting: "Olá {{user_name}},",
      defaultMessage: "Seu pagamento foi aprovado com sucesso!\n\nValor: {{total}}\nMétodo: {{pagamento}}\n\nVocê já pode acessar seu conteúdo.",
   },
   {
      id: "welcome",
      title: "Boas-vindas",
      description: "Enviada quando um novo aluno é cadastrado",
      icon: UserPlus,
      category: "Boas-vindas",
      defaultSubject: "Bem-vindo à plataforma! 🎉",
      defaultGreeting: "Olá {{user_name}},",
      defaultMessage: "Seja muito bem-vindo(a) à nossa plataforma!\n\nSua conta foi criada com sucesso.\n\nAcesse agora e comece sua jornada.",
   },
   {
      id: "level_up",
      title: "Subida de Nível",
      description: "Enviada quando o aluno sobe de nível",
      icon: TrendingUp,
      category: "Gamificação",
      defaultSubject: "Parabéns! Você alcançou o nível {{level}}! 🚀",
      defaultGreeting: "Incrível, {{nome}}!",
      defaultMessage: "Você acaba de subir de nível!\n\nSeu novo nível: {{level}}\nXP Total: {{xp}}\n\nContinue assim e alcance novas conquistas!",
   },
   {
      id: "achievement_unlocked",
      title: "Conquista Desbloqueada",
      description: "Enviada quando o aluno desbloqueia uma medalha",
      icon: Trophy,
      category: "Gamificação",
      defaultSubject: "Nova conquista desbloqueada: {{medalha}}! 🏆",
      defaultGreeting: "Parabéns, {{nome}}!",
      defaultMessage: "Você acaba de desbloquear uma nova conquista!\n\nMedalha: {{medalha}}\nDescrição: {{descricao_medalha}}\nXP Ganhos: {{xp_medalha}}\n\nSua galeria está ficando impressionante!",
   },
   {
      id: "streak_at_risk",
      title: "Ofensiva em Risco",
      description: "Alerta quando o aluno está prestes a perder a ofensiva",
      icon: Flame,
      category: "Gamificação",
      defaultSubject: "Não perca seu fogo! Sua ofensiva de {{dias_ofensiva}} dias está em risco! 🔥",
      defaultGreeting: "Atenção, {{nome}}!",
      defaultGreeting: "Atenção, {{user_name}}!",
      defaultMessage: "Falta pouco para você perder sua sequência de {{dias_ofensiva}} dias!\n\nAcesse agora, assista a uma aula e mantenha seu ritmo de aprendizado.",
   },
];

// Available variables for email templates
const availableVariables = [
   { name: '{{user_name}}', desc: 'Nome do aluno' },
   { name: '{{user_email}}', desc: 'Email do aluno' },
   { name: '{{temp_password}}', desc: 'Senha temporária' },
   { name: '{{login_url}}', desc: 'URL de login' },
   { name: '{{course_name}}', desc: 'Nome do curso' },
   { name: '{{lesson_name}}', desc: 'Nome da aula' },
   { name: '{{customer_name}}', desc: 'Nome do cliente' },
   { name: '{{customer_email}}', desc: 'Email do cliente' },
   { name: '{{customer_phone}}', desc: 'Telefone do cliente' },
   { name: '{{amount}}', desc: 'Valor pago' },
   { name: '{{payment_method}}', desc: 'Método de pagamento' },
   { name: '{{order_id}}', desc: 'ID do pedido' },
   { name: '{{level}}', desc: 'Nível atual do aluno' },
   { name: '{{xp}}', desc: 'XP total do aluno' },
   { name: '{{medalha}}', desc: 'Nome da conquista desbloqueada' },
   { name: '{{descricao_medalha}}', desc: 'Descrição da conquista desbloqueada' },
   { name: '{{xp_medalha}}', desc: 'XP ganho com a conquista' },
   { name: '{{dias_ofensiva}}', desc: 'Dias atuais de ofensiva' },
];

// Template state type
interface TemplateState {
   subject: string;
   greeting: string;
   message: string;
}

export default function EmailSettings() {
   const { settings, isLoading, updateSettings, isUpdating, testConnection, isTesting } = useEmailSettings();
   const { data: logs, isLoading: isLoadingLogs } = useEmailLogs({ limit: 50 });

   // Provider state
   const [provider, setProvider] = useState<"smtp" | "brevo">("brevo");
   const [brevoApiKey, setBrevoApiKey] = useState("");
   const [smtpHost, setSmtpHost] = useState("");
   const [smtpPort, setSmtpPort] = useState("587");
   const [smtpUser, setSmtpUser] = useState("");
   const [smtpPassword, setSmtpPassword] = useState("");
   const [smtpSecure, setSmtpSecure] = useState(true);
   const [showPassword, setShowPassword] = useState(false);
   const [fromEmail, setFromEmail] = useState("");
   const [fromName, setFromName] = useState("");
   const [isEnabled, setIsEnabled] = useState(false);
   const [showApiKey, setShowApiKey] = useState(false);
   const [testEmail, setTestEmail] = useState("");

   // Notification toggles
   const [notificationToggles, setNotificationToggles] = useState<Record<string, boolean>>({
      new_sale_admin: true,
      course_access: true,
      lesson_reminder: true,
      payment_approved: true,
      welcome: true,
      level_up: true,
      achievement_unlocked: true,
      streak_at_risk: true,
   });

   // Templates state
   const [selectedTemplate, setSelectedTemplate] = useState("new_sale_admin");
   const [templates, setTemplates] = useState<Record<string, TemplateState>>({});
   const [copiedVar, setCopiedVar] = useState<string | null>(null);

   // Copy variable to clipboard
   const copyVariable = (varName: string) => {
      navigator.clipboard.writeText(varName);
      setCopiedVar(varName);
      setTimeout(() => setCopiedVar(null), 1500);
   };

   // Initialize from settings
   useEffect(() => {
      if (settings) {
         setProvider((settings.provider as "smtp" | "brevo") || "brevo");
         setBrevoApiKey(settings.brevo_api_key || "");
         setSmtpHost(settings.smtp_host || "");
         setSmtpPort(String(settings.smtp_port || 587));
         setSmtpUser(settings.smtp_user || "");
         setSmtpPassword(settings.smtp_password || "");
         setSmtpSecure(settings.smtp_secure ?? true);
         setFromEmail(settings.from_email || "");
         setFromName(settings.from_name || "");
         setIsEnabled(settings.is_active ?? false);

         // Load notification toggles and templates from template_colors (used as JSON storage)
         if (settings.template_colors) {
            const colors = settings.template_colors as Record<string, any>;
            if (colors.notification_toggles) {
               setNotificationToggles({ ...notificationToggles, ...colors.notification_toggles });
            }
            if (colors.email_templates) {
               setTemplates(colors.email_templates);
            }
         }
      }
   }, [settings]);

   // Initialize default templates
   useEffect(() => {
      const defaultTemplates: Record<string, TemplateState> = {};
      notificationTypes.forEach(type => {
         if (!templates[type.id]) {
            defaultTemplates[type.id] = {
               subject: type.defaultSubject,
               greeting: type.defaultGreeting,
               message: type.defaultMessage,
            };
         }
      });
      if (Object.keys(defaultTemplates).length > 0) {
         setTemplates(prev => ({ ...defaultTemplates, ...prev }));
      }
   }, []);

   const currentTemplate = useMemo(() => {
      const type = notificationTypes.find(t => t.id === selectedTemplate);
      return templates[selectedTemplate] || {
         subject: type?.defaultSubject || "",
         greeting: type?.defaultGreeting || "",
         message: type?.defaultMessage || "",
      };
   }, [selectedTemplate, templates]);

   const updateTemplate = (field: keyof TemplateState, value: string) => {
      setTemplates(prev => ({
         ...prev,
         [selectedTemplate]: {
            ...currentTemplate,
            [field]: value,
         },
      }));
   };

   const resetTemplate = () => {
      const type = notificationTypes.find(t => t.id === selectedTemplate);
      if (type) {
         setTemplates(prev => ({
            ...prev,
            [selectedTemplate]: {
               subject: type.defaultSubject,
               greeting: type.defaultGreeting,
               message: type.defaultMessage,
            },
         }));
      }
   };

   // Preview with variables replaced
   const getPreview = (text: string) => {
      return text
         .replace(/\{\{nome\}\}/g, "João Silva")
         .replace(/\{\{numero\}\}/g, "#ORD-123456")
         .replace(/\{\{total\}\}/g, "R$ 97,00")
         .replace(/\{\{pagamento\}\}/g, "PIX")
         .replace(/\{\{link\}\}/g, "https://plataforma.com/login")
         .replace(/\{\{rastreio\}\}/g, "BR123456789")
         .replace(/\{\{level\}\}/g, "5")
         .replace(/\{\{xp\}\}/g, "1250")
         .replace(/\{\{medalha\}\}/g, "Explorador Veterano")
         .replace(/\{\{descricao_medalha\}\}/g, "Completou o primeiro módulo do curso.")
         .replace(/\{\{xp_medalha\}\}/g, "100")
         .replace(/\{\{dias_ofensiva\}\}/g, "7");
   };

   const handleSave = () => {
      updateSettings({
         provider,
         brevo_api_key: brevoApiKey || null,
         smtp_host: smtpHost || null,
         smtp_port: parseInt(smtpPort) || 587,
         smtp_user: smtpUser || null,
         smtp_password: smtpPassword || null,
         smtp_secure: smtpSecure,
         from_email: fromEmail,
         from_name: fromName,
         is_active: isEnabled,
         // Store notification toggles and templates in template_colors (JSON field)
         template_colors: {
            notification_toggles: notificationToggles,
            email_templates: templates,
         },
      });
   };

   const handleTest = () => {
      if (!testEmail) {
         toast.error("Digite um email de destino para o teste");
         return;
      }
      testConnection({
         provider,
         brevo_api_key: brevoApiKey || null,
         smtp_host: smtpHost || null,
         smtp_port: parseInt(smtpPort) || 587,
         smtp_user: smtpUser || null,
         smtp_password: smtpPassword || null,
         smtp_secure: smtpSecure,
         from_email: fromEmail,
         from_name: fromName,
         testRecipient: testEmail,
      });
   };

   if (isLoading) {
      return (
         <div className="flex items-center justify-center h-[50vh]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
         </div>
      );
   }

   const stats = {
      sent: logs?.filter(l => l.status === "sent").length || 0,
      failed: logs?.filter(l => l.status !== "sent").length || 0,
      total: logs?.length || 0,
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
                  Notificações por Email
               </h1>
               <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
                  Configure o envio automático transacional via BREVO ou SMTP.
               </p>
            </div>

            <div className="flex items-center gap-4">
               <div className="glass-card flex items-center gap-3 px-4 py-2 border-white/10 rounded-[12px]">
                  <span className={cn("text-[13px] font-medium tracking-wide", isEnabled ? "text-emerald-400" : "text-white/40")}>
                     {isEnabled ? "SISTEMA ATIVO" : "SISTEMA INATIVO"}
                  </span>
                  <Switch
                     checked={isEnabled}
                     onCheckedChange={setIsEnabled}
                  />
               </div>
               <Button 
                  onClick={handleSave} 
                  disabled={isUpdating}
                  className="gradient-primary shadow-glow hover:scale-105 transition-all h-[40px] px-6 rounded-[12px] font-medium"
               >
                  {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Salvar
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
               { label: "Emails Registrados", value: String(stats.total), icon: Database, color: "text-blue-500" },
               { label: "Entregas com Sucesso", value: String(stats.sent), icon: CheckCircle2, color: "text-emerald-500" },
               { label: "Falhas de Envio", value: String(stats.failed), icon: XCircle, color: "text-red-500" },
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

         <Tabs defaultValue="config" className="space-y-6">
            <div className="glass-card border border-white/10 rounded-[16px] p-[6px]">
               <TabsList className="!flex w-full overflow-x-auto scrollbar-none bg-transparent gap-1">
                  <TabsTrigger value="config" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60">
                     <Settings2 className="h-3.5 w-3.5" />
                     <span className="hidden sm:inline">Configurações</span>
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60">
                     <FileText className="h-3.5 w-3.5" />
                     <span className="hidden sm:inline">Templates</span>
                  </TabsTrigger>
                  <TabsTrigger value="variables" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60">
                     <Variable className="h-3.5 w-3.5" />
                     <span className="hidden sm:inline">Variáveis</span>
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="flex-shrink-0 text-[11px] uppercase tracking-widest font-bold gap-1.5 px-4 py-2.5 rounded-[10px] transition-all data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:text-white/40 data-[state=inactive]:hover:text-white/60">
                     <History className="h-3.5 w-3.5" />
                     <span className="hidden sm:inline">Histórico</span>
                  </TabsTrigger>
               </TabsList>
            </div>

            {/* Configuration Tab */}
            <TabsContent value="config" className="space-y-6">
               {/* Provider Selection */}
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <h2 className="text-[18px] font-semibold tracking-tight text-white">Provedor de Email</h2>
                     <p className="text-[12px] text-muted-foreground">Selecione entre SMTP tradicional ou API do Brevo</p>
                  </div>
                  <div className="p-6">
                     <div className="grid md:grid-cols-2 gap-[16px]">
                        <div
                           className={cn(
                              "relative cursor-pointer transition-all duration-300 rounded-[16px] p-[24px] border border-white/10 overflow-hidden",
                              provider === "smtp" ? "bg-primary/5 ring-1 ring-primary shadow-glow" : "bg-black/20 hover:bg-white/5"
                           )}
                           onClick={() => setProvider("smtp")}
                        >
                           <div className="flex items-start gap-4 relative z-10">
                              <div className={cn("p-3 rounded-[12px] border border-white/5", provider === "smtp" ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40")}>
                                 <Server className="h-6 w-6" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-white text-[15px]">SMTP Tradicional</h4>
                                 <p className="text-[13px] text-white/50 mt-1 leading-snug">Hostgator, Hostinger, Napoleon, AWS SES, entre outros.</p>
                              </div>
                           </div>
                        </div>

                        <div
                           className={cn(
                              "relative cursor-pointer transition-all duration-300 rounded-[16px] p-[24px] border border-white/10 overflow-hidden",
                              provider === "brevo" ? "bg-primary/5 ring-1 ring-primary shadow-glow" : "bg-black/20 hover:bg-white/5"
                           )}
                           onClick={() => setProvider("brevo")}
                        >
                           <div className="flex items-start gap-4 relative z-10">
                              <div className={cn("p-3 rounded-[12px] border border-white/5", provider === "brevo" ? "bg-primary/20 text-primary" : "bg-white/5 text-white/40")}>
                                 <Mail className="h-6 w-6" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-white text-[15px]">Brevo API</h4>
                                 <p className="text-[13px] text-white/50 mt-1 leading-snug">Ideal: Alta entregabilidade. (Ex-Sendinblue, 300 emails/dia grátis).</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>

               {/* SMTP / Brevo Config Area */}
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <h2 className="text-[18px] font-semibold tracking-tight text-white">
                        {provider === "smtp" ? "Credenciais SMTP" : "Chave de API do Brevo"}
                     </h2>
                     <p className="text-[12px] text-muted-foreground">Autenticação necessária para envio de mensagens</p>
                  </div>
                  <div className="p-6">
                     {provider === "smtp" && (
                        <div className="space-y-6">
                           <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <Label className="text-white/80 font-medium text-[13px]">Host do Servidor *</Label>
                                 <Input
                                    value={smtpHost}
                                    onChange={(e) => setSmtpHost(e.target.value)}
                                    placeholder="smtp.hostinger.com"
                                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                                 />
                                 <p className="text-[11px] text-muted-foreground">Ex: smtp.hostinger.com, mail.seudominio.com</p>
                              </div>

                              <div className="space-y-2">
                                 <Label className="text-white/80 font-medium text-[13px]">Porta</Label>
                                 <Input
                                    type="number"
                                    value={smtpPort}
                                    onChange={(e) => setSmtpPort(e.target.value)}
                                    placeholder="587"
                                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                                 />
                                 <p className="text-[11px] text-muted-foreground">587 (TLS recomendado), 465 (SSL).</p>
                              </div>
                           </div>

                           <div className="grid md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                 <Label className="text-white/80 font-medium text-[13px]">Usuário</Label>
                                 <Input
                                    value={smtpUser}
                                    onChange={(e) => setSmtpUser(e.target.value)}
                                    placeholder="noreply@seudominio.com"
                                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                                 />
                              </div>

                              <div className="space-y-2">
                                 <Label className="text-white/80 font-medium text-[13px]">Senha</Label>
                                 <div className="relative">
                                    <Input
                                       type={showPassword ? "text" : "password"}
                                       value={smtpPassword}
                                       onChange={(e) => setSmtpPassword(e.target.value)}
                                       placeholder="••••••••"
                                       className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px] pr-10"
                                    />
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon"
                                       className="absolute right-0 top-1/2 -translate-y-1/2 h-[44px] w-[44px] text-white/40 hover:text-white hover:bg-transparent"
                                       onClick={() => setShowPassword(!showPassword)}
                                    >
                                       {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center space-x-3 p-4 bg-black/20 rounded-[12px] border border-white/5">
                              <Switch id="smtp-secure" checked={smtpSecure} onCheckedChange={setSmtpSecure} />
                              <Label htmlFor="smtp-secure" className="text-white/80">Usar conexão segura (TLS/SSL)</Label>
                           </div>
                        </div>
                     )}

                     {provider === "brevo" && (
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <Label className="text-white/80 font-medium text-[13px]">API Key *</Label>
                              <div className="relative">
                                 <Input
                                    type={showApiKey ? "text" : "password"}
                                    value={brevoApiKey}
                                    onChange={(e) => setBrevoApiKey(e.target.value)}
                                    placeholder="xkeysib-xxxxxxxxxxxx"
                                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px] pr-10 font-mono text-[13px]"
                                 />
                                 <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 w-[44px] justify-center text-white/40 hover:text-white transition-colors"
                                    onClick={() => setShowApiKey(!showApiKey)}
                                 >
                                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                 </button>
                              </div>
                              <p className="text-[12px] text-muted-foreground mt-2">
                                 Obtenha em <a href="https://app.brevo.com/settings/keys/api" target="_blank" rel="noopener" className="text-primary hover:underline font-medium">app.brevo.com/settings/keys/api <ExternalLink className="inline h-3 w-3" /></a>
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
               </motion.div>

               {/* Sender Settings & Tester */}
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid md:grid-cols-2 gap-6">
                  {/* Sender Config */}
                  <div className="glass-card border border-white/10 rounded-[16px] overflow-hidden flex flex-col h-full">
                     <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-[18px] font-semibold tracking-tight text-white">Dados do Remetente</h2>
                        <p className="text-[12px] text-muted-foreground">O que o cliente verá no inbox</p>
                     </div>
                     <div className="p-6 space-y-6 flex-1">
                        <div className="space-y-2">
                           <Label className="text-white/80 font-medium text-[13px]">Email do Remetente *</Label>
                           <Input
                              type="email"
                              value={fromEmail}
                              onChange={(e) => setFromEmail(e.target.value)}
                              placeholder="nao-responda@seudominio.com"
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                           />
                           <p className="text-[11px] text-muted-foreground">
                              {provider === "brevo" ? "Deve ser um domínio verificado no Brevo" : "Recomendado usar seu próprio domínio"}
                           </p>
                        </div>
                        <div className="space-y-2">
                           <Label className="text-white/80 font-medium text-[13px]">Nome do Remetente *</Label>
                           <Input
                              value={fromName}
                              onChange={(e) => setFromName(e.target.value)}
                              placeholder="Flow Members Admin"
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Mail Tester */}
                  <div className="glass-card border border-white/10 rounded-[16px] overflow-hidden flex flex-col h-full">
                     <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <h2 className="text-[18px] font-semibold tracking-tight text-white">Testar Conexão</h2>
                        <p className="text-[12px] text-muted-foreground">Verifique a entregabilidade agor</p>
                     </div>
                     <div className="p-6 flex flex-col justify-center flex-1">
                        <div className="space-y-4">
                           <div className="space-y-2">
                              <Label className="text-white/80 font-medium text-[13px]">Email Recipiente do Teste</Label>
                              <Input
                                 type="email"
                                 value={testEmail}
                                 onChange={(e) => setTestEmail(e.target.value)}
                                 placeholder="seu.email@exemplo.com"
                                 className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                              />
                           </div>
                           <Button
                              onClick={handleTest}
                              disabled={isTesting || !testEmail || (provider === "brevo" && !brevoApiKey) || (provider === "smtp" && !smtpHost)}
                              className="w-full h-[44px] bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-[10px] transition-all"
                           >
                              {isTesting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                              Disparar Teste
                           </Button>
                           <p className="text-[11px] text-center text-muted-foreground mt-2">
                              Um email de teste será enviado da conta do remetente para verificar a validação SPF/DKIM do servidor.
                           </p>
                        </div>
                     </div>
                  </div>
               </motion.div>

               {/* Automatic Notifications Setup */}
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <h2 className="text-[18px] font-semibold tracking-tight text-white">E-mails Automáticos</h2>
                     <p className="text-[12px] text-muted-foreground">Habilite os fluxos que deverão disparar notificação</p>
                  </div>
                  <div className="p-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        {notificationTypes.map((type) => {
                           const Icon = type.icon;
                           return (
                              <div
                                 key={type.id}
                                 className="flex items-center justify-between p-[16px] rounded-[12px] bg-black/20 border border-white/5 hover:bg-white/5 transition-all"
                              >
                                 <div className="flex items-center gap-[16px]">
                                    <div className="p-3 rounded-[10px] bg-primary/10 border border-primary/20">
                                       <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                       <p className="font-semibold text-white text-[14px]">{type.title}</p>
                                       <p className="text-[12px] text-white/50">{type.description}</p>
                                    </div>
                                 </div>
                                 <Switch
                                    checked={notificationToggles[type.id] ?? false}
                                    onCheckedChange={(checked) => setNotificationToggles(prev => ({ ...prev, [type.id]: checked }))}
                                 />
                              </div>
                           );
                        })}
                     </div>
                  </div>
               </motion.div>
            </TabsContent>

            {/* Templates Tab */}
            <TabsContent value="templates" className="space-y-6">
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <h2 className="text-[18px] font-semibold tracking-tight text-white">Configuração de Layouts</h2>
                     <p className="text-[12px] text-muted-foreground">Redija e visualize o conteúdo transacional</p>
                  </div>

                  <div className="p-6 border-b border-white/5">
                     <Tabs value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <TabsList className="bg-transparent gap-2 h-auto flex flex-wrap justify-start border-none">
                           {notificationTypes.map((type) => {
                              const Icon = type.icon;
                              return (
                                 <TabsTrigger 
                                    key={type.id} 
                                    value={type.id} 
                                    className="gap-2 px-4 py-2 text-[12px] font-medium tracking-wide border border-white/10 bg-black/20 rounded-[8px] data-[state=active]:bg-primary/20 data-[state=active]:text-primary data-[state=active]:border-primary/30"
                                 >
                                    <Icon className="h-3.5 w-3.5" />
                                    {type.title}
                                 </TabsTrigger>
                              );
                           })}
                        </TabsList>
                     </Tabs>
                  </div>

                  <div className="p-6 grid lg:grid-cols-2 gap-8">
                     {/* Editor */}
                     <div className="space-y-5">
                        <div className="space-y-2">
                           <Label className="text-white/80 font-medium text-[13px]">Assunto do Email</Label>
                           <Input
                              value={currentTemplate.subject}
                              onChange={(e) => updateTemplate("subject", e.target.value)}
                              placeholder="Assunto do email..."
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                           />
                        </div>

                        <div className="space-y-2">
                           <Label className="text-white/80 font-medium text-[13px]">Saudação Inicial</Label>
                           <Input
                              value={currentTemplate.greeting}
                              onChange={(e) => updateTemplate("greeting", e.target.value)}
                              placeholder="Olá {{nome}},"
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                           />
                        </div>

                        <div className="space-y-2">
                           <Label className="text-white/80 font-medium text-[13px]">Corpo da Mensagem (Suporta texto e variáveis)</Label>
                           <Textarea
                              value={currentTemplate.message}
                              onChange={(e) => updateTemplate("message", e.target.value)}
                              placeholder="Conteúdo do email..."
                              rows={8}
                              className="bg-black/20 border-white/10 text-white placeholder:text-white/20 rounded-[10px] resize-none"
                           />
                        </div>

                        <div className="flex gap-3 pt-2">
                           <Button onClick={handleSave} disabled={isUpdating} className="gradient-primary shadow-glow h-[44px] px-6 rounded-[10px] font-medium flex-1">
                              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                              Salvar Alterações
                           </Button>
                           <Button variant="outline" onClick={resetTemplate} className="h-[44px] glass-card border-white/10 hover:bg-white/5 rounded-[10px] px-4 shrink-0 text-white/60">
                              <RotateCcw className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>

                     {/* Visual Preview */}
                     <div className="space-y-3">
                        <Label className="text-white/80 font-medium text-[13px] inline-flex mb-1">Visualização do Cliente</Label>
                        <div className="rounded-[16px] overflow-hidden border border-white/10 bg-white shadow-2xl flex flex-col h-[480px]">
                           {/* Browser Fake Header */}
                           <div className="h-8 bg-zinc-100 border-b border-zinc-200 flex items-center px-4 gap-1.5 shrink-0">
                              <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                              <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                           </div>
                           
                           {/* Email Content Frame */}
                           <div className="flex-1 overflow-y-auto bg-zinc-50 relative">
                              <div className="max-w-[400px] mx-auto py-8 px-4">
                                 <div className="bg-white rounded-xl shadow-sm border border-zinc-200/60 overflow-hidden">
                                    {/* Email Header Component */}
                                    <div className="bg-zinc-900 py-6 px-6 text-center text-white border-b border-zinc-800">
                                       <div className="w-10 h-10 mx-auto rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-3">
                                          {fromName ? <span className="font-bold">{fromName.substring(0, 1)}</span> : <Mail className="w-4 h-4" />}
                                       </div>
                                       <h2 className="text-lg font-bold tracking-tight">
                                          {getPreview(currentTemplate.subject).replace(/🛒|✅|📦|🎉|🎓|📚/g, '')}
                                       </h2>
                                    </div>
                                    
                                    {/* Email Body */}
                                    <div className="p-8 space-y-6">
                                       <p className="font-semibold text-zinc-800 text-[15px]">{getPreview(currentTemplate.greeting)}</p>
                                       <div className="text-zinc-600 text-[14px] leading-relaxed whitespace-pre-wrap">
                                          {getPreview(currentTemplate.message)}
                                       </div>

                                       <div className="pt-6 mt-6 border-t border-zinc-100 flex justify-center">
                                          <div className="px-6 py-2.5 bg-zinc-900 text-white rounded-lg text-sm font-medium shadow-sm w-full text-center">
                                             Prosseguir na Plataforma
                                          </div>
                                       </div>
                                    </div>
                                 </div>
                                 <p className="text-center text-[11px] text-zinc-400 mt-6 px-8">Enviado por {fromName || 'Nossa Plataforma'}</p>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </motion.div>
            </TabsContent>

            {/* Variables Tab */}
            <TabsContent value="variables" className="space-y-6">
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <h2 className="text-[18px] font-semibold tracking-tight text-white">Guia de Variáveis de Contexto</h2>
                     <p className="text-[12px] text-muted-foreground">Shortcodes processados automaticamente no momento do envio</p>
                  </div>
                  <div className="p-6">
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-[12px]">
                        {availableVariables.map((v) => (
                           <button
                              key={v.name}
                              onClick={() => copyVariable(v.name)}
                              className="group flex flex-col items-start justify-center gap-1.5 p-4 bg-black/20 border border-white/5 hover:border-white/20 hover:bg-white/5 rounded-[12px] transition-all relative overflow-hidden"
                           >
                              <div className="flex items-center justify-between w-full">
                                  <code className="text-[13px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-[6px] tracking-tight">{v.name}</code>
                                  {copiedVar === v.name ? (
                                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-white/40 shrink-0 transition-opacity" />
                                  )}
                              </div>
                              <p className="text-[12px] text-white/50">{v.desc}</p>
                           </button>
                        ))}
                     </div>
                  </div>
               </motion.div>
            </TabsContent>

            {/* Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
               <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-white/10 rounded-[16px] overflow-hidden">
                  <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                     <h2 className="text-[18px] font-semibold tracking-tight text-white">Log de Transações</h2>
                     <p className="text-[12px] text-muted-foreground">Exibindo os últimos 50 eventos processados pela engine de email.</p>
                  </div>
                  
                  <div className="p-6">
                     {isLoadingLogs ? (
                        <div className="flex items-center justify-center py-20">
                           <Loader2 className="h-6 w-6 animate-spin text-white/20" />
                        </div>
                     ) : logs && logs.length > 0 ? (
                        <ScrollArea className="h-[500px]">
                           <div className="rounded-[12px] border border-white/5 overflow-hidden">
                              <Table>
                                 <TableHeader className="bg-black/40 hover:bg-black/40 border-b border-white/5">
                                    <TableRow className="border-none">
                                       <TableHead className="text-[11px] uppercase tracking-widest text-white/40 font-bold h-10">Status</TableHead>
                                       <TableHead className="text-[11px] uppercase tracking-widest text-white/40 font-bold h-10">Destinatário</TableHead>
                                       <TableHead className="text-[11px] uppercase tracking-widest text-white/40 font-bold h-10">Assunto</TableHead>
                                       <TableHead className="text-[11px] uppercase tracking-widest text-white/40 font-bold h-10">Gatilho (Notificação)</TableHead>
                                       <TableHead className="text-[11px] uppercase tracking-widest text-white/40 font-bold h-10 text-right">Data Exata</TableHead>
                                    </TableRow>
                                 </TableHeader>
                                 <TableBody>
                                    {logs.map((log) => (
                                       <TableRow key={log.id} className="border-b border-white/5 bg-black/20 hover:bg-white/5 transition-colors">
                                          <TableCell className="py-3">
                                             {log.status === "sent" ? (
                                                <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/20 text-emerald-400 font-bold tracking-wider text-[10px] uppercase shadow-[0_0_10px_rgba(16,185,129,0.1)] gap-1">
                                                   <CheckCircle2 className="h-3 w-3" />
                                                   Enviado
                                                </Badge>
                                             ) : (
                                                <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 font-bold tracking-wider text-[10px] uppercase shadow-[0_0_10px_rgba(239,68,68,0.1)] gap-1">
                                                   <XCircle className="h-3 w-3" />
                                                   Falhou
                                                </Badge>
                                             )}
                                          </TableCell>
                                          <TableCell className="py-3">
                                             <div>
                                                <p className="font-semibold text-white text-[13px] truncate">{log.recipient_name || "-"}</p>
                                                <p className="text-[11px] text-white/40 font-mono truncate">{log.recipient_email}</p>
                                             </div>
                                          </TableCell>
                                          <TableCell className="max-w-[300px] truncate py-3 text-[13px] text-white/80">
                                             {log.subject.replace(/🛒|✅|📦|🎉|🎓|📚/g, '')}
                                          </TableCell>
                                          <TableCell className="py-3">
                                             <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/60">
                                                {log.email_type}
                                             </Badge>
                                          </TableCell>
                                          <TableCell className="text-[12px] text-white/40 text-right py-3 tabular-nums">
                                             {log.created_at && format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                          </TableCell>
                                       </TableRow>
                                    ))}
                                 </TableBody>
                              </Table>
                           </div>
                        </ScrollArea>
                     ) : (
                        <div className="text-center py-20 bg-black/20 rounded-[12px] border border-white/5 border-dashed">
                           <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                              <History className="h-6 w-6 text-white/20" />
                           </div>
                           <p className="text-[15px] font-semibold text-white tracking-tight">Nenhum registro encontrado</p>
                           <p className="text-[13px] text-white/40 mt-1 max-w-[300px] mx-auto">
                              Logo que os primeiros e-mails forem transacionados, eles aparecerão aqui.
                           </p>
                        </div>
                     )}
                  </div>
               </motion.div>
            </TabsContent>
         </Tabs>
      </div>
   );
}
