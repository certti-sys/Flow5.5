/**
 * Regras do drip content — puras, sem React, para o `npm run check:drip` rodar
 * sem carregar a árvore de componentes.
 */
export type ReleaseMode = "none" | "days" | "date";

export interface ReleaseValue {
  release_after_days: number | null;
  release_at_date: string | null;
}

export const releaseModeOf = (v: ReleaseValue): ReleaseMode =>
  v.release_at_date ? "date" : v.release_after_days ? "days" : "none";

/**
 * Converte o formulário nas duas colunas do banco. Elas são exclusivas (CHECK
 * `*_release_one_mode`): as duas preenchidas era o estado impossível de
 * depurar olhando a linha depois.
 */
export const releaseColumns = (
  mode: ReleaseMode,
  afterDays: string,
  atDate: string,
): ReleaseValue => ({
  release_after_days:
    mode === "days" && Number(afterDays) > 0 ? Number(afterDays) : null,
  release_at_date: mode === "date" && atDate ? atDate : null,
});

/** Texto do aviso de bloqueio: "Disponível em 3 dias", "Disponível em 12/12/2026". */
export const releaseLabel = (availableAt: string | undefined | null): string | null => {
  if (!availableAt) return null;
  const date = new Date(availableAt);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = date.getTime() - Date.now();
  if (diffMs <= 0) return null;

  const days = Math.ceil(diffMs / 86_400_000);
  if (days > 1) return `Disponível em ${days} dias`;
  if (days === 1) return "Disponível em 1 dia";
  return `Disponível às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};
