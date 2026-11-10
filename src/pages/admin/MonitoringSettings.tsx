import { useState, useEffect } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Activity, Settings2, ExternalLink, AlertTriangle, ShieldCheck,
  Terminal, Database, Trash2, RefreshCw, Bug, Info, CheckCircle2,
  XCircle, HelpCircle, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdminHeader } from "@/components/admin/AdminHeader";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemAnim = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

/**
 * MonitoringSettings Component
 * Admin bridge for Sentry integration and internal system logging.
 */

interface SystemLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details: any;
  created_at: string;
}

export default function MonitoringSettings() {
  const { settings, updateSettings, isSaving } = usePlatformSettings();
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showDsn, setShowDsn] = useState(false);

  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (settings?.monitoring_internal_logs_active) {
      fetchLogs();
    }
  }, [settings?.monitoring_internal_logs_active]);

  const handleUpdateSetting = async (key: string, value: any) => {
    try {
      await updateSettings({ [key]: value });
    } catch (err) {
      toast.error("Erro ao atualizar configuração");
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error': return <Badge variant="destructive" className="gap-1"><XCircle className="w-3 h-3" /> Erro</Badge>;
      case 'warn': return <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1"><AlertTriangle className="w-3 h-3" /> Aviso</Badge>;
      default: return <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1"><Info className="w-3 h-3" /> Info</Badge>;
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 pb-20">
      <AdminHeader
        title="Monitoramento e Resiliência"
        description="Gerencie a saúde técnica da sua plataforma e rastreie erros em tempo real."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* SENTRY CONFIGURATION */}
        <motion.div variants={itemAnim} className="glass-card border-white/10 rounded-[20px] border-white/5 overflow-hidden shadow-2xl bg-white/[0.01]">
          <Card className="border-0 bg-transparent p-0">
            <CardHeader className="bg-transparent p-0 pb-0">
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-[12px] bg-primary/10 border border-primary/20">
                    <Bug className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-[18px] font-bold text-white">Rastreamento de Erros (Sentry)</CardTitle>
                    <CardDescription className="text-[12px] text-muted-foreground">Capture bugs antes que seus alunos percebam.</CardDescription>
                  </div>
                </div>
                <Switch checked={settings?.monitoring_sentry_active} onCheckedChange={(checked) => handleUpdateSetting('monitoring_sentry_active', checked)} />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 p-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  Sentry DSN (Chave do Projeto)
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setShowDsn(!showDsn)}>
                    <HelpCircle className="h-3 w-3" />
                  </Button>
                </Label>
                <div className="flex gap-2">
                  <Input type={showDsn ? "text" : "password"} placeholder="https://xxx@xxx.ingest.sentry.io/xxx" value={settings?.monitoring_sentry_dsn || ""} onChange={(e) => updateSettings({ monitoring_sentry_dsn: e.target.value })} className="font-mono bg-black/20 border-white/10 text-white rounded-[12px]" />
                </div>
              </div>

              {/* SENTRY TUTORIAL GUIDE */}
              <div className="bg-black/20 rounded-lg p-4 text-sm space-y-3 border border-white/5">
                <h4 className="font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-500" />
                  Como configurar gratuitamente:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-white/60 text-sm">
                  <li>Crie uma conta gratuita em <a href="https://sentry.io" target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">sentry.io <ExternalLink className="w-3 h-3" /></a></li>
                  <li>Crie um novo projeto <strong>"React"</strong>.</li>
                  <li>Vá em <strong>Settings &gt; Projects &gt; [Nome] &gt; Client Keys (DSN)</strong>.</li>
                  <li>Copie a URL do DSN e cole no campo acima.</li>
                </ol>
                <p className="text-[10px] text-muted-foreground italic">* O Sentry captura falhas de carregamento de vídeo, erros de script e lentidão na plataforma.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* INTERNAL LOGS CONFIGURATION */}
        <motion.div variants={itemAnim} className="glass-card border-white/10 rounded-[20px] border-white/5 overflow-hidden shadow-2xl bg-white/[0.01]">
          <Card className="border-0 bg-transparent p-0">
            <CardHeader className="bg-transparent p-0 pb-0">
              <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-[12px] bg-amber-500/10 border border-amber-500/20">
                    <Database className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <CardTitle className="text-[18px] font-bold text-white">Logs do Sistema (Supabase)</CardTitle>
                    <CardDescription className="text-[12px] text-muted-foreground">Persistência local para auditoria técnica.</CardDescription>
                  </div>
                </div>
                <Switch checked={settings?.monitoring_internal_logs_active} onCheckedChange={(checked) => handleUpdateSetting('monitoring_internal_logs_active', checked)} />
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4 p-6">
              <div className="flex items-start gap-3 p-3 bg-black/20 border border-white/5 rounded-lg text-white/80 text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Atenção com Banco de Dados</p>
                  <p className="text-xs text-white/60 opacity-80">Logs internos ocupam espaço no Supabase. Recomendado ativar apenas para debug. O sistema limpa logs automaticamente após <strong>7 dias</strong>.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 border border-white/5 rounded-lg text-center bg-white/5">
                  <p className="text-2xl font-bold text-white">{logs.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Logs Ativos</p>
                </div>
                <div className="p-3 border border-white/5 rounded-lg text-center bg-white/5">
                  <p className="text-2xl font-bold text-white flex items-center justify-center gap-1">7 <span className="text-xs font-normal">dias</span></p>
                  <p className="text-[10px] text-muted-foreground uppercase">Retenção</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* LOGS VIEWER */}
      <AnimatePresence>
        {settings?.monitoring_internal_logs_active && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
            <div className="glass-card border-white/10 rounded-[20px] overflow-hidden shadow-2xl bg-white/[0.01]">
              <Card className="border-0 bg-transparent p-0">
                <CardHeader className="bg-transparent p-0 pb-0">
                  <div className="flex flex-row items-center justify-between space-y-0 p-6 border-b border-white/5 bg-white/[0.02]">
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Terminal className="w-5 h-5" /> Console de Sistema
                      </CardTitle>
                      <CardDescription className="text-[12px] text-muted-foreground">Últimos 50 eventos registrados.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loadingLogs} className="gap-2 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white font-bold">
                      <RefreshCw className={cn("w-4 h-4", loadingLogs && "animate-spin")} /> Atualizar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px] w-full rounded-md bg-black/[0.02]">
                    <Table className="w-full">
                      <TableHeader className="bg-white/5 sticky top-0 z-10">
                        <TableRow className="border-none">
                          <TableHead className="w-[180px] px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Data/Hora</TableHead>
                          <TableHead className="w-[100px] px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Nível</TableHead>
                          <TableHead className="px-6 py-3 text-left text-[11px] font-bold uppercase tracking-widest text-white/40">Evento</TableHead>
                          <TableHead className="px-6 py-3 text-right text-[11px] font-bold uppercase tracking-widest text-white/40">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-white/5">
                        {logs.length === 0 ? (
                          <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic px-6 py-4">Nenhum log registrado ainda.</TableCell></TableRow>
                        ) : (
                          logs.map((log) => (
                            <TableRow key={log.id} className="text-xs bg-black/20 hover:bg-white/10 transition-colors">
                              <TableCell className="px-6 py-3 font-mono text-muted-foreground">{format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}</TableCell>
                              <TableCell className="px-6 py-3">{getLevelBadge(log.level)}</TableCell>
                              <TableCell className="px-6 py-3 max-w-[400px] truncate font-medium text-white/90">{log.message}</TableCell>
                              <TableCell className="px-6 py-3 text-right"><Button variant="ghost" size="icon" className="h-6 w-6" title="Ver detalhes"><Activity className="h-3 w-3" /></Button></TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}