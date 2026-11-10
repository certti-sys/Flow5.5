import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processImageUpload } from "@/utils/uploadToStorage";
import { readFromLocalStorage } from "@/config/dataSource";

export { useSupabaseCourses as useCourses };

// Chave do localStorage para fallback
const LOCAL_STORAGE_KEY = 'mh_courses';
export type IntegrationPlatform = 'hotmart' | 'kiwify' | 'cakto' | 'outro' | '';

export interface Course {
  id: string;
  titulo: string;
  descricao: string;
  status: "Publicado" | "Rascunho";
  tipo: "video" | "pdf" | "arquivo" | "externo";
  modulos: number;
  aulas: number;
  imagem: string;
  banner: string;
  categoria: string;
  categoriaId?: string;
  tags?: string[];
  checkoutUrl: string;
  tagIntegracao: string;
  criadoEm: string;
  // Novos campos de integração - Fase A
  integrationEnabled: boolean;
  integrationPlatform: IntegrationPlatform;
  externalProductId: string;
  externalProductName: string;
  integrationNotes: string;
}

const COURSES_KEY = ["courses"];

export function useSupabaseCourses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch courses with counts and category name
  const { data: cursos = [], isLoading } = useQuery({
    queryKey: COURSES_KEY,
    queryFn: async () => {
      try {
        const { data: coursesData, error: coursesError } = await (supabase
          .from("courses" as any)
          .select("*")
          .order("created_at", { ascending: false }) as any);

        if (coursesError) throw coursesError;

        // Fetch categories separately
        const { data: categoriesData } = await (supabase
          .from("categories" as any)
          .select("id, nome") as any);
        
        const categoriesMap = new Map((categoriesData || []).map((c: any) => [c.id, c.nome]));

        // Fetch course_tags separately
        const { data: courseTagsData } = await (supabase
          .from("course_tags" as any)
          .select("course_id, tag_id") as any);
        
        const courseTagsMap = new Map<string, string[]>();
        (courseTagsData || []).forEach((ct: any) => {
          const existing = courseTagsMap.get(ct.course_id) || [];
          existing.push(ct.tag_id);
          courseTagsMap.set(ct.course_id, existing);
        });

        // Get counts for modules and lessons
        const coursesWithCounts = await Promise.all(
          (coursesData || []).map(async (course: any) => {
            // Count modules
            const { count: modulesCount } = await (supabase
              .from("modules" as any)
              .select("*", { count: "exact", head: true })
              .eq("curso_id", course.id) as any);

            // Count lessons
            const { count: lessonsCount } = await (supabase
              .from("lessons" as any)
              .select("*", { count: "exact", head: true })
              .eq("curso_id", course.id) as any);

            return {
              id: course.id,
              titulo: course.titulo,
              descricao: course.descricao || "",
              status: course.status as "Publicado" | "Rascunho",
              tipo: course.tipo as "video" | "pdf" | "arquivo" | "externo",
              modulos: modulesCount || 0,
              aulas: lessonsCount || 0,
              imagem: course.imagem || "",
              banner: course.banner || "",
              categoria: categoriesMap.get(course.categoria_id) || "",
              categoriaId: course.categoria_id || undefined,
              tags: courseTagsMap.get(course.id) || [],
              checkoutUrl: course.checkout_url || "",
              tagIntegracao: course.tag_integracao || "",
              criadoEm: course.created_at || new Date().toISOString(),
              // Novos campos de integração - Fase A
              integrationEnabled: course.integration_enabled || false,
              integrationPlatform: (course.integration_platform || '') as IntegrationPlatform,
              externalProductId: course.external_product_id || '',
              externalProductName: course.external_product_name || '',
              integrationNotes: course.integration_notes || '',
            };
          })
        );

        return coursesWithCounts;
      } catch (error) {
        // FALLBACK SILENCIOSO para localStorage
        console.warn('[useSupabaseCourses] Fallback para localStorage:', error);
        const localData = readFromLocalStorage<Course[]>(LOCAL_STORAGE_KEY, []);
        return localData;
      }
    },
  });

  // Create course
  const criarCursoMutation = useMutation({
    mutationFn: async (curso: Omit<Course, "id" | "criadoEm" | "modulos" | "aulas">) => {
      // Upload images if needed
      const imagemUrl = await processImageUpload(curso.imagem as any, "courses");
      const bannerUrl = await processImageUpload(curso.banner as any, "banners");

      const { data, error } = await supabase
        .from("courses")
        .insert({
          titulo: curso.titulo,
          descricao: curso.descricao,
          status: curso.status,
          tipo: curso.tipo,
          imagem: imagemUrl,
          banner: bannerUrl,
          categoria_id: curso.categoriaId,
          checkout_url: curso.checkoutUrl,
          tag_integracao: curso.tagIntegracao,
          // Novos campos de integração - Fase A
          integration_enabled: curso.integrationEnabled || false,
          integration_platform: curso.integrationPlatform || null,
          external_product_id: curso.externalProductId || null,
          external_product_name: curso.externalProductName || null,
          integration_notes: curso.integrationNotes || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Insert course tags if any
      if (curso.tags && curso.tags.length > 0) {
        const courseTags = curso.tags.map((tagId) => ({
          course_id: data.id,
          tag_id: tagId,
        }));

        const { error: tagsError } = await supabase
          .from("course_tags")
          .insert(courseTags);

        if (tagsError) console.error("Erro ao inserir tags:", tagsError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      toast({ title: "Curso criado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit course
  const editarCursoMutation = useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Course> & { id: string }) => {
      // Upload new images if needed
      let imagemUrl = updates.imagem;
      let bannerUrl = updates.banner;

      if (updates.imagem) {
        imagemUrl = await processImageUpload(updates.imagem as any, "courses");
      }
      if (updates.banner) {
        bannerUrl = await processImageUpload(updates.banner as any, "banners");
      }

      const { data, error } = await supabase
        .from("courses")
        .update({
          titulo: updates.titulo,
          descricao: updates.descricao,
          status: updates.status,
          tipo: updates.tipo,
          imagem: imagemUrl,
          banner: bannerUrl,
          categoria_id: updates.categoriaId,
          checkout_url: updates.checkoutUrl,
          tag_integracao: updates.tagIntegracao,
          // Novos campos de integração - Fase A
          integration_enabled: updates.integrationEnabled,
          integration_platform: updates.integrationPlatform || null,
          external_product_id: updates.externalProductId || null,
          external_product_name: updates.externalProductName || null,
          integration_notes: updates.integrationNotes || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Sync course tags
      if (updates.tags !== undefined) {
        // Delete existing tags
        await supabase.from("course_tags").delete().eq("course_id", id);

        // Insert new tags
        if (updates.tags.length > 0) {
          const courseTags = updates.tags.map((tagId) => ({
            course_id: id,
            tag_id: tagId,
          }));

          await supabase.from("course_tags").insert(courseTags);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      toast({ title: "Curso atualizado com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete course
  const excluirCursoMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete cascade: course_tags, modules, lessons will be deleted by FK cascade
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COURSES_KEY });
      toast({ title: "Curso excluído com sucesso!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir curso",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter courses
  const filtrarCursos = (busca: string, status: string): Course[] => {
    let filtered = cursos;

    if (busca) {
      filtered = filtered.filter(
        (curso) =>
          curso.titulo.toLowerCase().includes(busca.toLowerCase()) ||
          curso.descricao.toLowerCase().includes(busca.toLowerCase())
      );
    }

    if (status && status !== "todos") {
      filtered = filtered.filter((curso) => curso.status === status);
    }

    return filtered;
  };

  // Get single course
  const obterCurso = (id: string): Course | undefined => {
    return cursos.find((curso) => curso.id === id);
  };

  // Refetch courses
  const carregarCursos = () => {
    queryClient.invalidateQueries({ queryKey: COURSES_KEY });
  };

  return {
    cursos,
    isLoading,
    criarCurso: (curso: Omit<Course, "id" | "criadoEm" | "modulos" | "aulas">) =>
      criarCursoMutation.mutateAsync(curso),
    editarCurso: (id: string, updates: Partial<Course>) =>
      editarCursoMutation.mutateAsync({ id, ...updates }),
    excluirCurso: (id: string) => excluirCursoMutation.mutateAsync(id),
    filtrarCursos,
    obterCurso,
    carregarCursos,
  };
}
