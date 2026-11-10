import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakIndicatorProps {
  currentStreak: number;
  bestStreak: number;
  className?: string;
}

export const StreakIndicator = ({ currentStreak, bestStreak, className = "" }: StreakIndicatorProps) => {
  const isActive = currentStreak > 0;

  return (
    <div className={cn("glass-card border-white/10 rounded-xl p-2 sm:p-3 md:p-4 min-h-[100px] sm:min-h-[110px] md:min-h-[120px] flex flex-col justify-between", className)}>
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        <div className={cn(
          "p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0",
          isActive 
            ? "bg-gradient-to-br from-orange-500 to-red-500 animate-pulse" 
            : "bg-muted/50"
        )}>
          <Flame className={cn("w-4 h-4 sm:w-5 sm:h-5 text-white", !isActive && "opacity-50")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground">Sequência Atual</p>
          <p className="text-base sm:text-lg md:text-xl font-bold text-gradient tabular-nums">
            {currentStreak} {currentStreak === 1 ? "dia" : "dias"}
          </p>
        </div>
      </div>
      
      <div className="pt-2 sm:pt-3 border-t border-white/10">
        <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">Melhor Sequência</p>
        <p className="text-sm sm:text-base font-semibold text-foreground tabular-nums">
          🏆 {bestStreak} {bestStreak === 1 ? "dia" : "dias"}
        </p>
      </div>
    </div>
  );
};