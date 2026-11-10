import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export { useSupabaseStudentAccess as useStudentAccess };

export interface CourseAccess {
  courseId: string;
  granted: boolean;
  grantedAt: string;
  expiresAt: string | null;
}

export function useSupabaseStudentAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch course access for current user
  const { data: access = [], isLoading } = useQuery({
    queryKey: ['course-access', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('course_access')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      return (data || []).map((item) => ({
        courseId: item.course_id,
        granted: item.granted || false,
        grantedAt: item.granted_at || new Date().toISOString(),
        expiresAt: item.expires_at || null,
      }));
    },
    enabled: !!user?.id,
  });

  // Grant access mutation
  const grantAccessMutation = useMutation({
    mutationFn: async ({
      courseId,
      expiresAt,
    }: {
      courseId: string;
      expiresAt?: string | null;
    }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Check if access already exists
      const { data: existing } = await supabase
        .from('course_access')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (existing) {
        // Update existing access
        const { error } = await supabase
          .from('course_access')
          .update({
            granted: true,
            granted_at: new Date().toISOString(),
            expires_at: expiresAt || null,
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Insert new access
        const { error } = await supabase.from('course_access').insert({
          user_id: user.id,
          course_id: courseId,
          granted: true,
          granted_at: new Date().toISOString(),
          expires_at: expiresAt || null,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-access'] });
      toast.success('Acesso concedido ao curso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao conceder acesso', {
        description: error.message,
      });
    },
  });

  // Revoke access mutation
  const revokeAccessMutation = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('course_access')
        .update({ granted: false })
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['course-access'] });
      toast.success('Acesso revogado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao revogar acesso', {
        description: error.message,
      });
    },
  });

  const hasAccess = (courseId: string): boolean => {
    const courseAccess = access.find((a) => a.courseId === courseId);
    if (!courseAccess || !courseAccess.granted) return false;

    if (courseAccess.expiresAt) {
      const expirationDate = new Date(courseAccess.expiresAt);
      if (expirationDate < new Date()) return false;
    }

    return true;
  };

  const grantAccess = (courseId: string, expiresAt: string | null = null) => {
    grantAccessMutation.mutate({ courseId, expiresAt });
  };

  const revokeAccess = (courseId: string) => {
    revokeAccessMutation.mutate(courseId);
  };

  const getAccessedCourses = (): string[] => {
    return access
      .filter((a) => {
        if (!a.granted) return false;
        if (a.expiresAt && new Date(a.expiresAt) < new Date()) return false;
        return true;
      })
      .map((a) => a.courseId);
  };

  const getCourseAccess = (courseId: string): CourseAccess | undefined => {
    return access.find((a) => a.courseId === courseId);
  };

  const loadAccess = () => {
    queryClient.invalidateQueries({ queryKey: ['course-access'] });
  };

  return {
    access,
    isLoading,
    hasAccess,
    grantAccess,
    revokeAccess,
    getAccessedCourses,
    getCourseAccess,
    loadAccess,
  };
}
