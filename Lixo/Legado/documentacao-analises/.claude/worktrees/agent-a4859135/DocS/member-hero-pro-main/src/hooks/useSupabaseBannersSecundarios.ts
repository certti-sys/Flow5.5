import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/utils/uploadToStorage";
import { toast } from "sonner";

export interface BannerSecundario {
  id: string;
  nome?: string;
  imagem_url: string;
  posicao: 'antes' | 'entre' | 'depois';
  tipo: 'estatico' | 'carrossel';
  ativo: boolean;
  ordem: number;
  exibir_vitrine: boolean;
  exibir_comunidade: boolean;
  agendamento_habilitado: boolean;
  agendamento_data_inicio?: string;
  agendamento_data_fim?: string;
  agendamento_hora_inicio?: string;
  agendamento_hora_fim?: string;
}

export const useSupabaseBannersSecundarios = () => {
  const queryClient = useQueryClient();

  // Buscar todos os banners
  const { data: banners = [], isLoading } = useQuery({
    queryKey: ["promo_banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promo_banners")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as BannerSecundario[];
    },
  });

  // Verificar se um banner está ativo (considerando agendamento)
  const isBannerAtivo = (banner: BannerSecundario): boolean => {
    if (!banner.ativo) return false;
    if (!banner.agendamento_habilitado) return true;

    const agora = new Date();
    const dataAtual = agora.toISOString().split('T')[0];
    const horaAtual = agora.toTimeString().split(' ')[0].substring(0, 5);

    const { agendamento_data_inicio, agendamento_data_fim, agendamento_hora_inicio, agendamento_hora_fim } = banner;

    // Verificar data
    if (agendamento_data_inicio && dataAtual < agendamento_data_inicio) return false;
    if (agendamento_data_fim && dataAtual > agendamento_data_fim) return false;

    // Verificar hora (se dentro da data válida)
    if (agendamento_data_inicio && agendamento_data_fim) {
      if (dataAtual >= agendamento_data_inicio && dataAtual <= agendamento_data_fim) {
        if (agendamento_hora_inicio && horaAtual < agendamento_hora_inicio) return false;
        if (agendamento_hora_fim && horaAtual > agendamento_hora_fim) return false;
      }
    }

    return true;
  };

  // Filtrar banners ativos
  const bannersAtivos = banners.filter(isBannerAtivo);

  // Adicionar banner
  const addBannerMutation = useMutation({
    mutationFn: async (banner: Omit<BannerSecundario, 'id'>) => {
      const { data, error } = await supabase
        .from("promo_banners")
        .insert([banner])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_banners"] });
      toast.success("Banner criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar banner:", error);
      toast.error("Erro ao criar banner");
    },
  });

  // Atualizar banner
  const updateBannerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BannerSecundario> }) => {
      const { data, error } = await supabase
        .from("promo_banners")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_banners"] });
      toast.success("Banner atualizado!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar banner:", error);
      toast.error("Erro ao atualizar banner");
    },
  });

  // Deletar banner
  const deleteBannerMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("promo_banners")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_banners"] });
      toast.success("Banner excluído!");
    },
    onError: (error) => {
      console.error("Erro ao excluir banner:", error);
      toast.error("Erro ao excluir banner");
    },
  });

  // Reordenar banners
  const reorderBannersMutation = useMutation({
    mutationFn: async (newOrder: BannerSecundario[]) => {
      const updates = newOrder.map((banner, index) => 
        supabase
          .from("promo_banners")
          .update({ ordem: index })
          .eq("id", banner.id)
      );

      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promo_banners"] });
    },
  });

  // Upload de imagem
  const uploadBannerImage = async (file: File): Promise<string> => {
    try {
      const url = await uploadFile(file, "banners");
      return url;
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
      throw error;
    }
  };

  return {
    banners,
    bannersAtivos,
    isLoading,
    isBannerAtivo,
    addBanner: addBannerMutation.mutateAsync,
    updateBanner: (id: string, updates: Partial<BannerSecundario>) => 
      updateBannerMutation.mutateAsync({ id, updates }),
    deleteBanner: deleteBannerMutation.mutateAsync,
    reorderBanners: reorderBannersMutation.mutateAsync,
    uploadBannerImage,
  };
};
