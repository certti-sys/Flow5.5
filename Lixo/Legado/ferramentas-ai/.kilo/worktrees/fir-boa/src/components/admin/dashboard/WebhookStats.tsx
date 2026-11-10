import { Card } from "@/components/ui/card";
import { Webhook, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WebhookStatsProps {
  totalTransactions: number;
  successRate: number;
  lastWebhook: string | null;
  errorsCount: number;
}

export function WebhookStats({ totalTransactions, successRate, lastWebhook, errorsCount }: WebhookStatsProps) {
  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden bg-white/[0.01] h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            Connectivity
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Status de Webhooks & API</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-white transition-colors">
            <Webhook className="w-4 h-4 opacity-40 group-hover:text-primary transition-colors" />
            <span className="text-[11px] font-black uppercase tracking-widest">Requisições</span>
          </div>
          <span className="text-sm font-black text-white px-3 py-1 rounded-lg bg-black/40 border border-white/5">
            {totalTransactions}
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-white transition-colors">
            <CheckCircle className="w-4 h-4 text-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-500/60">Uptime Sucesso</span>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-lg border ${
            successRate >= 95 
              ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-glow-sm' 
              : 'text-amber-500 bg-amber-500/10 border-amber-500/20'
          }`}>
            {successRate}%
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 group hover:bg-white/[0.04] transition-all">
          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-white transition-colors">
            <XCircle className="w-4 h-4 text-rose-500 opacity-60 group-hover:opacity-100 transition-opacity" />
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-500/60">Anomalias</span>
          </div>
          <span className={`text-xs font-black px-3 py-1 rounded-lg border ${
            errorsCount === 0 
              ? 'text-white/20 bg-white/5 border-white/5' 
              : 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse'
          }`}>
            {errorsCount}
          </span>
        </div>

        <div className="pt-6 mt-2 border-t border-white/5">
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40 bg-black/40 p-4 rounded-2xl border border-white/5 group/last">
            <Clock className="w-4 h-4 text-primary group-hover/last:animate-spin-slow transition-all" />
            <span className="font-black uppercase tracking-widest text-[9px]">
              Last Event: {lastWebhook
                ? formatDistanceToNow(new Date(lastWebhook), { addSuffix: true, locale: ptBR })
                : 'Offline'
              }
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
