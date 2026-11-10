import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CourseAccessMap {
  [courseId: string]: boolean;
}

const ACCESS_CACHE_KEY = 'courseAccessMap';

// Get cached access map from localStorage
const getCachedAccessMap = (): CourseAccessMap => {
  try {
    const cached = localStorage.getItem(ACCESS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // localStorage may be unavailable
  }
  return {};
};

// Save access map to localStorage
const cacheAccessMap = (accessMap: CourseAccessMap): void => {
  try {
    // Merge with existing cache to preserve access for other courses
    const existing = getCachedAccessMap();
    const merged = { ...existing, ...accessMap };
    localStorage.setItem(ACCESS_CACHE_KEY, JSON.stringify(merged));
  } catch (e) {
    // localStorage may be unavailable
  }
};

export const useCourseAccess = (courseIds: string[]) => {
  const { user } = useAuth();

  // Initialize with cached values to prevent flash
  const [accessMap, setAccessMap] = useState<CourseAccessMap>(() => {
    const cached = getCachedAccessMap();
    // Return only the access for requested courseIds
    const initial: CourseAccessMap = {};
    courseIds.forEach(id => {
      if (cached[id] !== undefined) {
        initial[id] = cached[id];
      }
    });
    return initial;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (courseIds.length === 0) {
        setAccessMap({});
        setLoading(false);
        return;
      }

      // If no user, all courses locked
      if (!user) {
        const noAccessMap: CourseAccessMap = {};
        courseIds.forEach(id => noAccessMap[id] = false);
        setAccessMap(noAccessMap);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Call edge function to check access
        const { data, error } = await supabase.functions.invoke('check-course-access', {
          body: { courseIds },
        });

        if (error) throw error;

        const newAccessMap = data.accessMap || {};
        setAccessMap(newAccessMap);

        // Cache for next time
        cacheAccessMap(newAccessMap);
      } catch (err) {
        console.error('Error checking course access:', err);
        // On error, try to use cached values, otherwise mark as no access
        const cached = getCachedAccessMap();
        const errorMap: CourseAccessMap = {};
        courseIds.forEach(id => {
          errorMap[id] = cached[id] ?? false;
        });
        setAccessMap(errorMap);
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [courseIds.join(','), user?.id]);

  return { accessMap, loading };
};

