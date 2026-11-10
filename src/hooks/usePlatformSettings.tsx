import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEffect } from "react";

export interface PlatformSettings {
  id: string;
  banner_badge_text: string;
  banner_title_line1: string;
  banner_title_line2: string;
  banner_title_line3: string;
  banner_subtitle: string;
  banner_button_primary_text: string;
  banner_button_primary_link: string;
  banner_button_secondary_text: string;
  banner_button_secondary_link: string;
  banner_background_url: string | null;
  banner_show_stats_card: boolean;
  logo_text: string;
  logo_image_url: string | null;
  logo_horizontal_url: string | null;
  favicon_url: string | null;
  logo_display_mode: 'icon_text' | 'horizontal';
  page_title: string;
  gradient_start_color: string;
  gradient_end_color: string;
  certificate_signature_url: string | null;
  certificate_instructor_name: string | null;
  certificate_logo_url: string | null;
  certificate_template: string;
  webhook_secret: string | null;
  login_background_url: string | null;
  login_overlay_opacity: number;
  navigation_layout: 'horizontal' | 'sidebar' | 'both';
  sidebar_default_collapsed: boolean;
  is_active: boolean;
  monitoring_sentry_dsn: string | null;
  monitoring_sentry_active: boolean;
  monitoring_internal_logs_active: boolean;
}

const defaultSettings: Partial<PlatformSettings> = {
  banner_badge_text: '✨ Nova Experiência de Aprendizado',
  banner_title_line1: 'Inspire-se,',
  banner_title_line2: 'Aprenda,',
  banner_title_line3: 'Cresça.',
  banner_subtitle: 'Acesse cursos premium, aprenda no seu ritmo e transforme seu conhecimento em resultados reais.',
  banner_button_primary_text: 'Explorar Cursos',
  banner_button_primary_link: '/dashboard',
  banner_button_secondary_text: 'Meu Progresso',
  banner_button_secondary_link: '/perfil',
  banner_show_stats_card: false,
  logo_text: 'EduStream',
  logo_display_mode: 'icon_text',
  page_title: 'EduStream',
  gradient_start_color: '#FF4136',
  gradient_end_color: '#FF851B',
  certificate_template: 'dark-premium',
  navigation_layout: 'horizontal',
  sidebar_default_collapsed: false,
  monitoring_sentry_active: false,
  monitoring_internal_logs_active: false,
};

// Get cached layout from localStorage (set by index.html script or previous session)
const getCachedLayout = (): 'horizontal' | 'sidebar' | 'both' | null => {
  try {
    const cached = localStorage.getItem('navigation_layout');
    if (cached && ['horizontal', 'sidebar', 'both'].includes(cached)) {
      return cached as 'horizontal' | 'sidebar' | 'both';
    }
  } catch (e) {
    // localStorage may be unavailable
  }
  return null;
};

export const usePlatformSettings = () => {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('is_active', true)
        // Defesa extra: se houver mais de um registro ativo, usa o mais antigo
        // (canônico, com os dados de branding/banner) em vez de falhar.
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PlatformSettings | null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Cache navigation_layout to localStorage when it changes
  useEffect(() => {
    if (settings?.navigation_layout) {
      try {
        localStorage.setItem('navigation_layout', settings.navigation_layout);
      } catch (e) {
        // localStorage may be unavailable
      }
    }
  }, [settings?.navigation_layout]);

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<PlatformSettings>) => {
      // PostgREST rejeita a escrita inteira quando alguma coluna não existe no
      // schema remoto (PGRST204). Removemos as colunas desconhecidas e tentamos
      // novamente, para que um campo desatualizado não impeça o save dos demais.
      const payload: any = { ...newSettings };

      for (let attempt = 0; attempt < 12; attempt++) {
        if (Object.keys(payload).length === 0) return null;

        const request = settings?.id
          ? supabase
              .from('platform_settings')
              .update(payload)
              .eq('id', settings.id)
              .select()
              .single()
          : supabase
              .from('platform_settings')
              .insert({ ...payload, is_active: true })
              .select()
              .single();

        const { data, error } = await request;

        if (!error) return data;

        const missingColumn = error.message?.match(/Could not find the '([^']+)' column/);
        if (error.code === 'PGRST204' && missingColumn?.[1] && missingColumn[1] in payload) {
          console.warn(
            `[platform_settings] Coluna "${missingColumn[1]}" não existe no banco; ignorando.`,
          );
          delete payload[missingColumn[1]];
          continue;
        }

        throw error;
      }

      throw new Error('Não foi possível salvar: nenhuma coluna reconhecida pelo banco.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      console.error('Error updating settings:', error);
      toast.error('Erro ao salvar configurações');
    },
  });

  const uploadAsset = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('platform-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('platform-assets')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const deleteAsset = async (url: string) => {
    const path = url.split('/').pop();
    if (!path) return;

    const { error } = await supabase.storage
      .from('platform-assets')
      .remove([path]);

    if (error) throw error;
  };

  return {
    settings: settings || defaultSettings,
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
    uploadAsset,
    deleteAsset,
  };
};
