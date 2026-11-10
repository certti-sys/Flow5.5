import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processImageUpload } from "@/utils/uploadToStorage";
import { readFromLocalStorage } from "@/config/dataSource";

export { useSupabaseModules as useModules };

// Chave do localStorage para fallback
const LOCAL_STORAGE_KEY = 'mh_modules';

export interface Module {
  id: string;
  cursoId: string;
  nome: string;
  descricao: string;
  categoriaId?: string;
  tags?: string[];
  imagem?: string;
  ordem: number;
  status: "Publicado" | "Rascunho";
  criadoEm: string;
}

const MODULES_KEY = ["modules"];

export function useSupabaseModules() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all modules
  const { data: modulos = [], isLoading } = useQuery({
    queryKey: MODULES_KEY,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("modules")
          .select("*")
          .order("ordem", { ascending: true });

        if (error) throw error;

        return data.map((mod) => ({
          id: mod.id,
          cursoId: mod.curso_id,
          nome: mod.nome,
          descricao: mod.descricao || "",
          imagem: mod.imagem || undefined,
          ordem: mod.ordem || 0,
          status: mod.status as "Publicado" | "Rascunho",
          criadoEm: mod.created_at || new Date().toISOString(),
        }));
      } catch (error) {
        // FALLBACK SILENCIOSO para localStorage
        console.warn('[useSupabaseModules] Fallback para localStorage:', error);
        const localData = readFromLocalStorage<Module[]>(LOCAL_STORAGE_KEY, []);
        return localData;
      }
    },
  });

  // Get module by ID
  const obterModulo = (id: string): Module | undefined => {
    return modulos.find((mod) => mod.id === id);
  };

  // Get modules by course ID
  const obterModulosPorCurso = (cursoId: string): Module[] => {
    return modulos.filter((mod) => mod.cursoId === cursoId);
  };

  // Create module
  const criarModuloMutation = useMutation({
    mutationFn: async (modulo: Omit<Module, "id" | "criadoEm">) => {
      const imagemUrl = await processImageUpload(modulo.imagem as any, "modules");

      const { data, error } = await supabase
        .from("modules")
        .insert({
          curso_id: modulo.cursoId,
          nome: modulo.nome,
          descricao: modulo.descricao,
          imagem: imagemUrl || null,
          ordem: modulo.ordem,
          status: modulo.status,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({ title: "Módulo criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit module
  const editarModuloMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Module> & { id: string }) => {
      let imagemUrl = updates.imagem;

      if (updates.imagem) {
        imagemUrl = await processImageUpload(updates.imagem as any, "modules");
      }

      const { data, error } = await supabase
        .from("modules")
        .update({
          nome: updates.nome,
          descricao: updates.descricao,
          imagem: imagemUrl || null,
          ordem: updates.ordem,
          status: updates.status,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      toast({ title: "Módulo atualizado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete module
  const excluirModuloMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast({ title: "Módulo excluído!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate module
  const duplicarModuloMutation = useMutation({
    mutationFn: async (id: string) => {
      const original = obterModulo(id);
      if (!original) throw new Error("Módulo não encontrado");

      const { data, error } = await supabase
        .from("modules")
        .insert({
          curso_id: original.cursoId,
          nome: `${original.nome} (Cópia)`,
          descricao: original.descricao,
          imagem: original.imagem || null,
          ordem: original.ordem + 1,
          status: "Rascunho",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      toast({ title: "Módulo duplicado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao duplicar módulo",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder modules
  const reordenarModulosMutation = useMutation({
    mutationFn: async (reorderedModules: Module[]) => {
      const updates = reorderedModules.map((mod, index) => ({
        id: mod.id,
        ordem: index,
      }));

      const promises = updates.map((u) =>
        supabase.from("modules").update({ ordem: u.ordem }).eq("id", u.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
    },
  });

  // Toggle module status
  const alterarStatusModuloMutation = useMutation({
    mutationFn: async (id: string) => {
      const modulo = obterModulo(id);
      if (!modulo) throw new Error("Módulo não encontrado");

      const newStatus =
        modulo.status === "Publicado" ? "Rascunho" : "Publicado";

      const { error } = await supabase
        .from("modules")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODULES_KEY });
      toast({ title: "Status do módulo alterado!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Refetch modules
  const carregarModulos = () => {
    queryClient.invalidateQueries({ queryKey: MODULES_KEY });
  };

  return {
    modulos,
    isLoading,
    obterModulo,
    obterModulosPorCurso,
    criarModulo: (modulo: Omit<Module, "id" | "criadoEm">) =>
      criarModuloMutation.mutateAsync(modulo),
    editarModulo: (id: string, updates: Partial<Module>) =>
      editarModuloMutation.mutateAsync({ id, ...updates }),
    excluirModulo: (id: string) => excluirModuloMutation.mutateAsync(id),
    duplicarModulo: (id: string) => duplicarModuloMutation.mutateAsync(id),
    reordenarModulos: (mods: Module[]) =>
      reordenarModulosMutation.mutateAsync(mods),
    alterarStatusModulo: (id: string) =>
      alterarStatusModuloMutation.mutateAsync(id),
    carregarModulos,
  };
}
