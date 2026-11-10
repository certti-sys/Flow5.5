import { Progress } from "@/components/ui/progress";
import { Trophy } from "lucide-react";

interface LevelBadgeProps {
  level: number;
  xpProgress: {
    current: number;
    required: number;
    percentage: number;
  };
}

export const LevelBadge = ({ level, xpProgress }: LevelBadgeProps) => {

  return (
    <div className="glass-card border-white/10 rounded-xl p-2 sm:p-3 md:p-4 min-h-[100px] sm:min-h-[110px] md:min-h-[120px] flex flex-col justify-between">
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3">
        <div className="bg-gradient-to-br from-primary to-purple-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-base sm:text-lg md:text-xl font-bold text-gradient">Nível {level}</span>
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {xpProgress.current} / {xpProgress.required} XP
          </p>
        </div>
      </div>
      <Progress value={xpProgress.percentage} className="h-1.5 sm:h-2" />
    </div>
  );
};