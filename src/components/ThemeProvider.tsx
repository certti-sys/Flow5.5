import { useEffect, useLayoutEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { getCachedTheme, applyThemeToCSSVariables } from "@/lib/colorGenerator";
import { supabase } from "@/integrations/supabase/client";

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Apply cached theme immediately on module load (before React even starts rendering)
// This is the key to eliminating the flash - it runs synchronously
const applyCachedThemeImmediately = () => {
  const cached = getCachedTheme();
  if (cached?.palette) {
    applyThemeToCSSVariables(cached.palette);
  }
};

// Execute immediately when this module is loaded
applyCachedThemeImmediately();

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const queryClient = useQueryClient();

  // Apply cached theme again in useLayoutEffect as a safety net
  // useLayoutEffect runs synchronously before browser paint
  useLayoutEffect(() => {
    const cached = getCachedTheme();
    if (cached?.palette) {
      applyThemeToCSSVariables(cached.palette);
    }
  }, []);

  // Login/logout mudam o que a consulta enxerga. Sem isso, uma resposta
  // obtida antes da sessão ser restaurada ficava em cache por 5 minutos e a
  // cor configurada só aparecia depois de recarregar a página.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        queryClient.invalidateQueries({ queryKey: ["activeTheme"] });
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // useTheme hook fetches from Supabase and will update if theme changed
  // This runs in background and updates cache if needed
  useTheme();

  return <>{children}</>;
};
