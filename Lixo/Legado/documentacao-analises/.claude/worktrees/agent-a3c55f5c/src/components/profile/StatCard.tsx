import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  gradient?: string;
  className?: string;
}

export const StatCard = ({
  icon,
  label,
  value,
  gradient = "from-primary to-purple-500",
  className,
}: StatCardProps) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1000;
    const steps = 30;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(timer);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <div
      className={cn(
        "glass-card border-white/10 p-2 sm:p-3 md:p-4 rounded-xl group hover:scale-105 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 animate-fade-in",
        className
      )}
    >
      <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
        <div
          className={cn(
            "p-1.5 sm:p-2 md:p-2.5 rounded-lg bg-gradient-to-br shadow-lg flex-shrink-0",
            gradient
          )}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-lg sm:text-xl md:text-3xl font-bold text-gradient tabular-nums">
            {displayValue}
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground font-medium mt-0.5 line-clamp-2">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
};
