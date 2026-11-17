import { createContext, useContext, ReactNode, useLayoutEffect } from 'react';
import { usePlatformSettings, PlatformSettings } from '@/hooks/usePlatformSettings';

interface PlatformSettingsContextType {
  settings: Partial<PlatformSettings>;
  isLoading: boolean;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextType | undefined>(undefined);

const GRADIENT_CACHE_KEY = 'brandingGradient';

// Function to convert HEX to HSL
const hexToHSL = (hex: string): { h: number; s: number; l: number } => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
};

const toCssHsl = (hex: string): string | null => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return null;
  const { h, s, l } = hexToHSL(hex);
  return `${h} ${s}% ${l}%`;
};

export const PlatformSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { settings, isLoading } = usePlatformSettings();

  // Apply gradient colors to CSS variables when settings change.
  // useLayoutEffect: antes do paint. E não aplica enquanto carrega, senão o
  // valor de `defaultSettings` (#FF4136/#FF851B) pisca antes da cor real.
  useLayoutEffect(() => {
    if (isLoading) return;

    const root = document.documentElement;
    const start = settings.gradient_start_color ? toCssHsl(settings.gradient_start_color) : null;
    const end = settings.gradient_end_color ? toCssHsl(settings.gradient_end_color) : null;

    if (start && end) {
      root.style.setProperty('--gradient-text-start', start);
      root.style.setProperty('--gradient-text-end', end);
      // Cache para o script inline do index.html aplicar antes do React.
      try {
        localStorage.setItem(GRADIENT_CACHE_KEY, JSON.stringify({ start, end }));
      } catch {
        // localStorage pode estar indisponível
      }
    } else {
      root.style.removeProperty('--gradient-text-start');
      root.style.removeProperty('--gradient-text-end');
      try {
        localStorage.removeItem(GRADIENT_CACHE_KEY);
      } catch {
        // localStorage pode estar indisponível
      }
    }
  }, [isLoading, settings.gradient_start_color, settings.gradient_end_color]);

  // Apply favicon when settings change
  useLayoutEffect(() => {
    if (settings.favicon_url) {
      // Find existing favicon link or create new ones
      const existingFavicons = document.querySelectorAll("link[rel*='icon']");
      existingFavicons.forEach(el => el.remove());

      const link = document.createElement('link');
      link.type = 'image/png';
      link.rel = 'icon';
      link.href = settings.favicon_url;
      document.head.appendChild(link);

      // Apple Touch Icon
      const appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = settings.favicon_url;
      document.head.appendChild(appleLink);
    }
  }, [settings.favicon_url]);

  // Apply page title
  useLayoutEffect(() => {
    if (!isLoading && settings.page_title) {
      document.title = settings.page_title;
    }
  }, [isLoading, settings.page_title]);

  return (
    <PlatformSettingsContext.Provider value={{ settings, isLoading }}>
      {children}
    </PlatformSettingsContext.Provider>
  );
};

export const usePlatformSettingsContext = () => {
  const context = useContext(PlatformSettingsContext);
  if (context === undefined) {
    throw new Error('usePlatformSettingsContext must be used within PlatformSettingsProvider');
  }
  return context;
};
