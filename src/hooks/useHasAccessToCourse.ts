import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Acesso a um curso específico.
 *
 * Fica em cache por curso (5 min): trocar de aula dentro do mesmo curso não
 * repete a chamada nem segura a página. `failed` separa "não tem acesso" de
 * "não deu para verificar" — um erro não pode expulsar o aluno da aula.
 */
export const useHasAccessToCourse = (courseId: string | null) => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["courseAccess", courseId, user?.id],
    queryFn: async () => {
      if (!courseId) throw new Error("courseId ausente para checagem de acesso");

      const invoke = () =>
        supabase.functions.invoke("check-course-access", {
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
      if (!data?.accessMap) throw new Error("check-course-access sem accessMap");

      return data.accessMap[courseId] === true;
    },
    // Só consulta quando há curso e sessão: sem isso a página fica em loading
    // infinito esperando um courseId que nunca chega.
    enabled: !!courseId && !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  return {
    hasAccess: query.data === true,
    // Sem sessão ainda não decide nada (mantém o gate da página).
    loading: !user || query.isLoading,
    failed: query.isError,
  };
};
