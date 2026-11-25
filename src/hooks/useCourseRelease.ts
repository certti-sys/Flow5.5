import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Drip content: módulos e aulas que ainda não foram liberados para este aluno.
 *
 * Quem decide é o banco (`get_course_release_map`), não o relógio do navegador.
 * A função devolve apenas o que está travado agora — se o aluno mudar a hora do
 * sistema, nada muda.
 *
 * `failed` separa "não foi possível verificar" de "está liberado". Em caso de
 * erro a UI trata tudo como liberado: bloquear aula por falha de rede é pior
 * que liberar cedo, e a guarda real está na edge `lesson-progress`.
 */
export type ReleaseMap = Record<string, string>;

// Identidade estável: `Course.tsx` usa o mapa como dependência de efeito, e um
// `{}` novo a cada render faria o efeito rodar em loop.
const EMPTY_RELEASE_MAP: ReleaseMap = {};

export const useCourseRelease = (courseId: string | null | undefined) => {
  const { user } = useAuth();

  const query = useQuery<ReleaseMap>({
    queryKey: ["courseRelease", courseId, user?.id],
    queryFn: async () => {
      if (!courseId) return {};
      const { data, error } = await supabase.rpc("get_course_release_map", {
        p_course_id: courseId,
      });
      if (error) throw error;
      const map: ReleaseMap = {};
      (data ?? []).forEach((row: { kind: string; id: string; available_at: string }) => {
        map[row.id] = row.available_at;
      });
      return map;
    },
    enabled: !!courseId && !!user,
    staleTime: 60_000,
    retry: false,
  });

  return {
    releaseMap: query.data ?? EMPTY_RELEASE_MAP,
    loadingRelease: query.isLoading,
    failed: query.isError,
  };
};

/** Texto do aviso de bloqueio — reexportado de `lib/release-schedule`. */
export { releaseLabel } from "@/lib/release-schedule";
