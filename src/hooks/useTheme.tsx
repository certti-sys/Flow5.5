import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  applyThemeToCSSVariables,
  resetThemeToDefault,
  cacheTheme,
  getCachedTheme,
  ColorPalette,
} from "@/lib/colorGenerator";
import { useEffect } from "react";
import { toast } from "sonner";

export interface ThemeSettings {
  id: string;
  primary_color: string;
  color_palette: ColorPalette;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Preset global aplicado (`theme-presets.ts`). `null` = paleta manual. */
  preset?: string | null;
}

/**
 * Último tema conhecido, usado como dado inicial da consulta.
 *
 * Sem isso, entre o primeiro paint e a resposta do banco a página fica com a
 * cor padrão do CSS — e, se a consulta rodar antes de a sessão ser restaurada,
 * o resultado pode ser `null` (motivo do "recarregar para aparecer a cor").
 */
const buildInitialTheme = (): ThemeSettings | undefined => {
  const cached = getCachedTheme();
  if (!cached?.palette?.[500]) return undefined;

  return {
    id: "local-cache",
    primary_color: cached.primaryColor,
    color_palette: cached.palette,
    is_active: true,
    created_at: "",
    updated_at: "",
    preset: cached.preset ?? null,
  };
};

type ThemeBootstrapWindow = Window & {
  __themeBootstrap?: Promise<Array<Partial<ThemeSettings>> | null>;
};

let themeBootstrapConsumed = false;

/**
 * Aproveita a consulta que o `index.html` dispara antes do React montar.
 * Devolve `undefined` quando não há bootstrap (ou ele falhou) para seguir com
 * a consulta normal; `null` significa "plataforma sem tema ativo".
 */
const consumeThemeBootstrap = async (): Promise<ThemeSettings | null | undefined> => {
  if (themeBootstrapConsumed || typeof window === "undefined") return undefined;

  const promise = (window as ThemeBootstrapWindow).__themeBootstrap;
  if (!promise) return undefined;

  themeBootstrapConsumed = true;

  try {
    const timeout = new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 4000));
    const rows = await Promise.race([promise, timeout]);

    if (!Array.isArray(rows)) return undefined;
    if (rows.length === 0) return null;

    const row = rows[0];
    if (!row?.color_palette) return undefined;

    return {
      id: row.id ?? "bootstrap",
      primary_color: row.primary_color ?? "",
      color_palette: row.color_palette as ColorPalette,
      is_active: true,
      created_at: row.created_at ?? "",
      updated_at: row.updated_at ?? "",
      preset: (row as { preset?: string | null }).preset ?? null,
    };
  } catch {
    return undefined;
  }
};

export const useTheme = () => {
  const queryClient = useQueryClient();

  // Fetch active theme from database
  const { data: activeTheme, isLoading } = useQuery({
    queryKey: ["activeTheme"],
    queryFn: async () => {
      // Primeira execução: usa a consulta que o index.html já iniciou.
      const bootstrapped = await consumeThemeBootstrap();
      if (bootstrapped !== undefined) return bootstrapped;

      const { data, error } = await supabase
        .from("theme_settings")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data as ThemeSettings | null;
    },
    // Pinta com o último tema conhecido e revalida em segundo plano.
    initialData: buildInitialTheme(),
    initialDataUpdatedAt: 0,
    staleTime: 1000 * 60 * 5, // Cache por 5 minutos
    refetchOnWindowFocus: false, // Não refetch ao focar janela
  });

  // Apply theme and update cache when data changes
  useEffect(() => {
    if (activeTheme?.color_palette) {
      applyThemeToCSSVariables(activeTheme.color_palette, activeTheme.preset);
      // Update localStorage cache for instant loading next time
      cacheTheme(activeTheme.primary_color, activeTheme.color_palette, activeTheme.preset);
    } else if (activeTheme === null) {
      // Explicitly null means no active theme in DB - reset to default
      resetThemeToDefault();
    }
    // Note: if activeTheme is undefined (still loading), we don't do anything
    // because ThemeProvider already applied cached theme
  }, [activeTheme]);

  // Save theme mutation (atomic: nunca deixa a plataforma sem tema ativo)
  const saveThemeMutation = useMutation({
    mutationFn: async ({
      primaryColor,
      colorPalette,
      preset,
    }: {
      primaryColor: string;
      colorPalette: ColorPalette;
      /** Preset global escolhido em Personalização. `null` = paleta manual. */
      preset?: string | null;
    }) => {
      const { data, error } = await supabase.rpc("save_active_theme", {
        p_primary_color: primaryColor,
        p_color_palette: colorPalette,
        p_preset: preset ?? null,
      });

      if (error) throw error;
      return data as ThemeSettings;
    },
    onSuccess: (data) => {
      // Atualiza o cache do React Query na hora: sem janela em que a consulta
      // ainda devolve o tema antigo (ou nenhum) depois de salvar.
      if (data) {
        queryClient.setQueryData(["activeTheme"], data);
        cacheTheme(data.primary_color, data.color_palette, data.preset ?? null);
      }
      queryClient.invalidateQueries({ queryKey: ["activeTheme"] });
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
  const applyPreview = (palette: ColorPalette, preset?: string | null) => {
    applyThemeToCSSVariables(palette, preset ?? null);
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
