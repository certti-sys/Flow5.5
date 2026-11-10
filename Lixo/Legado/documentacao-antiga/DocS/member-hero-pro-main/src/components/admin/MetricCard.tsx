import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel: string;
  icon: LucideIcon;
}

export function MetricCard({ title, value, change, changeLabel, icon: Icon }: MetricCardProps) {
  const isPositive = change >= 0;

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {isPositive ? "+" : ""}{change}%
            </span>
            <span className="text-sm text-muted-foreground">{changeLabel}</span>
          </div>
        </div>
        <div className="p-3 rounded-xl bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
