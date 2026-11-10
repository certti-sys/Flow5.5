import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useUserProgress = () => {
  const { user } = useAuth();

  // Fetch all user progress
  const { data: userProgress = [], isLoading } = useQuery({
    queryKey: ["userProgress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Helper function to check if a lesson is completed
  const isLessonCompleted = (lessonId: string) => {
    return userProgress.some(
      (p) => p.lesson_id === lessonId && p.completed
    );
  };

  // Helper function to get progress for a course from its lesson ids
  const getCourseProgress = (lessonIds: string[]) => {
    const completedLessons = userProgress.filter((p) => {
      return p.completed && p.lesson_id && lessonIds.includes(p.lesson_id);
    }).length;

    const totalLessons = lessonIds.length;

    const progress = totalLessons > 0 
      ? Math.round((completedLessons / totalLessons) * 100) 
      : 0;

    return {
      completedLessons,
      totalLessons,
      progress,
    };
  };

  return {
    userProgress,
    isLoading,
    isLessonCompleted,
    getCourseProgress,
  };
};
