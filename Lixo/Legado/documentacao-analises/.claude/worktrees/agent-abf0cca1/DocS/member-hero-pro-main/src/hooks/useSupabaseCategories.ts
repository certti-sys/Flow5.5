import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export { useSupabaseCategories as useCategories };

export interface Category {
  id: string;
  nome: string;
  cor: string;
  descricao?: string;
  ordem: number;
  criadoEm: string;
}

export interface Tag {
  id: string;
  nome: string;
  cor: string;
  descricao?: string;
  criadoEm: string;
}

const CATEGORIES_KEY = ["categories"];
const TAGS_KEY = ["tags"];

export function useSupabaseCategories() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: loadingCategories } = useQuery({
    queryKey: CATEGORIES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;

      return data.map((cat) => ({
        id: cat.id,
        nome: cat.nome,
        cor: cat.cor || "#D4AF37",
        descricao: cat.descricao || undefined,
        ordem: cat.ordem || 0,
        criadoEm: cat.created_at || new Date().toISOString(),
      }));
    },
  });

  // Fetch tags
  const { data: tags = [], isLoading: loadingTags } = useQuery({
    queryKey: TAGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;

      return data.map((tag) => ({
        id: tag.id,
        nome: tag.nome,
        cor: tag.cor || "#D4AF37",
        descricao: tag.descricao || undefined,
        criadoEm: tag.created_at || new Date().toISOString(),
      }));
    },
  });

  // Add category
  const addCategoryMutation = useMutation({
    mutationFn: async (category: Omit<Category, "id" | "criadoEm">) => {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          nome: category.nome,
          cor: category.cor,
          descricao: category.descricao,
          ordem: category.ordem,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast({ title: "Categoria criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from("categories")
        .update({
          nome: updates.nome,
          cor: updates.cor,
          descricao: updates.descricao,
          ordem: updates.ordem,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast({ title: "Categoria atualizada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
      toast({ title: "Categoria excluída!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reorder categories
  const reorderCategoriesMutation = useMutation({
    mutationFn: async (reorderedCategories: Category[]) => {
      const updates = reorderedCategories.map((cat, index) => ({
        id: cat.id,
        ordem: index,
      }));

      const promises = updates.map((u) =>
        supabase.from("categories").update({ ordem: u.ordem }).eq("id", u.id)
      );

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_KEY });
    },
  });

  // Add tag
  const addTagMutation = useMutation({
    mutationFn: async (tag: Omit<Tag, "id" | "criadoEm">) => {
      const { data, error } = await supabase
        .from("tags")
        .insert({
          nome: tag.nome,
          cor: tag.cor,
          descricao: tag.descricao,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      toast({ title: "Tag criada com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update tag
  const updateTagMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Tag> & { id: string }) => {
      const { data, error } = await supabase
        .from("tags")
        .update({
          nome: updates.nome,
          cor: updates.cor,
          descricao: updates.descricao,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      toast({ title: "Tag atualizada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete tag
  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TAGS_KEY });
      toast({ title: "Tag excluída!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir tag",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Utility functions
  const getCategoryById = (id: string): Category | undefined => {
    return categories.find((cat) => cat.id === id);
  };

  const getTagById = (id: string): Tag | undefined => {
    return tags.find((tag) => tag.id === id);
  };

  const getTagsByIds = (ids: string[]): Tag[] => {
    return tags.filter((tag) => ids.includes(tag.id));
  };

  return {
    categories,
    tags,
    isLoading: loadingCategories || loadingTags,
    addCategory: (cat: Omit<Category, "id" | "criadoEm">) =>
      addCategoryMutation.mutateAsync(cat),
    updateCategory: (id: string, updates: Partial<Category>) =>
      updateCategoryMutation.mutateAsync({ id, ...updates }),
    deleteCategory: (id: string) => deleteCategoryMutation.mutateAsync(id),
    reorderCategories: (cats: Category[]) =>
      reorderCategoriesMutation.mutateAsync(cats),
    addTag: (tag: Omit<Tag, "id" | "criadoEm">) => addTagMutation.mutateAsync(tag),
    updateTag: (id: string, updates: Partial<Tag>) =>
      updateTagMutation.mutateAsync({ id, ...updates }),
    deleteTag: (id: string) => deleteTagMutation.mutateAsync(id),
    getCategoryById,
    getTagById,
    getTagsByIds,
  };
}
