import { Card } from "@/components/ui/card";
import { Clock, UserPlus, BookOpen, Key, Ban, Trash2, ShieldCheck, Terminal } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  details: Record<string, any> | null;
  created_at: string;
}

interface ActivityTimelineProps {
  logs: AuditLog[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  'user_created': <UserPlus className="w-4 h-4" />,
  'course_assigned': <BookOpen className="w-4 h-4" />,
  'password_reset': <Key className="w-4 h-4" />,
  'user_suspended': <Ban className="w-4 h-4" />,
  'user_deleted': <Trash2 className="w-4 h-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  'user_created': 'Integração de Novo Usuário',
  'course_assigned': 'Concessão de Acesso Educacional',
  'password_reset': 'Reset de Credenciais',
  'user_suspended': 'Suspensão de Conta',
  'user_deleted': 'Exclusão de Registros',
};

export function ActivityTimeline({ logs }: ActivityTimelineProps) {
  const getActionLabel = (action: string, details: Record<string, any> | null) => {
    const baseLabel = ACTION_LABELS[action] || action;
    if (details?.email) return `${baseLabel} (${details.email})`;
    if (details?.user_email) return `${baseLabel} (${details.user_email})`;
    return baseLabel;
  };

  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden group bg-white/[0.01]">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            Audit Log: Atividade do Sistema
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Monitoramento de segurança em tempo real</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
          <Terminal className="w-3 h-3 text-muted-foreground/40" />
          <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Live Feed</span>
        </div>
      </div>

      {logs.length > 0 ? (
        <div className="space-y-0">
          {logs.map((log, index) => (
            <div
              key={log.id}
              className="flex items-start gap-6 relative py-5 group/log"
            >
              {index < logs.length - 1 && (
                <div className="absolute left-[20px] top-[48px] bottom-[-20px] w-[1px] bg-white/[0.03] group-hover/log:bg-primary/20 transition-all duration-500" />
              )}
              
              <div className="w-10 h-10 rounded-2xl bg-black/60 border border-white/5 flex items-center justify-center text-muted-foreground/40 shrink-0 relative z-10 group-hover/log:border-primary/30 group-hover/log:text-primary group-hover/log:shadow-glow-sm transition-all duration-300">
                {ACTION_ICONS[log.action] || <Clock className="w-4 h-4" />}
              </div>
              
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[13px] text-white font-bold group-hover/log:text-primary transition-colors truncate">
                    {getActionLabel(log.action, log.details)}
                    </p>
                    <span className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/30 bg-white/[0.02] border border-white/5 px-2 py-0.5 rounded-lg group-hover/log:text-white/60 transition-colors">
                    {log.resource_type}
                    </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground/40 uppercase font-black text-[9px] tracking-widest">
                  <Clock className="w-2.5 h-2.5 opacity-30" />
                  <span>
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: ptBR
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
          <ShieldCheck className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Nenhum evento crítico</p>
        </div>
      )}
    </Card>
  );
}
