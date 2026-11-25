/**
 * Marcações do leitor de PDF.
 *
 * Coordenadas são normalizadas (0..1) sobre a página, não pixels: o mesmo
 * highlight tem que cair no mesmo lugar em 390px e em tela cheia, e o zoom do
 * canvas é livre. Separado do componente para poder ser verificado sem DOM.
 */
export const HIGHLIGHT_COLORS = ["yellow", "green", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export const MAX_HIGHLIGHTS = 500;

export interface Highlight {
  id: string;
  page: number;
  color: HighlightColor;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Classe Tailwind do retângulo. `mix-blend-multiply` deixa o texto aparecer. */
export const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: "bg-yellow-400/45",
  green: "bg-green-400/45",
  pink: "bg-pink-400/45",
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function isHighlightColor(value: unknown): value is HighlightColor {
  return HIGHLIGHT_COLORS.includes(value as HighlightColor);
}

/**
 * Normaliza o que veio do banco. Descarta o que não dá para desenhar em vez de
 * quebrar o leitor inteiro: uma marcação corrompida não pode impedir a leitura.
 */
export function normalizeHighlights(raw: unknown): Highlight[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .flatMap((item): Highlight[] => {
      const id = typeof item.id === "string" ? item.id.slice(0, 64) : "";
      const page = Number(item.page);
      const x = Number(item.x);
      const y = Number(item.y);
      const width = Number(item.width);
      const height = Number(item.height);
      if (!id || !Number.isFinite(page) || page < 1) return [];
      if (![x, y, width, height].every(Number.isFinite)) return [];
      if (!isHighlightColor(item.color)) return [];

      return [{
        id,
        page: Math.floor(page),
        color: item.color,
        x: clamp01(x),
        y: clamp01(y),
        width: clamp01(width),
        height: clamp01(height),
      }];
    })
    .slice(0, MAX_HIGHLIGHTS);
}

/** Retângulo a partir de dois cantos quaisquer (arrastar para cima/esquerda). */
export function rectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

/**
 * Arrasto curto demais é clique, não marcação: com 0,8% a marca some no meio do
 * texto e o aluno acha que o recurso não funcionou.
 */
export const MIN_HIGHLIGHT_SIZE = 0.008;

export function isHighlightable(rect: { width: number; height: number }): boolean {
  return rect.width >= MIN_HIGHLIGHT_SIZE && rect.height >= MIN_HIGHLIGHT_SIZE;
}
