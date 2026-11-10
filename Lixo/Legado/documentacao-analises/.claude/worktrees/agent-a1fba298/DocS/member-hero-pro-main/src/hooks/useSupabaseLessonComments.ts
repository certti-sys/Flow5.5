import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface LessonComment {
  id: string;
  lesson_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
}

export function useSupabaseLessonComments(lessonId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar comentários
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["lesson-comments", lessonId],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("lesson_comments" as any)
        .select(`
          *,
          profiles:user_id (
            name,
            avatar_url
          )
        `)
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as LessonComment[];
    },
    enabled: !!lessonId,
  });

  // Criar comentário
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await (supabase
        .from("lesson_comments" as any)
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content,
        })
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      toast({
        title: "Comentário enviado",
        description: "Seu comentário foi publicado com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar comentário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Deletar comentário
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await (supabase
        .from("lesson_comments" as any)
        .delete()
        .eq("id", commentId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson-comments", lessonId] });
      toast({
        title: "Comentário excluído",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir comentário",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    comments,
    isLoading,
    createComment: createCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    isCreating: createCommentMutation.isPending,
  };
}
