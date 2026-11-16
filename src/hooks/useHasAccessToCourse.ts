import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Acesso a um curso específico.
 *
 * `failed` existe para separar "não tem acesso" de "não deu para verificar".
 * Antes, qualquer erro na edge function virava `hasAccess = false` e a página
 * redirecionava o aluno para /info como se ele não tivesse comprado o curso.
 */
export const useHasAccessToCourse = (courseId: string | null) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setFailed(false);

    const checkAccess = async () => {
      if (!courseId) {
        if (!cancelled) setHasAccess(false);
        // Mantém loading enquanto não houver courseId válido
        return;
      }

      // Sessão ainda carregando: não decide nada
      if (!user) return;

      try {
        const invoke = () =>
          supabase.functions.invoke('check-course-access', {
            body: { courseIds: [courseId] },
          });

        let { data, error } = await invoke();

        if (error || !data?.accessMap) {
          // Token vencido no meio da sessão: renova e tenta de novo
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
          ({ data, error } = await invoke());
        }

        if (error) throw error;
        if (!data?.accessMap) throw new Error('check-course-access sem accessMap');

        if (cancelled) return;
        setHasAccess(data.accessMap[courseId] === true);
      } catch (err) {
        if (cancelled) return;
        console.error('Error checking course access:', err);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [courseId, user?.id]);

  return { hasAccess, loading, failed };
};
