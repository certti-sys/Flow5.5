import { Achievement, UserAchievement } from "@/hooks/useGamification";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface AchievementsGridProps {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  maxItems?: number;
}

export const AchievementsGrid = ({
  achievements,
  userAchievements,
  maxItems,
}: AchievementsGridProps) => {
  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));

  // Sort achievements: unlocked first, then locked
  const sortedAchievements = [...achievements].sort((a, b) => {
    const aUnlocked = unlockedIds.has(a.id);
    const bUnlocked = unlockedIds.has(b.id);
    if (aUnlocked && !bUnlocked) return -1;
    if (!aUnlocked && bUnlocked) return 1;
    return 0;
  });

  // Apply maxItems limit if specified
  const displayedAchievements = maxItems
    ? sortedAchievements.slice(0, maxItems)
    : sortedAchievements;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      <TooltipProvider>
        {displayedAchievements.map((achievement) => {
          const isUnlocked = unlockedIds.has(achievement.id);
          const userAchievement = userAchievements.find(
            ua => ua.achievement_id === achievement.id
          );

          return (
            <Tooltip key={achievement.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "glass-card border-white/10 p-3 rounded-xl text-center transition-all duration-300",
                    isUnlocked
                      ? "hover:scale-105 hover:shadow-xl hover:shadow-primary/20 cursor-pointer"
                      : "opacity-50 grayscale"
                  )}
                >
                  <div className="text-3xl mb-2">{achievement.icon}</div>
                  <p className={cn(
                    "text-xs font-semibold line-clamp-2",
                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {achievement.title}
                  </p>
                  {isUnlocked && (
                    <div className="mt-1.5 text-xs text-primary font-medium">
                      +{achievement.xp_reward} XP
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{achievement.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {achievement.description}
                  </p>
                  {isUnlocked && userAchievement && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Desbloqueada em{" "}
                      {new Date(userAchievement.unlocked_at).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                  {!isUnlocked && (
                    <p className="text-xs text-primary mt-2">
                      Recompensa: {achievement.xp_reward} XP
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};