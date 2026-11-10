import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, ArrowUp, Activity } from "lucide-react";

interface EngagementCardProps {
  activityRate: number;
  avgCompletion: number;
  activeStudents: number;
  totalStudents: number;
}

export function EngagementCard({ activityRate, avgCompletion, activeStudents, totalStudents }: EngagementCardProps) {
  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden bg-white/[0.01] h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            Engagement
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Performance de retenção</p>
        </div>
      </div>

      <div className="space-y-8 flex-1">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">Taxa de Atividade</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="text-[11px] font-black text-emerald-500">{activityRate}%</span>
              <ArrowUp className="w-3 h-3 text-emerald-500" />
            </div>
          </div>
          <div className="relative group/progress">
            <Progress value={activityRate} className="h-2 bg-white/5 border border-white/5" />
            <div className="absolute top-0 right-0 py-4 opacity-0 group-hover/progress:opacity-100 transition-opacity">
                <span className="text-[10px] text-primary font-black uppercase tracking-widest">Target: 80%</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Conclusão Média</span>
                <p className="text-xl font-black text-white tracking-tighter">{avgCompletion}%</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Frequência</span>
                <div className="flex items-baseline gap-1">
                    <p className="text-xl font-black text-white tracking-tighter">{activeStudents}</p>
                    <span className="text-[10px] text-muted-foreground/40 font-bold">/ {totalStudents}</span>
                </div>
            </div>
        </div>

        <div className="pt-4 border-t border-white/5">
             <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[2px] text-primary animate-pulse">
                <Activity className="w-3.5 h-3.5" />
                <span>Análise de Retenção Ativa</span>
             </div>
        </div>
      </div>
    </Card>
  );
}
