/**
 * Design Tokens - Flows5.5
 * Sistema de design centralizado baseado em Refactoring UI
 * 
 * TODOS os componentes devem usar esses tokens para garantir consistência visual.
 */

export const colors = {
  // Neutros (sem cinzas puros - todos levemente tintados)
  neutral: {
    50: "245 246 250",   // Quase branco com leve tom azulado
    100: "238 240 244",
    200: "218 222 230",
    300: "194 201 210",
    400: "156 165 178",
    500: "120 130 145",
    600: "87 99 115",
    700: "58 68 80",
    800: "35 43 52",
    900: "20 25 32",
    950: "10 13 18",
  },
  
  // Primário (azul profundo)
  primary: {
    50: "237 242 253",
    100: "221 232 249",
    200: "191 209 244",
    300: "154 180 237",
    400: "115 149 230",
    500: "59 130 246",    // Azul base
    600: "37 99 235",
    700: "29 78 216",
    800: "24 64 183",
    900: "19 55 148",
    950: "8 32 101",
  },
  
  // Semânticos
  success: {
    50: "239 249 240",
    100: "217 243 223",
    200: "187 232 205",
    300: "143 216 178",
    400: "95 198 151",
    500: "34 197 94",
    600: "22 163 74",
    700: "21 128 61",
    800: "19 103 49",
    900: "16 83 39",
    950: "7 54 24",
  },
  
  warning: {
    50: "254 246 230",
    100: "253 238 212",
    200: "251 223 180",
    300: "248 200 138",
    400: "244 172 88",
    500: "234 126 34",
    600: "217 91 2",
    700: "178 71 1",
    800: "145 56 1",
    900: "120 46 1",
    950: "69 23 0",
  },
  
  error: {
    50: "253 240 240",
    100: "252 231 231",
    200: "250 206 206",
    300: "245 164 164",
    400: "239 112 112",
    500: "230 64 64",
    600: "200 48 48",
    700: "174 40 40",
    800: "142 36 36",
    900: "114 29 29",
    950: "67 16 16",
  },
  
  info: {
    50: "239 246 255",
    100: "221 236 254",
    200: "187 216 252",
    300: "148 187 248",
    400: "98 148 244",
    500: "59 130 246",
    600: "37 99 235",
    700: "29 78 216",
    800: "24 64 183",
    900: "19 55 148",
    950: "8 32 101",
  },
  
  // Texto em camadas (3 níveis de importância)
  text: {
    primary: "20 25 32",     // Conteúdo principal
    secondary: "87 99 115",  // Conteúdo secundário
    tertiary: "156 165 178", // Rótulos, metadados
    inverse: "255 255 255",  // Texto sobre fundo escuro
    inverseSecondary: "194 201 210", // Texto secundário sobre fundo escuro
  },
  
  // Backgrounds
  bg: {
    base: "20 25 32",      // Fundo principal
    elevated: "35 43 52",  // Elementos elevados
    surface: "58 68 80",   // Superfícies secundárias
    overlay: "0 0 0 / 0.5", // Overlay para modais e imagens
  },
};

/**
 * Escala de espaçamento baseada em Refactoring UI
 */
export const spacing = {
  0: "0",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  6: "24px",
  8: "32px",
  12: "48px",
  16: "64px",
};

/**
 * Escala tipográfica
 */
export const typography = {
  // Tamanhos
  xs: "12px",   // Rótulos pequenos, metadados
  sm: "14px",   // Legendas, inputs, captions
  base: "16px", // Corpo de texto padrão
  lg: "18px",   // Subtítulos, inputs importantes
  xl: "20px",   // Títulos de seção
  "2xl": "24px", // Títulos de página
  "3xl": "30px", // Títulos de hero
  "4xl": "36px", // Títulos principais
  
  // Pesos
  weight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Altura de linha
  leading: {
    tight: "1.25",    // Títulos
    normal: "1.5",    // Corpo de texto
    relaxed: "1.75",  // Texto longo
  },
};

/**
 * Escala de sombras
 */
export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.05)",    // Botões, inputs
  md: "0 4px 6px rgba(0,0,0,0.1)",     // Cards, inputs
  lg: "0 10px 15px rgba(0,0,0,0.1)",   // Dropdowns
  xl: "0 20px 25px rgba(0,0,0,0.15)",  // Modais
  "2xl": "0 25px 50px rgba(0,0,0,0.2)", // Diálogos grandes
};

/**
 * Ícones por contexto
 */
export const icons = {
  xs: "w-4 h-4",      // Ícones inline, botões pequenos
  sm: "w-5 h-5",      // Ícones de navegação, badges
  md: "w-6 h-6",      // Ícones de barra lateral, cards
  lg: "w-8 h-8",      // Ícones de destaque, hero
};