import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LessonProgressData {
  progress_percent: number;
  completed: boolean;
  last_watched_at?: string;
}

export const useLessonProgress = (
  userId: string | null,
  lessonId: string,
  courseId: string
) => {
  const [progress, setProgress] = useState<LessonProgressData>({
    progress_percent: 0,
    completed: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !lessonId || !courseId) {
      setLoading(false);
      return;
    }

    const fetchProgress = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('lesson-progress', {
          body: { action: 'get', lessonId, courseId },
        });

        if (error) throw error;

        const p = data?.data;
        if (p) {
          setProgress(p);
        } else {
          setProgress({ progress_percent: 0, completed: false });
        }
      } catch (error) {
        console.error('Error fetching lesson progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, [userId, lessonId, courseId]);

  const refetchProgress = useCallback(async () => {
    if (!userId || !lessonId || !courseId) return;

    try {
      const { data, error } = await supabase.functions.invoke('lesson-progress', {
        body: { action: 'get', lessonId, courseId },
      });

      if (error) throw error;

      const p = data?.data;
      if (p) {
        setProgress(p);
      }
    } catch (error) {
      console.error('Error refetching lesson progress:', error);
    }
  }, [userId, lessonId, courseId]);

  const updateProgress = useCallback(
    async (progressPercent: number) => {
      if (!userId || !lessonId || !courseId) return;

      try {
        const { data, error } = await supabase.functions.invoke('lesson-progress', {
          body: {
            action: 'update',
            progressPercent: Math.round(progressPercent),
            lessonId,
            courseId,
          },
        });

        if (error) throw error;

        setProgress({
          progress_percent: Math.round(progressPercent),
          completed: progress.completed,
        });
      } catch (error) {
        console.error('Error updating lesson progress:', error);
      }
    },
    [userId, lessonId, courseId, progress.completed]
  );

  const markCompleted = useCallback(async () => {
    if (!userId || !lessonId || !courseId) return;

    try {
      const { data, error } = await supabase.functions.invoke('lesson-progress', {
        body: {
          action: 'mark_completed',
          lessonId,
          courseId,
        },
      });

      if (error) throw error;

      setProgress({
        progress_percent: 100,
        completed: true,
      });

      await refetchProgress();

      toast.success('Aula concluída!', {
        description: 'Seu progresso foi salvo.',
      });
    } catch (error) {
      console.error('Error marking lesson as completed:', error);
    }
  }, [userId, lessonId, courseId, refetchProgress]);

  return {
    progress: progress.progress_percent,
    completed: progress.completed,
    loading,
    updateProgress,
    markCompleted,
    refetchProgress,
  };
};