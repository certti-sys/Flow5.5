import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

/**
 * Curtidas e anotação pessoal de uma aula.
 *
 * A anotação é salva com debounce de 1,2s: sem ele cada tecla vira um UPDATE e
 * o aluno perde a digitação quando troca de aula no meio. O `flush` garante que
 * nada fica pendente ao desmontar (troca de aula/navegação).
 */
const NOTES_DEBOUNCE_MS = 1200;

export const useLessonEngagement = (lessonId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lesson-engagement", lessonId, user?.id],
    queryFn: async () => {
      if (!lessonId || !user) return { liked: false, likes_count: 0, notes: "" };

      const [{ count }, { data: like }, { data: progress }] = await Promise.all([
        supabase
          .from("lesson_likes")
          .select("*", { count: "exact", head: true })
          .eq("lesson_id", lessonId),
        supabase
          .from("lesson_likes")
          .select("user_id")
          .eq("lesson_id", lessonId)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("user_progress")
          .select("notes")
          .eq("lesson_id", lessonId)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);

      return {
        liked: !!like,
        likes_count: count ?? 0,
        notes: progress?.notes ?? "",
      };
    },
    enabled: !!lessonId && !!user,
  });

  // Sincroniza o editor quando a aula carrega (ou troca).
  useEffect(() => {
    const value = data?.notes ?? "";
    setNote(value);
    setSavedNote(value);
  }, [data?.notes, lessonId]);

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (!lessonId) return null;
      const { data: result, error } = await supabase.rpc("toggle_lesson_like", {
        p_lesson_id: lessonId,
      });
      if (error) throw error;
      return result as { liked: boolean; likes_count: number };
    },
    onSuccess: (result) => {
      if (!result) return;
      queryClient.setQueryData(
        ["lesson-engagement", lessonId, user?.id],
        (old: any) => ({ ...(old ?? { notes: "" }), ...result }),
      );
    },
    onError: (error: any) => toast.error(error.message ?? "Não foi possível curtir a aula"),
  });

  const persistNote = async (value: string) => {
    if (!lessonId || !user) return;
    setSavingNote(true);
    try {
      // `upsert` porque o aluno pode anotar antes de assistir — a linha de
      // progresso pode não existir ainda.
      const { error } = await supabase.from("user_progress").upsert(
        { user_id: user.id, lesson_id: lessonId, notes: value || null },
        { onConflict: "user_id,lesson_id" },
      );
      if (error) throw error;
      setSavedNote(value);
    } catch (error: any) {
      toast.error(error.message ?? "Não foi possível salvar a anotação");
    } finally {
      setSavingNote(false);
    }
  };

  // Debounce: salva 1,2s depois da última tecla.
  useEffect(() => {
    if (note === savedNote || !lessonId) return;
    const timer = setTimeout(() => persistNote(note), NOTES_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, savedNote, lessonId]);

  // Troca de aula com anotação pendente: grava antes de perder o texto.
  useEffect(() => {
    return () => {
      if (note !== savedNote) {
        supabase
          .from("user_progress")
          .upsert(
            { user_id: user?.id, lesson_id: lessonId, notes: note || null },
            { onConflict: "user_id,lesson_id" },
          )
          .then(({ error }) => {
            if (error) console.error("Falha ao salvar anotação pendente", error);
          });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  return {
    liked: data?.liked ?? false,
    likesCount: data?.likes_count ?? 0,
    isLoading,
    toggleLike,
    note,
    setNote,
    savingNote,
    noteSaved: note === savedNote,
  };
};
