import { Trophy, Zap, Flame, TrendingUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ProgressOverviewProps {
  userStats: any;
  xpProgress: {
    current: number;
    required: number;
    percentage: number;
  };
}

export const ProgressOverview = ({ userStats, xpProgress }: ProgressOverviewProps) => {
  if (!userStats) {
    return (
      <div className="rounded-xl border border-white/[0.08] bg-card p-6">
        <div className="text-center text-muted-foreground py-4">
          Complete sua primeira aula para começar sua jornada!
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-primary" />
        Seu Progresso
      </h2>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{userStats.level}</p>
            <p className="text-xs text-muted-foreground">Nível</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{userStats.total_xp}</p>
            <p className="text-xs text-muted-foreground">XP Total</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{userStats.current_streak}</p>
            <p className="text-xs text-muted-foreground">Sequência</p>
          </div>
        </div>
      </div>

      {/* XP Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso para Nível {userStats.level + 1}</span>
          <span className="font-medium">{xpProgress.current} / {xpProgress.required} XP</span>
        </div>
        <Progress value={xpProgress.percentage} className="h-3" />
        <p className="text-xs text-muted-foreground text-center">
          Faltam {xpProgress.required - xpProgress.current} XP para o próximo nível
        </p>
      </div>
    </div>
  );
};
