export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

/**
 * Convert HEX color to HSL format
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Convert to RGB
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert HSL to string format for CSS
 */
export function hslToString(h: number, s: number, l: number): string {
  return `${h} ${s}% ${l}%`;
}

/**
 * Convert HSL string to HEX color
 */
export function hslToHex(hslString: string): string {
  // Parse HSL string (format: "h s% l%")
  const parts = hslString.split(' ');
  const h = parseInt(parts[0]);
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2]) / 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0;
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x;
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c;
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c;
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Calculate luminance to determine if text should be light or dark
 */
export function getContrastColor(hslString: string): string {
  // Parse HSL and calculate luminance
  const parts = hslString.split(' ');
  const l = parseInt(parts[2]);
  
  // Use lightness as simple heuristic: below 60% use white text, above use black
  return l < 60 ? '#ffffff' : '#000000';
}

/**
 * Generate a complete color palette (50-950) from a single color
 * Based on the UIColors.app algorithm
 */
export function generatePalette(hexColor: string): ColorPalette {
  const { h, s } = hexToHSL(hexColor);
  
  // Lightness values for each shade (based on Tailwind's scale)
  const lightnessMap = {
    50: 97,
    100: 94,
    200: 87,
    300: 77,
    400: 62,
    500: 50,  // Base color
    600: 45,
    700: 38,
    800: 28,
    900: 21,
    950: 12
  };
  
  // Saturation adjustments for better looking colors
  const saturationMultipliers = {
    50: 0.9,
    100: 0.95,
    200: 0.98,
    300: 1.0,
    400: 1.0,
    500: 1.0,
    600: 0.95,
    700: 0.9,
    800: 0.85,
    900: 0.8,
    950: 0.75
  };
  
  const palette: ColorPalette = {} as ColorPalette;
  
  Object.entries(lightnessMap).forEach(([shade, lightness]) => {
    const shadeKey = parseInt(shade) as keyof ColorPalette;
    const satMultiplier = saturationMultipliers[shadeKey];
    const adjustedSat = Math.round(s * satMultiplier);
    
    palette[shadeKey] = hslToString(h, adjustedSat, lightness);
  });
  
  return palette;
}

/**
 * Apply theme palette to CSS variables
 */
export function applyThemeToCSSVariables(palette: ColorPalette): void {
  const root = document.documentElement;
  
  // Apply primary color (500 is the base)
  root.style.setProperty('--primary', palette[500]);
  root.style.setProperty('--accent', palette[500]);
  root.style.setProperty('--ring', palette[500]);
  
  // Apply all shades for potential future use
  Object.entries(palette).forEach(([shade, value]) => {
    root.style.setProperty(`--primary-${shade}`, value);
  });
  
  // Update gradient with new colors
  const h = palette[500].split(' ')[0];
  const gradient = `linear-gradient(135deg, hsl(${palette[500]}) 0%, hsl(${h} 95% 55%) 100%)`;
  root.style.setProperty('--gradient-primary', gradient);
  
  // Update shadow glow with new color
  root.style.setProperty('--shadow-glow', `0 0 40px hsl(${palette[500]} / 0.3)`);
  
  // Apply colors to Sidebar (hover/active states)
  root.style.setProperty('--sidebar-primary', palette[500]);
  root.style.setProperty('--sidebar-ring', palette[500]);
  root.style.setProperty('--sidebar-accent', palette[700]);
}

const THEME_CACHE_KEY = 'activeTheme';

/**
 * Save theme to localStorage for instant loading on next page load
 */
export function cacheTheme(primaryColor: string, palette: ColorPalette): void {
  try {
    localStorage.setItem(THEME_CACHE_KEY, JSON.stringify({ primaryColor, palette }));
  } catch (e) {
    // localStorage may be unavailable in some contexts
    console.warn('Could not cache theme:', e);
  }
}

/**
 * Get cached theme from localStorage (returns null if not cached)
 */
export function getCachedTheme(): { primaryColor: string; palette: ColorPalette } | null {
  try {
    const cached = localStorage.getItem(THEME_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    // localStorage may be unavailable in some contexts
    console.warn('Could not read cached theme:', e);
  }
  return null;
}

/**
 * Clear cached theme from localStorage
 */
export function clearThemeCache(): void {
  try {
    localStorage.removeItem(THEME_CACHE_KEY);
  } catch (e) {
    console.warn('Could not clear theme cache:', e);
  }
}

/**
 * Reset theme to default (orange)
 */
export function resetThemeToDefault(): void {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--gradient-primary');
  root.style.removeProperty('--shadow-glow');
  
  // Remove sidebar variables
  root.style.removeProperty('--sidebar-primary');
  root.style.removeProperty('--sidebar-accent');
  root.style.removeProperty('--sidebar-ring');
  
  // Remove all shade variables
  for (let i = 50; i <= 950; i += (i < 100 ? 50 : i < 200 ? 100 : i < 900 ? 100 : 50)) {
    root.style.removeProperty(`--primary-${i}`);
  }
  
  // Clear localStorage cache
  clearThemeCache();
}
