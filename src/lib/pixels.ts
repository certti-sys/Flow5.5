/**
 * Pixels de conversão carregados no navegador do visitante.
 *
 * O catálogo (kinds de navegador) vem do banco pela RPC `get_public_integrations`,
 * porque o checkout roda sem sessão e `integrations` é só de admin.
 *
 * Tudo é idempotente: cada script é injetado uma vez por página, e o evento só
 * dispara depois que o script carregou — senão o `ttq`/`gtag` ainda não existe.
 */

import { supabase } from "@/integrations/supabase/client";

type Kind = "pixel_tiktok" | "pixel_google_ads" | "pixel_ga4" | "pixel_script";

type PublicIntegration = { kind: Kind; config: Record<string, any> };

export type PixelEvent =
  | { name: "PageView" }
  | { name: "InitiateCheckout"; value?: number; currency?: string; contentIds?: string[] }
  | { name: "AddPaymentInfo"; value?: number; currency?: string }
  | { name: "Purchase"; value: number; currency: string; contentIds?: string[]; orderId: string; productName?: string };

/** Centavos → reais. Pixels só entendem valor decimal. */
const brl = (cents?: number) => (cents ?? 0) / 100;

const loaded = new Set<Kind>();

function injectScript(src: string, attrs: Record<string, string> = {}): void {
  if (document.querySelector(`script[data-flow-pixel="${src}"]`)) return;
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  el.dataset.flowPixel = src;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.head.appendChild(el);
}

function inlineScript(code: string, id: string): void {
  if (document.getElementById(id)) return;
  // Scripts criados por `createElement` + `textContent` executam ao serem
  // anexados; `<script>` vindo de `innerHTML` não executa. O HTML vem de um
  // admin autenticado, e a CSP já permite inline.
  const holder = document.createElement("div");
  holder.id = id;
  holder.style.display = "none";

  const template = document.createElement("template");
  template.innerHTML = code;

  for (const node of Array.from(template.content.childNodes)) {
    if (node.nodeName !== "SCRIPT") {
      holder.appendChild(node);
      continue;
    }
    const original = node as HTMLScriptElement;
    const script = document.createElement("script");
    for (const attr of Array.from(original.attributes)) {
      script.setAttribute(attr.name, attr.value);
    }
    if (original.src) script.src = original.src;
    else script.textContent = original.textContent;
    holder.appendChild(script);
  }

  document.head.appendChild(holder);
}

// ---------------------------------------------------------------------------
// TikTok
// ---------------------------------------------------------------------------

function loadTikTok(pixelId: string) {
  if (!pixelId || loaded.has("pixel_tiktok")) return;
  loaded.add("pixel_tiktok");

  // Snippet oficial do TikTok. Não dá para simplificar: o `events.js` é
  // carregado pelo próprio `ttq.load`, com `sdkid` na query.
  const snippet = `
!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
ttq.load(${JSON.stringify(pixelId)});ttq.page();
}(window, document, "ttq");
`;

  const script = document.createElement("script");
  script.textContent = snippet;
  document.head.appendChild(script);
}

// ---------------------------------------------------------------------------
// GA4 / Google Ads
// ---------------------------------------------------------------------------

let gtagScriptLoaded = false;

function ensureGtag(id: string) {
  if (!(window as any).dataLayer) (window as any).dataLayer = [];
  (window as any).gtag =
    (window as any).gtag ||
    function (...args: unknown[]) {
      (window as any).dataLayer.push(args);
    };
  if (gtagScriptLoaded) return;
  gtagScriptLoaded = true;
  injectScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
}

function loadGa4(measurementId: string) {
  if (!measurementId) return;
  ensureGtag(measurementId);
  (window as any).gtag("js", new Date());
  (window as any).gtag("config", measurementId, { send_page_view: false });
}

function loadGoogleAds(conversionId: string) {
  if (!conversionId) return;
  ensureGtag(conversionId);
  (window as any).gtag("config", conversionId);
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

let current: PublicIntegration[] = [];

/** Lê a configuração pública e injeta os scripts. Retorna os ativos. */
export async function initPixels(productId?: string | null): Promise<PublicIntegration[]> {
  try {
    const { data, error } = await (supabase as any).rpc("get_public_integrations", {
      p_product_id: productId ?? null,
    });
    if (error || !data) return [];
    current = data as PublicIntegration[];
  } catch {
    return [];
  }

  for (const integration of current) {
    const cfg = integration.config ?? {};
    switch (integration.kind) {
      case "pixel_tiktok":
        loadTikTok(cfg.pixel_id);
        break;
      case "pixel_google_ads":
        loadGoogleAds(cfg.conversion_id);
        break;
      case "pixel_ga4":
        loadGa4(cfg.measurement_id);
        break;
      case "pixel_script":
        if (cfg.head_script) inlineScript(String(cfg.head_script), "flow-custom-pixel");
        break;
    }
  }

  return current;
}

export function trackPixel(event: PixelEvent): void {
  if (current.length === 0) return;

  for (const integration of current) {
    const cfg = integration.config ?? {};

    if (integration.kind === "pixel_tiktok") {
      const ttq = (window as any).ttq;
      if (!ttq) continue;
      if (event.name === "PageView") {
        ttq.page();
        continue;
      }
      const map: Record<string, string> = {
        InitiateCheckout: "InitiateCheckout",
        AddPaymentInfo: "AddPaymentInfo",
        Purchase: "CompletePayment",
      };
      ttq.track(map[event.name], {
        value: brl("value" in event ? event.value : 0),
        currency: "currency" in event ? event.currency ?? "BRL" : "BRL",
        content_id: "contentIds" in event ? event.contentIds?.[0] : undefined,
        content_type: "product",
      });
      continue;
    }

    if (integration.kind === "pixel_google_ads") {
      const gtag = (window as any).gtag;
      if (!gtag || event.name !== "Purchase") continue;
      const label = cfg.label ? String(cfg.label) : undefined;
      if (!cfg.conversion_id || !label) continue;
      gtag("event", "conversion", {
        send_to: `${cfg.conversion_id}/${label}`,
        value: brl(event.value),
        currency: event.currency || "BRL",
        transaction_id: event.orderId,
      });
      continue;
    }

    if (integration.kind === "pixel_ga4") {
      const gtag = (window as any).gtag;
      if (!gtag) continue;
      const names: Record<string, string> = {
        PageView: "page_view",
        InitiateCheckout: "begin_checkout",
        AddPaymentInfo: "add_payment_info",
        Purchase: "purchase",
      };
      // GA4 não aceita `page_view` com valor; eventos de e-commerce sim.
      gtag("event", names[event.name], {
        value: "value" in event ? brl(event.value) : undefined,
        currency: "currency" in event ? event.currency : undefined,
        transaction_id: event.name === "Purchase" ? event.orderId : undefined,
        items: "contentIds" in event && event.contentIds
          ? event.contentIds.map((id) => ({ item_id: id, item_name: event.name === "Purchase" ? event.productName : undefined }))
          : undefined,
      });
    }
  }
}
