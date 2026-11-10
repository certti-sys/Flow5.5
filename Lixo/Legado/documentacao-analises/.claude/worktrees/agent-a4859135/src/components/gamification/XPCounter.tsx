import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

interface XPCounterProps {
  totalXp: number;
  className?: string;
}

export const XPCounter = ({ totalXp, className = "" }: XPCounterProps) => {
  const [displayXp, setDisplayXp] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = totalXp / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= totalXp) {
        setDisplayXp(totalXp);
        clearInterval(timer);
      } else {
        setDisplayXp(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [totalXp]);

  return (
    <div className={`glass-card border-white/10 rounded-xl p-2 sm:p-3 md:p-4 min-h-[100px] sm:min-h-[110px] md:min-h-[120px] flex flex-col justify-center ${className}`}>
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 mb-1 sm:mb-2">
        <div className="bg-gradient-to-br from-primary to-purple-500 p-1.5 sm:p-2 rounded-lg flex-shrink-0">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-0.5">XP Total</p>
          <span className="text-lg sm:text-xl md:text-2xl font-bold text-gradient tabular-nums">
            {displayXp.toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};