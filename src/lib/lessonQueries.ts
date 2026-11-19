import { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Consultas da página de aula.
 *
 * Estão fora do componente para que o menu lateral possa fazer o prefetch da
 * próxima aula (hover/foco) usando exatamente as mesmas chaves e os mesos
 * selects — sem isso a troca de aula tinha que esperar a rede.
 */
export interface LessonComment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  lesson_id: string;
  parent_id: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  isAuthorAdmin?: boolean;
  replies?: LessonComment[];
}

export const fetchLesson = async (lessonId: string) => {
  const { data, error } = await supabase
    .from("lessons")
    .select(`
      *,
      modules (
        *,
        courses (*)
      )
    `)
    .eq("id", lessonId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchLessonProgress = async (lessonId: string, userId?: string) => {
  if (!userId || !lessonId) return null;
  const { data, error } = await supabase
    .from("user_progress")
    .select("*")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const fetchLessonMaterials = async (lessonId: string) => {
  if (!lessonId) return [];
  const { data, error } = await supabase
    .from("lesson_materials")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("order_index");

  if (error) throw error;
  return data;
};

export const fetchLessonComments = async (lessonId: string): Promise<LessonComment[]> => {
  // Comentários da aula
  const { data: commentsData, error: commentsError } = await supabase
    .from("comments")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("created_at", { ascending: true });

  if (commentsError) throw commentsError;

  // Autor do comentário. `profiles` só é legível pelo dono ou admin (tem
  // e-mail, whatsapp e status), então nome/avatar/flag de admin vêm da view
  // pública. A flag substitui a consulta antiga em `user_roles`, que só
  // devolvia as roles do próprio usuário - por isso a etiqueta de admin
  // nunca aparecia para o aluno.
  const authorIds = [...new Set((commentsData || []).map((c: any) => c.user_id))];
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles_public")
        .select("id, name, avatar_url, is_admin")
        .in("id", authorIds)
    : { data: [] as { id: string; name: string; avatar_url: string | null; is_admin: boolean }[] };

  const authorById = new Map(
    (authors || []).map((a: any) => [
      a.id,
      { name: a.name, avatar_url: a.avatar_url, is_admin: !!a.is_admin },
    ]),
  );

  // Monta as threads: mapa de todos e depois liga respostas aos pais
  const commentsMap = new Map<string, LessonComment>();
  const rootComments: LessonComment[] = [];

  (commentsData || []).forEach((comment: any) => {
    commentsMap.set(comment.id, {
      ...comment,
      profiles: authorById.get(comment.user_id) ?? null,
      isAuthorAdmin: authorById.get(comment.user_id)?.is_admin ?? false,
      replies: [],
    });
  });

  (commentsData || []).forEach((comment: any) => {
    const commentWithReplies = commentsMap.get(comment.id)!;
    if (comment.parent_id && commentsMap.has(comment.parent_id)) {
      commentsMap.get(comment.parent_id)!.replies!.push(commentWithReplies);
    } else if (!comment.parent_id) {
      rootComments.push(commentWithReplies);
    }
  });

  // Respostas em ordem cronológica (mais antiga primeiro)
  commentsMap.forEach((comment) => {
    if (comment.replies && comment.replies.length > 0) {
      comment.replies.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
  });

  // Comentários-raiz do mais recente para o mais antigo
  return rootComments.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
};

/** Pré-carrega tudo que a página da aula vai pedir, sem bloquear a navegação. */
export const prefetchLesson = (
  queryClient: QueryClient,
  lessonId: string,
  userId?: string,
): void => {
  if (!lessonId) return;

  queryClient.prefetchQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => fetchLesson(lessonId),
  });
  queryClient.prefetchQuery({
    queryKey: ["lessonMaterials", lessonId],
    queryFn: () => fetchLessonMaterials(lessonId),
  });
  queryClient.prefetchQuery({
    queryKey: ["comments", lessonId],
    queryFn: () => fetchLessonComments(lessonId),
  });
  if (userId) {
    queryClient.prefetchQuery({
      queryKey: ["lessonProgress", lessonId, userId],
      queryFn: () => fetchLessonProgress(lessonId, userId),
    });
  }
};
