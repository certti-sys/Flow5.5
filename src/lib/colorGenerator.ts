import { findThemePreset } from '@/types/theme-presets';

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
 * Texto legível (branco ou quase-preto, em HSL) para uma cor de fundo em HEX.
 * Usado quando a cor vem de config por produto e não da paleta do tema.
 */
export function readableTextOn(hex: string): string {
    const normalized = hex.replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return '0 0% 100%';

    const [r, g, b] = [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255);
    const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const contrast = (x: number) => (Math.max(x, lum) + 0.05) / (Math.min(x, lum) + 0.05);

    return contrast(1) >= contrast(0.01) ? '0 0% 100%' : '240 10% 10%';
}

/**
 * Escolhe texto claro ou escuro para ficar sobre a cor informada,
 * comparando a razão de contraste WCAG dos dois candidatos.
 * Exportada também para o preset do checkout reaproveitar a regra.
 */
export function readableForeground(hsl: string): string {
  const [h, s, l] = hsl.split(' ').map((v) => parseFloat(v));
  // HSL -> luminância relativa
  const sat = s / 100;
  const light = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lum = 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4));
  const ratio = (x: number) => (Math.max(x, lum) + 0.05) / (Math.min(x, lum) + 0.05);
  // luminância de branco = 1, de quase-preto (240 10% 10%) ≈ 0.01
  return ratio(1) >= ratio(0.01) ? '0 0% 100%' : '240 10% 10%';
}

/**
 * Tokens que um preset pode escrever. Guardados aqui para que o reset saiba
 * exatamente o que remover do `:root`.
 */
const PRESET_TOKENS: string[] = [
  '--background', '--foreground',
  '--card', '--card-foreground',
  '--popover', '--popover-foreground',
  '--primary', '--primary-foreground',
  '--secondary', '--secondary-foreground',
  '--muted', '--muted-foreground',
  '--accent', '--accent-foreground',
  '--destructive', '--destructive-foreground',
  '--border', '--input', '--ring',
  '--radius', '--radius-xl', '--radius-2xl', '--radius-3xl',
  '--sidebar-background', '--sidebar-foreground', '--sidebar-border',
  '--sidebar-primary', '--sidebar-ring', '--sidebar-accent',
  '--sidebar-accent-foreground',
];

/**
 * Raios derivados do preset. `--radius` é o raio base (sidebar, botões) e os
 * `--radius-xl/2xl/3xl` são os cards, que o Tailwind lê em `borderRadius`.
 */
export function presetRadiusVariables(radius: string | null | undefined): Record<string, string> {
  if (!radius) return {};
  return {
    '--radius': radius,
    '--radius-xl': radius,
    '--radius-2xl': `calc(${radius} + 4px)`,
    '--radius-3xl': `calc(${radius} + 12px)`,
  };
}

/**
 * Variáveis de CSS de um preset global.
 *
 * Devolve mapa vazio quando não há preset — o `:root` do `index.css` continua
 * valendo. A paleta usada é sempre a escura: a plataforma não alterna
 * claro/escuro.
 */
export function buildPresetVariables(presetId: string | null | undefined): Record<string, string> {
  const preset = findThemePreset(presetId);
  if (!preset) return {};

  const vars: Record<string, string> = { ...preset.dark };

  const primary = preset.dark['--primary'];
  if (primary) {
    const h = primary.split(' ')[0];
    vars['--primary-foreground'] = readableForeground(primary);
    // Tokens derivados que não vêm do preset: sidebar e brilho do gradiente
    // precisam seguir a cor do preset, senão ficam na cor manual antiga.
    vars['--sidebar-primary'] = primary;
    vars['--sidebar-ring'] = primary;
    vars['--sidebar-accent'] = preset.dark['--accent'] ?? primary;
    vars['--gradient-primary'] = `linear-gradient(135deg, hsl(${primary}) 0%, hsl(${h} 95% 55%) 100%)`;
    vars['--shadow-glow'] = `0 0 40px hsl(${primary} / 0.3)`;
  }

  // Sidebar: o preset não define tokens próprios, então ela é derivada do card
  // (tom um degrau acima do fundo, como no tema padrão). Sem isso, a sidebar
  // ficava sempre na cor fixa do `:root` e destoava do resto da tela.
  const sidebarBg = preset.dark['--card'] ?? preset.dark['--background'];
  if (sidebarBg) vars['--sidebar-background'] = sidebarBg;
  if (preset.dark['--foreground']) vars['--sidebar-foreground'] = preset.dark['--foreground'];
  vars['--sidebar-border'] = preset.dark['--border'] ?? preset.dark['--muted'] ?? sidebarBg ?? '240 5% 15%';
  vars['--sidebar-accent-foreground'] =
    preset.dark['--accent-foreground'] ?? preset.dark['--foreground'] ?? '0 0% 100%';

  if (preset.radius) Object.assign(vars, presetRadiusVariables(preset.radius));
  if (preset.font) vars['--preset-font'] = preset.font;

  return vars;
}

