import { LucideIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AchievementBadgeProps {
  icon: LucideIcon;
  label: string;
  description: string;
  unlocked: boolean;
}

export const AchievementBadge = ({
  icon: Icon,
  label,
  description,
  unlocked,
}: AchievementBadgeProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "glass-card border-white/10 p-4 rounded-xl text-center transition-all duration-300 cursor-pointer",
              unlocked
                ? "hover:scale-105 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20"
                : "opacity-40 grayscale"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center",
                unlocked
                  ? "bg-gradient-to-br from-yellow-500 to-orange-500 shadow-lg shadow-yellow-500/50 animate-pulse"
                  : "bg-muted"
              )}
            >
              <Icon
                className={cn(
                  "w-6 h-6",
                  unlocked ? "text-white" : "text-muted-foreground"
                )}
              />
            </div>
            
            <p className={cn(
              "text-xs font-medium",
              unlocked ? "text-foreground" : "text-muted-foreground"
            )}>
              {label}
            </p>
          </div>
        </TooltipTrigger>
        <TooltipContent className="glass-card border-white/10">
          <p className="font-semibold">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-xs text-primary mt-1">
            {unlocked ? "✓ Desbloqueada" : "🔒 Bloqueada"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
