import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processImageUpload } from "@/utils/uploadToStorage";
import { readFromLocalStorage } from "@/config/dataSource";

export { useSupabaseLessons as useLessons };

// Chave do localStorage para fallback
const LOCAL_STORAGE_KEY = 'mh_lessons';

export interface Lesson {
  id: string;
  moduloId: string;
  cursoId: string;
  nome: string;
  descricao: string;
  tipo: "video" | "pdf" | "arquivo" | "externo" | "panda_video" | "host_vsl";
  url: string;
  thumbnail: string;
  arquivo: string;
  materiaisExtras: string[];
  status: "Publicado" | "Rascunho";
  ordem: number;
  criadoEm: string;
}

const LESSONS_KEY = ["lessons"];

export function useSupabaseLessons() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all lessons
  const { data: aulas = [], isLoading } = useQuery({
    queryKey: LESSONS_KEY,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("lessons")
          .select("*")
          .order("ordem", { ascending: true });

        if (error) throw error;

        return data.map((lesson: any) => ({
          id: lesson.id,
          moduloId: lesson.modulo_id,
          cursoId: lesson.curso_id,
          nome: lesson.nome,
          descricao: lesson.descricao || "",
          tipo: lesson.tipo as "video" | "pdf" | "arquivo" | "externo",
          url: lesson.url || "",
          thumbnail: lesson.thumbnail || "",
          arquivo: lesson.arquivo || "",
          materiaisExtras: Array.isArray(lesson.materiais_extras) ? lesson.materiais_extras : [],
          status: lesson.status as "Publicado" | "Rascunho",
          ordem: lesson.ordem || 0,
          criadoEm: lesson.created_at || new Date().toISOString(),
        })) as Lesson[];
      } catch (error) {
        // FALLBACK SILENCIOSO para localStorage
        console.warn('[useSupabaseLessons] Fallback para localStorage:', error);
        const localData = readFromLocalStorage<Lesson[]>(LOCAL_STORAGE_KEY, []);
        return localData;
      }
    },
  });

  // Get lesson by ID
  const obterAula = (id: string): Lesson | undefined => {
    return aulas.find((aula) => aula.id === id) as Lesson | undefined;
  };

  // Get lessons by module ID
  const obterAulasPorModulo = (moduloId: string): Lesson[] => {
    return aulas.filter((aula) => aula.moduloId === moduloId) as Lesson[];
  };

  // Get lessons by course ID
  const obterAulasPorCurso = (cursoId: string): Lesson[] => {
    return aulas.filter((aula) => aula.cursoId === cursoId) as Lesson[];
  };

  // Create lesson
  const criarAulaMutation = useMutation({
    mutationFn: async (aula: Omit<Lesson, "id" | "criadoEm">) => {
      // Upload files
      const thumbnailUrl = await processImageUpload(aula.thumbnail as any, "lessons");
      const arquivoUrl =
        aula.tipo === "pdf" || aula.tipo === "arquivo"
          ? await processImageUpload(aula.arquivo as any, "lessons")
          : "";

      // Upload materiais extras
      const materiaisExtrasUrls: string[] = [];
      if (aula.materiaisExtras && aula.materiaisExtras.length > 0) {
        for (const material of aula.materiaisExtras) {
          const url = await processImageUpload(material as any, "lessons/extras");
          materiaisExtrasUrls.push(url);
        }
      }

      const { data, error } = await supabase
        .from("lessons")
        .insert({
          modulo_id: aula.moduloId,
          curso_id: aula.cursoId,
          nome: aula.nome,
          descricao: aula.descricao,
          tipo: aula.tipo,
          url: aula.url,
          thumbnail: thumbnailUrl || null,
          arquivo: arquivoUrl || null,
          materiais_extras: materiaisExtrasUrls,
          status: aula.status,
          ordem: aula.ordem,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      queryClient.invalidateQueries({ queryKey: ["modules"] });
      toast({ title: "Aula criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit lesson
  const editarAulaMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lesson> & { id: string }) => {
      // Upload new files if provided
      let thumbnailUrl = updates.thumbnail;
      let arquivoUrl = updates.arquivo;

      if (updates.thumbnail) {
        thumbnailUrl = await processImageUpload(updates.thumbnail as any, "lessons");
      }

      if (updates.arquivo && (updates.tipo === "pdf" || updates.tipo === "arquivo")) {
        arquivoUrl = await processImageUpload(updates.arquivo as any, "lessons");
      }

      // Upload materiais extras if provided
      let materiaisExtrasUrls = updates.materiaisExtras;
      if (updates.materiaisExtras && updates.materiaisExtras.length > 0) {
        materiaisExtrasUrls = [];
        for (const material of updates.materiaisExtras) {
          const url = await processImageUpload(material as any, "lessons/extras");
          materiaisExtrasUrls.push(url);
        }
      }

      const { data, error } = await supabase
        .from("lessons")
        .update({
          nome: updates.nome,
          descricao: updates.descricao,
          tipo: updates.tipo,
          url: updates.url,
          thumbnail: thumbnailUrl || null,
          arquivo: arquivoUrl || null,
          materiais_extras: materiaisExtrasUrls || [],
          status: updates.status,
          ordem: updates.ordem,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      toast({ title: "Aula atualizada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete lesson
  const excluirAulaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({ title: "Aula excluída!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate lesson
  const duplicarAulaMutation = useMutation({
    mutationFn: async (id: string) => {
      const original = obterAula(id);
      if (!original) throw new Error("Aula não encontrada");

      const { data, error } = await supabase
        .from("lessons")
        .insert({
          modulo_id: original.moduloId,
          curso_id: original.cursoId,
          nome: `${original.nome} (Cópia)`,
          descricao: original.descricao,
          tipo: original.tipo,
          url: original.url,
          thumbnail: original.thumbnail || null,
          arquivo: original.arquivo || null,
          materiais_extras: original.materiaisExtras,
          status: "Rascunho",
          ordem: original.ordem + 1,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      toast({ title: "Aula duplicada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Change lesson order
  const alterarOrdemMutation = useMutation({
    mutationFn: async ({ id, novaOrdem }: { id: string; novaOrdem: number }) => {
      const { error } = await supabase
        .from("lessons")
        .update({ ordem: novaOrdem })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    },
  });

  // Toggle lesson status
  const alterarStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      const aula = obterAula(id);
      if (!aula) throw new Error("Aula não encontrada");

      const newStatus = aula.status === "Publicado" ? "Rascunho" : "Publicado";

      const { error } = await supabase
        .from("lessons")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      toast({ title: "Status da aula alterado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder lessons
  const reordenarAulasMutation = useMutation({
    mutationFn: async (reorderedLessons: Lesson[]) => {
      const updates = reorderedLessons.map((lesson, index) => ({
        id: lesson.id,
        ordem: index,
      }));

      const promises = updates.map((u) =>
        supabase.from("lessons").update({ ordem: u.ordem }).eq("id", u.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
    },
  });

  // Move lesson to another module
  const moverAulaParaModuloMutation = useMutation({
    mutationFn: async ({
      aulaId,
      novoModuloId,
      novoCursoId,
    }: {
      aulaId: string;
      novoModuloId: string;
      novoCursoId: string;
    }) => {
      const { error } = await supabase
        .from("lessons")
        .update({
          modulo_id: novoModuloId,
          curso_id: novoCursoId,
        })
        .eq("id", aulaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
      toast({ title: "Aula movida com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao mover aula",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refetch lessons
  const carregarAulas = () => {
    queryClient.invalidateQueries({ queryKey: LESSONS_KEY });
  };

  return {
    aulas,
    isLoading,
    obterAula,
    obterAulasPorModulo,
    obterAulasPorCurso,
    criarAula: (aula: Omit<Lesson, "id" | "criadoEm">) =>
      criarAulaMutation.mutateAsync(aula),
    editarAula: (id: string, updates: Partial<Lesson>) =>
      editarAulaMutation.mutateAsync({ id, ...updates }),
    excluirAula: (id: string) => excluirAulaMutation.mutateAsync(id),
    duplicarAula: (id: string) => duplicarAulaMutation.mutateAsync(id),
    alterarOrdem: (id: string, novaOrdem: number) =>
      alterarOrdemMutation.mutateAsync({ id, novaOrdem }),
    alterarStatus: (id: string) => alterarStatusMutation.mutateAsync(id),
    reordenarAulas: (aulas: Lesson[]) =>
      reordenarAulasMutation.mutateAsync(aulas),
    moverAulaParaModulo: (
      aulaId: string,
      novoModuloId: string,
      novoCursoId: string
    ) =>
      moverAulaParaModuloMutation.mutateAsync({
        aulaId,
        novoModuloId,
        novoCursoId,
      }),
    carregarAulas,
  };
}
