import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export { useSupabaseShelves as useShelves };

export interface Shelf {
  id: string;
  titulo: string;
  ordem: number;
  tipo: 'automatica' | 'manual' | 'categoria';
  cursosIds?: string[];
  categoriaId?: string;
  ativo: boolean;
}

export function useSupabaseShelves() {
  const queryClient = useQueryClient();

  // Fetch shelves with associated courses
  const { data: shelves = [], isLoading } = useQuery({
    queryKey: ['shelves'],
    queryFn: async () => {
      const { data: shelvesData, error: shelvesError } = await supabase
        .from('shelves')
        .select('*')
        .order('ordem', { ascending: true });

      if (shelvesError) throw shelvesError;

      // For each shelf, fetch associated courses if manual type
      const shelvesWithCourses = await Promise.all(
        (shelvesData || []).map(async (shelf) => {
          if (shelf.tipo === 'manual') {
            const { data: shelfCourses } = await supabase
              .from('shelf_courses')
              .select('course_id')
              .eq('shelf_id', shelf.id)
              .order('ordem', { ascending: true });

            return {
              id: shelf.id,
              titulo: shelf.titulo,
              ordem: shelf.ordem || 0,
              tipo: shelf.tipo as 'automatica' | 'manual' | 'categoria',
              cursosIds: shelfCourses?.map((sc) => sc.course_id) || [],
              categoriaId: shelf.categoria_id || undefined,
              ativo: shelf.ativo || false,
            };
          }

          return {
            id: shelf.id,
            titulo: shelf.titulo,
            ordem: shelf.ordem || 0,
            tipo: shelf.tipo as 'automatica' | 'manual' | 'categoria',
            cursosIds: [],
            categoriaId: shelf.categoria_id || undefined,
            ativo: shelf.ativo || false,
          };
        })
      );

      return shelvesWithCourses;
    },
  });

  // Add shelf mutation
  const addShelfMutation = useMutation({
    mutationFn: async (data: Omit<Shelf, 'id' | 'ordem'>) => {
      const maxOrdem = Math.max(...shelves.map((s) => s.ordem), 0);
      
      const { data: shelf, error } = await supabase
        .from('shelves')
        .insert({
          titulo: data.titulo,
          tipo: data.tipo,
          ativo: data.ativo,
          ordem: maxOrdem + 1,
          categoria_id: data.categoriaId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If manual shelf with courses, insert shelf_courses
      if (data.tipo === 'manual' && data.cursosIds && data.cursosIds.length > 0) {
        const shelfCourses = data.cursosIds.map((courseId, index) => ({
          shelf_id: shelf.id,
          course_id: courseId,
          ordem: index,
        }));

        const { error: coursesError } = await supabase
          .from('shelf_courses')
          .insert(shelfCourses);

        if (coursesError) throw coursesError;
      }

      return shelf;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast.success('Prateleira criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar prateleira', {
        description: error.message,
      });
    },
  });

  // Update shelf mutation
  const updateShelfMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Shelf> }) => {
      const { error } = await supabase
        .from('shelves')
        .update({
          titulo: updates.titulo,
          tipo: updates.tipo,
          ativo: updates.ativo,
          ordem: updates.ordem,
          categoria_id: updates.categoriaId || null,
        })
        .eq('id', id);

      if (error) throw error;

      // If manual shelf, update shelf_courses
      if (updates.tipo === 'manual' && updates.cursosIds !== undefined) {
        // Delete existing courses
        await supabase.from('shelf_courses').delete().eq('shelf_id', id);

        // Insert new courses
        if (updates.cursosIds.length > 0) {
          const shelfCourses = updates.cursosIds.map((courseId, index) => ({
            shelf_id: id,
            course_id: courseId,
            ordem: index,
          }));

          const { error: coursesError } = await supabase
            .from('shelf_courses')
            .insert(shelfCourses);

          if (coursesError) throw coursesError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast.success('Prateleira atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar prateleira', {
        description: error.message,
      });
    },
  });

  // Delete shelf mutation
  const deleteShelfMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete shelf_courses first (cascade should handle this, but being explicit)
      await supabase.from('shelf_courses').delete().eq('shelf_id', id);

      const { error } = await supabase.from('shelves').delete().eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast.success('Prateleira excluída!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir prateleira', {
        description: error.message,
      });
    },
  });

  // Reorder shelves mutation
  const reorderShelvesMutation = useMutation({
    mutationFn: async (newOrder: Shelf[]) => {
      const updates = newOrder.map((shelf, index) => ({
        id: shelf.id,
        ordem: index,
      }));

      for (const update of updates) {
        await supabase
          .from('shelves')
          .update({ ordem: update.ordem })
          .eq('id', update.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao reordenar prateleiras', {
        description: error.message,
      });
    },
  });

  // Duplicate shelf mutation
  const duplicateShelfMutation = useMutation({
    mutationFn: async (id: string) => {
      const shelf = shelves.find((s) => s.id === id);
      if (!shelf) throw new Error('Prateleira não encontrada');

      const { data: newShelf, error } = await supabase
        .from('shelves')
        .insert({
          titulo: `${shelf.titulo} (Cópia)`,
          tipo: shelf.tipo,
          ativo: shelf.ativo,
          ordem: shelf.ordem + 1,
          categoria_id: shelf.categoriaId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If manual shelf, duplicate courses
      if (shelf.tipo === 'manual' && shelf.cursosIds && shelf.cursosIds.length > 0) {
        const shelfCourses = shelf.cursosIds.map((courseId, index) => ({
          shelf_id: newShelf.id,
          course_id: courseId,
          ordem: index,
        }));

        const { error: coursesError } = await supabase
          .from('shelf_courses')
          .insert(shelfCourses);

        if (coursesError) throw coursesError;
      }

      return newShelf;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shelves'] });
      toast.success('Prateleira duplicada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao duplicar prateleira', {
        description: error.message,
      });
    },
  });

  const addShelf = (data: Omit<Shelf, 'id' | 'ordem'>) => {
    return addShelfMutation.mutate(data);
  };

  const updateShelf = (id: string, updates: Partial<Shelf>) => {
    updateShelfMutation.mutate({ id, updates });
  };

  const deleteShelf = (id: string) => {
    deleteShelfMutation.mutate(id);
  };

  const reorderShelves = (newOrder: Shelf[]) => {
    reorderShelvesMutation.mutate(newOrder);
  };

  const duplicateShelf = (id: string) => {
    duplicateShelfMutation.mutate(id);
    return shelves.find((s) => s.id === id) || null;
  };

  const getActiveShelves = () => {
    return shelves.filter((s) => s.ativo).sort((a, b) => a.ordem - b.ordem);
  };

  return {
    shelves: shelves.sort((a, b) => a.ordem - b.ordem),
    isLoading,
    addShelf,
    updateShelf,
    deleteShelf,
    reorderShelves,
    duplicateShelf,
    getActiveShelves,
  };
}
