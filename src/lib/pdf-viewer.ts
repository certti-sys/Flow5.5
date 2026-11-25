/**
 * Passo de zoom do leitor de PDF.
 *
 * Separado do componente para poder ser verificado sem DOM: os degraus são
 * fixos, então "aumentar" a partir de uma escala arbitrária (ex.: 1.1 por
 * ajuste anterior) tem que cair no próximo degrau, não em `1.1 + 0.25`.
 */
export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export function nextZoom(current: number, direction: 1 | -1): number {
  if (direction === 1) {
    return ZOOM_STEPS.find((z) => z > current) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  }
  return [...ZOOM_STEPS].reverse().find((z) => z < current) ?? ZOOM_STEPS[0];
}