/**
 * Mapeia a paleta para as variáveis CSS do tema.
 *
 * Existe separado de `applyThemeToCSSVariables` porque o mesmo conjunto é
 * gravado no cache local e aplicado pelo script inline do `index.html` antes
 * do React montar (evita o flash de cor padrão).
 *
 * Com `presetId`, o preset vence a paleta: é a aplicação global escolhida em
 * Personalização (admin, área de membros e aulas).
 */
export function buildThemeVariables(
  palette: ColorPalette,
  presetId?: string | null,
): Record<string, string> {
  if (findThemePreset(presetId)) return buildPresetVariables(presetId);

  const h = palette[500].split(' ')[0];

  const vars: Record<string, string> = {
    '--primary': palette[500],
    '--accent': palette[500],
    '--ring': palette[500],
    '--primary-foreground': readableForeground(palette[500]),
    '--gradient-primary': `linear-gradient(135deg, hsl(${palette[500]}) 0%, hsl(${h} 95% 55%) 100%)`,
    '--shadow-glow': `0 0 40px hsl(${palette[500]} / 0.3)`,
    // Sidebar (hover/active states)
    '--sidebar-primary': palette[500],
    '--sidebar-ring': palette[500],
    '--sidebar-accent': palette[700],
  };

  // All shades for potential future use
  Object.entries(palette).forEach(([shade, value]) => {
    vars[`--primary-${shade}`] = value;
  });

  return vars;
}

/**
 * Apply theme palette to CSS variables. Com `presetId`, o preset global vence.
 */
export function applyThemeToCSSVariables(palette: ColorPalette, presetId?: string | null): void {
  const root = document.documentElement;
  if (!findThemePreset(presetId)) {
    // Um preset aplicado antes deixaria tokens "presos" no :root.
    for (const token of PRESET_TOKENS) root.style.removeProperty(token);
    root.style.removeProperty('--preset-font');
  }
  Object.entries(buildThemeVariables(palette, presetId)).forEach(([name, value]) => {
    root.style.setProperty(name, value);
  });

  // Cor manual da plataforma em variáveis próprias: o checkout público usa
  // essas (e não `--primary`) para continuar com as cores do produto mesmo
  // quando um preset global está ativo.
  root.style.setProperty('--platform-manual-primary', palette[500]);
  root.style.setProperty('--platform-manual-primary-foreground', readableForeground(palette[500]));
  root.style.setProperty('--platform-manual-accent', palette[500]);
  root.style.setProperty('--platform-manual-ring', palette[500]);
}

const THEME_CACHE_KEY = 'activeTheme';

/**
 * Save theme to localStorage for instant loading on next page load
 */
export function cacheTheme(
  primaryColor: string,
  palette: ColorPalette,
  presetId?: string | null,
): void {
  try {
    localStorage.setItem(
      THEME_CACHE_KEY,
      JSON.stringify({
        primaryColor,
        palette,
        preset: presetId ?? null,
        vars: buildThemeVariables(palette, presetId),
      }),
    );
  } catch (e) {
    // localStorage may be unavailable in some contexts
    console.warn('Could not cache theme:', e);
  }
}

/**
 * Get cached theme from localStorage (returns null if not cached)
 */
export function getCachedTheme(): {
  primaryColor: string;
  palette: ColorPalette;
  preset?: string | null;
} | null {
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
  root.style.removeProperty('--primary-foreground');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--ring');
  root.style.removeProperty('--gradient-primary');
  root.style.removeProperty('--shadow-glow');

  // Preset global antes aplicado neste navegador
  for (const token of PRESET_TOKENS) root.style.removeProperty(token);
  root.style.removeProperty('--preset-font');
  
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
