import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CommunitySettings {
  id?: string;
  nome: string;
  descricao: string;
  imagemCapa: string;
  bannerPrincipal: string;
  corDestaque: string;
  mensagemBoasVindas: string;
  icone: string;
  cursosVinculados: string[];
  modulosVinculados: string[];
}

export interface CommunityAccess {
  id: string;
  userId: string;
  granted: boolean;
  grantedAt: string;
  grantedBy?: string;
}

export function useSupabaseCommunity() {
  const queryClient = useQueryClient();

  // Buscar configurações da comunidade
  const { data: settings, isLoading: loadingSettings } = useQuery({
    queryKey: ["community-settings"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("community_settings" as any)
        .select("*")
        .single() as any);

      if (error && error.code !== "PGRST116") throw error;
      
      if (!data) {
        return {
          nome: "Comunidade Premium",
          descricao: "Acesso exclusivo para membros",
          imagemCapa: "",
          bannerPrincipal: "",
          corDestaque: "#D4AF37",
          mensagemBoasVindas: "",
          icone: "🏛️",
          cursosVinculados: [],
          modulosVinculados: [],
        };
      }

      return {
        id: data.id,
        nome: data.nome,
        descricao: data.descricao || "",
        imagemCapa: data.imagem_capa || "",
        bannerPrincipal: data.banner_principal || "",
        corDestaque: data.cor_destaque || "#D4AF37",
        mensagemBoasVindas: data.mensagem_boas_vindas || "",
        icone: data.icone || "🏛️",
        cursosVinculados: data.cursos_vinculados || [],
        modulosVinculados: data.modulos_vinculados || [],
      };
    },
  });

  // Buscar acessos manuais (apenas admin)
  const { data: manualAccess = [] } = useQuery({
    queryKey: ["community-access"],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("community_access" as any)
        .select("*")
        .eq("has_access", true) as any);

      if (error) throw error;
      return data || [];
    },
  });

  // Atualizar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<CommunitySettings>) => {
      const settingsToUpdate = {
        nome: newSettings.nome,
        descricao: newSettings.descricao,
        imagem_capa: newSettings.imagemCapa,
        banner_principal: newSettings.bannerPrincipal,
        cor_destaque: newSettings.corDestaque,
        mensagem_boas_vindas: newSettings.mensagemBoasVindas,
        icone: newSettings.icone,
        cursos_vinculados: newSettings.cursosVinculados,
        modulos_vinculados: newSettings.modulosVinculados,
        updated_at: new Date().toISOString(),
      };

      if (settings?.id) {
        const { error } = await (supabase
          .from("community_settings" as any)
          .update(settingsToUpdate)
          .eq("id", settings.id) as any);
        
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from("community_settings" as any)
          .insert([settingsToUpdate]) as any);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao salvar configurações");
    },
  });

  // Liberar acesso manual
  const grantAccessMutation = useMutation({
    mutationFn: async ({ userId, grantedBy }: { userId: string; grantedBy: string }) => {
      const { error } = await (supabase
        .from("community_access" as any)
        .upsert({
          user_id: userId,
          has_access: true,
          granted_at: new Date().toISOString(),
        }) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-access"] });
      toast.success("Acesso liberado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao liberar acesso:", error);
      toast.error("Erro ao liberar acesso");
    },
  });

  // Revogar acesso manual
  const revokeAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await (supabase
        .from("community_access" as any)
        .delete()
        .eq("user_id", userId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-access"] });
      toast.success("Acesso revogado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao revogar acesso:", error);
      toast.error("Erro ao revogar acesso");
    },
  });

  // Verificar se um usuário tem acesso (para alunos)
  const checkUserAccess = async (userId: string) => {
    const { data, error } = await (supabase
      .from("community_access" as any)
      .select("*")
      .eq("user_id", userId)
      .eq("has_access", true)
      .maybeSingle() as any);

    if (error) {
      console.error("Erro ao verificar acesso:", error);
      return false;
    }

    return !!data;
  };

  return {
    settings: settings || {
      nome: "Comunidade Premium",
      descricao: "",
      imagemCapa: "",
      bannerPrincipal: "",
      corDestaque: "#D4AF37",
      mensagemBoasVindas: "",
      icone: "🏛️",
      cursosVinculados: [],
      modulosVinculados: [],
    },
    manualAccess,
    loadingSettings,
    updateSettings: updateSettingsMutation.mutateAsync,
    grantAccess: grantAccessMutation.mutateAsync,
    revokeAccess: revokeAccessMutation.mutateAsync,
    checkUserAccess,
  };
}
