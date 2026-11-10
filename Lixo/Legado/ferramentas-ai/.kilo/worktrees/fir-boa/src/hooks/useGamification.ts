import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  criteria_type: string;
  criteria_value: number;
  xp_reward: number;
  order_index: number;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: Achievement;
}

export interface UserStats {
  id: string;
  user_id: string;
  total_xp: number;
  level: number;
  current_streak: number;
  best_streak: number;
  last_activity_date: string | null;
  lessons_today: number;
}

export const useGamification = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch user stats
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as UserStats | null;
    },
    enabled: !!user,
  });

  // Fetch all achievements
  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["achievements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("achievements")
        .select("*")
        .order("order_index");

      if (error) throw error;
      return data as Achievement[];
    },
  });

  // Fetch user's unlocked achievements
  const { data: userAchievements, isLoading: userAchievementsLoading } = useQuery({
    queryKey: ["userAchievements", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_achievements")
        .select(`
          id,
          achievement_id,
          unlocked_at,
          achievement:achievements (*)
        `)
        .eq("user_id", user.id)
        .order("unlocked_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UserAchievement[];
    },
    enabled: !!user,
  });

  // Check achievements mutation
  const checkAchievements = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-achievements');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["userStats", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userAchievements", user?.id] });
    },
  });

  // Calculate XP progress to next level
  const getXpProgress = () => {
    if (!userStats) return { current: 0, required: 100, percentage: 0 };

    const currentLevelXp = (userStats.level - 1) * 100;
    const nextLevelXp = userStats.level * 100;
    const xpInCurrentLevel = userStats.total_xp - currentLevelXp;
    const xpNeededForLevel = 100;

    return {
      current: xpInCurrentLevel,
      required: xpNeededForLevel,
      percentage: Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100),
    };
  };

  // Check if an achievement is unlocked
  const isAchievementUnlocked = (achievementId: string) => {
    return userAchievements?.some(ua => ua.achievement_id === achievementId) || false;
  };

  // Auto-check achievements for users with completed lessons but no stats yet
  useEffect(() => {
    // If user is authenticated, has no stats, and check is not already running
    if (user && userStats === null && !statsLoading && !checkAchievements.isPending) {
      checkAchievements.mutate();
    }
  }, [user, userStats, statsLoading, checkAchievements.isPending]);

  return {
    userStats,
    achievements,
    userAchievements,
    isLoading: statsLoading || achievementsLoading || userAchievementsLoading,
    checkAchievements,
    getXpProgress,
    isAchievementUnlocked,
  };
};