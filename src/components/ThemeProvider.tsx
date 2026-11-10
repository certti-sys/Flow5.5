import { useEffect, useLayoutEffect } from "react";
import { useTheme } from "@/hooks/useTheme";
import { getCachedTheme, applyThemeToCSSVariables } from "@/lib/colorGenerator";

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
  // Apply cached theme again in useLayoutEffect as a safety net
  // useLayoutEffect runs synchronously before browser paint
  useLayoutEffect(() => {
    const cached = getCachedTheme();
    if (cached?.palette) {
      applyThemeToCSSVariables(cached.palette);
    }
  }, []);

  // useTheme hook fetches from Supabase and will update if theme changed
  // This runs in background and updates cache if needed
  useTheme();
  
  return <>{children}</>;
};
