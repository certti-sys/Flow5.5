import { useState, useEffect } from "react";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Settings2, 
  ExternalLink, 
  AlertTriangle, 
  ShieldCheck, 
  Terminal, 
  Database, 
  Trash2, 
  RefreshCw,
  Bug,
  Info,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    if (settings.monitoring_internal_logs_active) {
      fetchLogs();
    }
  }, [settings.monitoring_internal_logs_active]);

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
      case 'warn': return <Badge variant="warning" className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><AlertTriangle className="w-3 h-3" /> Aviso</Badge>;
      default: return <Badge variant="secondary" className="gap-1"><Info className="w-3 h-3" /> Info</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Monitoramento e Resiliência</h1>
        <p className="text-muted-foreground">
          Gerencie a saúde técnica da sua plataforma e rastreie erros em tempo real.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SENTRY CONFIGURATION */}
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="bg-primary/5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Bug className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Rastreamento de Erros (Sentry)</CardTitle>
                  <CardDescription>Capture bugs antes que seus alunos percebam.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={settings.monitoring_sentry_active}
                onCheckedChange={(checked) => handleUpdateSetting('monitoring_sentry_active', checked)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                Sentry DSN (Chave do Projeto)
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-4 w-4" 
                  onClick={() => setShowDsn(!showDsn)}
                >
                  <HelpCircle className="h-3 w-3" />
                </Button>
              </Label>
              <div className="flex gap-2">
                <Input 
                  type={showDsn ? "text" : "password"}
                  placeholder="https://xxx@xxx.ingest.sentry.io/xxx"
                  value={settings.monitoring_sentry_dsn || ""}
                  onChange={(e) => updateSettings({ monitoring_sentry_dsn: e.target.value })}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {/* SENTRY TUTORIAL GUIDE */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-green-500" /> 
                Como configurar gratuitamente:
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Crie uma conta gratuita em <a href="https://sentry.io" target="_blank" className="text-primary hover:underline inline-flex items-center gap-1">sentry.io <ExternalLink className="w-3 h-3" /></a></li>
                <li>Crie um novo projeto **"React"**.</li>
                <li>Vá em **Settings &gt; Projects &gt; [Nome] &gt; Client Keys (DSN)**.</li>
                <li>Copie a URL do DSN e cole no campo acima.</li>
              </ol>
              <p className="text-[10px] text-muted-foreground italic">
                * O Sentry captura falhas de carregamento de vídeo, erros de script e lentidão na plataforma.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* INTERNAL LOGS CONFIGURATION */}
        <Card className="border-amber-200/50 shadow-lg">
          <CardHeader className="bg-amber-50/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Database className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Logs do Sistema (Supabase)</CardTitle>
                  <CardDescription>Persistência local para auditoria técnica.</CardDescription>
                </div>
              </div>
              <Switch 
                checked={settings.monitoring_internal_logs_active}
                onCheckedChange={(checked) => handleUpdateSetting('monitoring_internal_logs_active', checked)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Atenção com Banco de Dados</p>
                <p className="text-xs opacity-80">
                  Logs internos ocupam espaço no Supabase. Recomendado ativar apenas para debug.
                  O sistema limpa logs automaticamente após **7 dias**.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold">{logs.length}</p>
                <p className="text-[10px] text-muted-foreground uppercase">Logs Ativos</p>
              </div>
              <div className="p-3 border rounded-lg text-center">
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  7 <span className="text-xs font-normal">dias</span>
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Retenção</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LOGS VIEWER */}
      <AnimatePresence>
        {settings.monitoring_internal_logs_active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Card className="shadow-xl">
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Terminal className="w-5 h-5" /> Console de Sistema
                  </CardTitle>
                  <CardDescription>Últimos 50 eventos registrados.</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchLogs} 
                  disabled={loadingLogs}
                  className="gap-2"
                >
                  <RefreshCw className={cn("w-4 h-4", loadingLogs && "animate-spin")} />
                  Atualizar
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border bg-black/[0.02]">
                  <Table>
                    <TableHeader className="bg-muted/50 sticky top-0 z-10">
                      <TableRow>
                        <TableHead className="w-[180px]">Data/Hora</TableHead>
                        <TableHead className="w-[100px]">Nível</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-32 text-center text-muted-foreground italic">
                            Nenhum log registrado ainda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        logs.map((log) => (
                          <TableRow key={log.id} className="text-xs">
                            <TableCell className="font-mono text-muted-foreground">
                              {format(new Date(log.created_at), "dd/MM HH:mm:ss", { locale: ptBR })}
                            </TableCell>
                            <TableCell>{getLevelBadge(log.level)}</TableCell>
                            <TableCell className="max-w-[400px] truncate font-medium">
                              {log.message}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-6 w-6" title="Ver detalhes">
                                <Activity className="h-3 w-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
