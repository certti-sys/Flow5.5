import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export { useSupabaseStudentProgress as useStudentProgress };

export interface LessonProgress {
  lessonId: string;
  courseId: string;
  moduleId: string;
  completed: boolean;
  watchedSeconds: number;
  completedAt?: string;
}

export function useSupabaseStudentProgress() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch lesson progress for current user
  const { data: progress = [], isLoading } = useQuery({
    queryKey: ['lesson-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await (supabase
        .from('lesson_progress' as any)
        .select('*')
        .eq('user_id', user.id) as any);

      if (error) throw error;

      return ((data as any[]) || []).map((item: any) => ({
        lessonId: item.lesson_id,
        courseId: item.course_id,
        moduleId: item.module_id || '',
        completed: item.completed || false,
        watchedSeconds: item.watched_seconds || item.last_position || 0,
        completedAt: item.completed_at || undefined,
      }));
    },
    enabled: !!user?.id,
  });

  // Mark lesson complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async ({
      lessonId,
      courseId,
      moduleId,
    }: {
      lessonId: string;
      courseId: string;
      moduleId: string;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Check if progress exists
      const { data: existing } = await (supabase
        .from('lesson_progress' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single() as any);

      if (existing) {
        // Update existing progress
        const { error } = await (supabase
          .from('lesson_progress' as any)
          .update({
            completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id) as any);

        if (error) throw error;
      } else {
        // Insert new progress
        const { error } = await (supabase.from('lesson_progress' as any).insert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          module_id: moduleId,
          completed: true,
          completed_at: new Date().toISOString(),
          watched_seconds: 0,
        }) as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao marcar aula como concluída', {
        description: error.message,
      });
    },
  });

  // Mark lesson incomplete mutation
  const markIncompleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await (supabase
        .from('lesson_progress' as any)
        .update({
          completed: false,
          completed_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao desmarcar aula', {
        description: error.message,
      });
    },
  });

  // Update watched time mutation
  const updateWatchedTimeMutation = useMutation({
    mutationFn: async ({
      lessonId,
      courseId,
      moduleId,
      seconds,
    }: {
      lessonId: string;
      courseId: string;
      moduleId: string;
      seconds: number;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Check if progress exists
      const { data: existing } = await (supabase
        .from('lesson_progress' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', lessonId)
        .single() as any);

      if (existing) {
        // Update existing progress
        const { error } = await (supabase
          .from('lesson_progress' as any)
          .update({
            watched_seconds: seconds,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id) as any);

        if (error) throw error;
      } else {
        // Insert new progress
        const { error } = await (supabase.from('lesson_progress' as any).insert({
          user_id: user.id,
          lesson_id: lessonId,
          course_id: courseId,
          module_id: moduleId,
          completed: false,
          watched_seconds: seconds,
        }) as any);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
    },
    onError: (error: any) => {
      console.error('Erro ao atualizar tempo assistido:', error);
    },
  });

  const getLessonProgress = (lessonId: string): LessonProgress | undefined => {
    return progress.find((p) => p.lessonId === lessonId);
  };

  const getCourseProgress = (courseId: string): LessonProgress[] => {
    return progress.filter((p) => p.courseId === courseId);
  };

  const getModuleProgress = (moduleId: string): LessonProgress[] => {
    return progress.filter((p) => p.moduleId === moduleId);
  };

  const markLessonComplete = (lessonId: string, courseId: string, moduleId: string) => {
    markCompleteMutation.mutate({ lessonId, courseId, moduleId });
  };

  const markLessonIncomplete = (lessonId: string) => {
    markIncompleteMutation.mutate(lessonId);
  };

  const updateWatchedTime = (
    lessonId: string,
    courseId: string,
    moduleId: string,
    seconds: number
  ) => {
    updateWatchedTimeMutation.mutate({ lessonId, courseId, moduleId, seconds });
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    const lessonProgress = progress.find((p) => p.lessonId === lessonId);
    return lessonProgress?.completed || false;
  };

  const getCourseCompletionPercentage = (courseId: string, totalLessons: number): number => {
    if (totalLessons === 0) return 0;
    const completedCount = progress.filter(
      (p) => p.courseId === courseId && p.completed
    ).length;
    return Math.round((completedCount / totalLessons) * 100);
  };

  const getLastWatchedLesson = (courseId: string): LessonProgress | undefined => {
    const courseProgress = progress.filter((p) => p.courseId === courseId);
    if (courseProgress.length === 0) return undefined;

    return courseProgress.sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    })[0];
  };

  const loadProgress = () => {
    queryClient.invalidateQueries({ queryKey: ['lesson-progress'] });
  };

  const saveProgress = (newProgress: LessonProgress[]) => {
    // This function maintains interface compatibility but is not used with Supabase
    // All updates are done through mutations
    console.warn('saveProgress is deprecated with Supabase backend');
  };

  return {
    progress,
    isLoading,
    loadProgress,
    saveProgress,
    getLessonProgress,
    getCourseProgress,
    getModuleProgress,
    markLessonComplete,
    markLessonIncomplete,
    updateWatchedTime,
    isLessonCompleted,
    getCourseCompletionPercentage,
    getLastWatchedLesson,
  };
}
