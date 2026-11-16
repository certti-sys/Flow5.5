/**
 * Atribuição de tráfego (UTM + click ids).
 *
 * Guardada em `localStorage` por 90 dias porque o visitante costuma chegar na
 * página de vendas e só comprar depois. Não é cookie: não precisa ir ao
 * servidor em cada request, e o checkout lê no momento do POST.
 */

const KEY = "flow:tracking";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** Parâmetros que valem a pena guardar. `src`/`sck` são convenção de afiliado. */
const PARAMS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term",
  "utm_id", "utm_source_platform",
  "fbclid", "gclid", "msclkid", "ttclid", "src", "sck",
] as const;

export type Tracking = Partial<Record<(typeof PARAMS)[number], string>>;

type Stored = { values: Tracking; at: number };

/** Lê a URL atual e acumula o que encontrou. Devolve o estado final. */
export function captureTracking(): Tracking {
  if (typeof window === "undefined") return {};

  const current = getTracking();
  const query = new URLSearchParams(window.location.search);
  const fresh: Tracking = {};

  for (const key of PARAMS) {
    const value = query.get(key);
    if (value) fresh[key] = value.slice(0, 200);
  }

  // Sem parâmetro novo, mantém o que já estava (não apaga a origem).
  if (Object.keys(fresh).length === 0) return current;

  const merged = { ...current, ...fresh };
  try {
    localStorage.setItem(KEY, JSON.stringify({ values: merged, at: Date.now() }));
  } catch {
    // Modo privado / cota cheia: a atribuição é perdida, a compra não.
  }
  return merged;
}

export function getTracking(): Tracking {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.values || Date.now() - (parsed.at ?? 0) > TTL_MS) {
      localStorage.removeItem(KEY);
      return {};
    }
    return parsed.values;
  } catch {
    return {};
  }
}
