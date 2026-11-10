import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useHasAccessToCourse = (courseId: string | null) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set loading immediately when dependencies change to prevent race conditions
    setLoading(true);

    const checkAccess = async () => {
      // If no course, no access
      if (!courseId) {
        setHasAccess(false);
        // DO NOT set loading=false here - keep loading=true while waiting for valid courseId
        return;
      }

      // If no user, no access
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {

        // Call edge function to check access
        const { data, error } = await supabase.functions.invoke('check-course-access', {
          body: { courseIds: [courseId] },
        });

        if (error) throw error;

        const hasAccessToCourse = data.accessMap[courseId] === true;
        setHasAccess(hasAccessToCourse);
      } catch (err) {
        console.error('Error checking course access:', err);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [courseId, user?.id]);

  return { hasAccess, loading };
};
