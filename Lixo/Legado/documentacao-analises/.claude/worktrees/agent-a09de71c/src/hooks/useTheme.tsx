import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyThemeToCSSVariables, resetThemeToDefault, ColorPalette, cacheTheme } from "@/lib/colorGenerator";
import { useEffect } from "react";
import { toast } from "sonner";

export interface ThemeSettings {
  id: string;
  primary_color: string;
  color_palette: ColorPalette;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useTheme = () => {
  const queryClient = useQueryClient();

  // Fetch active theme from database
  const { data: activeTheme, isLoading } = useQuery({
    queryKey: ["activeTheme"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("theme_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as ThemeSettings | null;
    },
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    refetchOnMount: false, // Não refetch ao montar componente
    refetchOnWindowFocus: false, // Não refetch ao focar janela
  });

  // Apply theme and update cache when data changes
  useEffect(() => {
    if (activeTheme?.color_palette) {
      applyThemeToCSSVariables(activeTheme.color_palette);
      // Update localStorage cache for instant loading next time
      cacheTheme(activeTheme.primary_color, activeTheme.color_palette);
    } else if (activeTheme === null) {
      // Explicitly null means no active theme in DB - reset to default
      resetThemeToDefault();
    }
    // Note: if activeTheme is undefined (still loading), we don't do anything
    // because ThemeProvider already applied cached theme
  }, [activeTheme]);

  // Save theme mutation
  const saveThemeMutation = useMutation({
    mutationFn: async ({
      primaryColor,
      colorPalette,
    }: {
      primaryColor: string;
      colorPalette: ColorPalette;
    }) => {
      // First, deactivate all existing themes
      await supabase
        .from("theme_settings")
        .update({ is_active: false })
        .eq("is_active", true);

      // Then insert new active theme
      const { data, error } = await supabase
        .from("theme_settings")
        .insert({
          primary_color: primaryColor,
          color_palette: colorPalette,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["activeTheme"] });
      // Immediately cache the new theme
      if (data?.color_palette) {
        cacheTheme(data.primary_color, data.color_palette as ColorPalette);
      }
      toast.success("Tema salvo com sucesso!", {
        description: "As novas cores foram aplicadas para todos os usuários.",
      });
    },
    onError: (error: any) => {
      toast.error("Erro ao salvar tema", {
        description: error.message,
      });
    },
  });

  // Apply temporary preview (doesn't save to database)
  const applyPreview = (palette: ColorPalette) => {
    applyThemeToCSSVariables(palette);
    toast.success("Preview aplicado!", {
      description: "As cores são temporárias. Clique em 'Salvar e Publicar' para manter.",
    });
  };

  return {
    activeTheme,
    isLoading,
    saveTheme: saveThemeMutation.mutate,
    isSaving: saveThemeMutation.isPending,
    applyPreview,
  };
};
