import { createContext, useContext, ReactNode, useEffect } from 'react';
import { usePlatformSettings, PlatformSettings } from '@/hooks/usePlatformSettings';

interface PlatformSettingsContextType {
  settings: Partial<PlatformSettings>;
  isLoading: boolean;
}

const PlatformSettingsContext = createContext<PlatformSettingsContextType | undefined>(undefined);

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

export const PlatformSettingsProvider = ({ children }: { children: ReactNode }) => {
  const { settings, isLoading } = usePlatformSettings();

  // Apply gradient colors to CSS variables when settings change
  useEffect(() => {
    if (settings.gradient_start_color && settings.gradient_end_color) {
      const startHSL = hexToHSL(settings.gradient_start_color);
      const endHSL = hexToHSL(settings.gradient_end_color);

      const root = document.documentElement;
      root.style.setProperty('--gradient-text-start', `${startHSL.h} ${startHSL.s}% ${startHSL.l}%`);
      root.style.setProperty('--gradient-text-end', `${endHSL.h} ${endHSL.s}% ${endHSL.l}%`);
    }
  }, [settings.gradient_start_color, settings.gradient_end_color]);

  // Apply favicon when settings change
  useEffect(() => {
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
  useEffect(() => {
    if (settings.page_title) {
      document.title = settings.page_title;
    }
  }, [settings.page_title]);

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
