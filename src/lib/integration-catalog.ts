import { BarChart3, Facebook, FileText, LineChart, MessageSquare, Music2, MousePointerClick, Code2, Radio, Tags } from "lucide-react";

/**
 * Catálogo de integrações disponíveis.
 *
 * Fixo no código, não no banco: cada app tem contrato próprio (header de
 * autenticação, formato de payload), então um app novo é código novo, não
 * configuração. O banco guarda só credencial e estado.
 */

export type IntegrationKind =
  | "utmify"
  | "spedy"
  | "integrax"
  | "pixel_meta"
  | "pixel_x"
  | "pixel_tiktok"
  | "pixel_google_ads"
  | "pixel_ga4"
  | "pixel_gtm"
  | "pixel_script";

export type FieldType = "text" | "password" | "select" | "textarea" | "multiselect" | "flags";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: Array<{ value: string; label: string; help?: string }>;
  /** Para `flags`: valor inicial de cada chave. */
  defaults?: Record<string, boolean>;
  /** `secret` vai para a coluna oculta, o resto para `config`. */
  secret?: boolean;
};

export type CatalogEntry = {
  kind: IntegrationKind;
  name: string;
  description: string;
  icon: typeof BarChart3;
  accent: string;
  /** `server` = fila + edge function; `browser` = script no checkout. */
  mode: "server" | "browser";
  /**
   * `single` = uma conexão por app (reconectar atualiza a mesma linha).
   * `list` = várias conexões do mesmo app, cada uma com nome próprio.
   */
  cardinality?: "single" | "list";
  fields: Field[];
};

/**
 * Comportamento do Purchase por pixel. Vem do sistema de referência e existe
 * porque o mesmo evento pode ser contado em dois momentos (cobrança gerada e
 * pagamento aprovado) e o order bump infla o valor da conversão.
 */
const PIXEL_FLAGS: Field = {
  key: "flags",
  label: "Comportamento do Purchase",
  type: "flags",
  defaults: {
    fire_purchase_on_pix: true,
    fire_purchase_on_boleto: true,
    disable_order_bump_events: false,
  },
  options: [
    {
      value: "fire_purchase_on_pix",
      label: "Disparar Purchase quando o PIX é gerado",
      help: "Desligue se a loja só conta a venda depois da aprovação.",
    },
    {
      value: "fire_purchase_on_boleto",
      label: "Disparar Purchase quando o boleto é gerado",
      help: "Mesmo critério, para boleto.",
    },
    {
      value: "disable_order_bump_events",
      label: "Ignorar order bump no valor da conversão",
      help: "O Purchase sai só com o produto principal.",
    },
  ],
};

export const CATALOG: CatalogEntry[] = [
  {
    kind: "utmify",
    name: "UTMfy",
    description: "Envia pedidos e atribuição de tráfego para o painel da UTMfy.",
    icon: BarChart3,
    accent: "text-emerald-400",
    mode: "server",
    cardinality: "single",
    fields: [
      {
        key: "secret",
        label: "API Token",
        type: "password",
        secret: true,
        placeholder: "x-api-token",
        help: "Painel da UTMfy → Integrações → Credenciais.",
      },
    ],
  },
  {
    kind: "pixel_meta",
    name: "Meta Pixel",
    description: "Purchase e Lead server-side via Conversions API, com deduplicação.",
    icon: Facebook,
    accent: "text-blue-400",
    mode: "server",
    cardinality: "list",
    fields: [
      { key: "pixel_id", label: "Pixel ID", type: "text", placeholder: "123456789012345" },
      {
        key: "secret",
        label: "Access Token",
        type: "password",
        secret: true,
        help: "Gere em Events Manager → Configurações → Conversions API.",
      },
    ],
  },
  {
    kind: "spedy",
    name: "Spedy",
    description: "Emite nota fiscal automaticamente a cada pedido pago.",
    icon: FileText,
    accent: "text-violet-400",
    mode: "server",
    cardinality: "single",
    fields: [
      { key: "secret", label: "API Key", type: "password", secret: true },
      {
        key: "environment",
        label: "Ambiente",
        type: "select",
        options: [
          { value: "production", label: "Produção" },
          { value: "sandbox", label: "Sandbox" },
        ],
      },
    ],
  },
  {
    kind: "integrax",
    name: "IntegraX",
    description: "Envia SMS de PIX gerado e de entrega de acesso. Máximo de 160 caracteres por mensagem.",
    icon: MessageSquare,
    accent: "text-cyan-400",
    mode: "server",
    cardinality: "single",
    fields: [
      {
        key: "secret",
        label: "Token da API",
        type: "password",
        secret: true,
        placeholder: "Token do painel IntegraX",
        help: "O texto de cada SMS é configurado por produto, no editor de checkout.",
      },
    ],
  },
  {
    kind: "pixel_x",
    name: "Pixel X",
    description: "Postback próprio da Pixel X, com status nativo e eventos selecionáveis.",
    icon: Radio,
    accent: "text-rose-400",
    mode: "server",
    cardinality: "list",
    fields: [
      { key: "name", label: "Nome", type: "text", placeholder: "Ex: Pixel X - Curso CSS" },
      { key: "url", label: "URL do webhook", type: "text", placeholder: "https://..." },
      { key: "secret", label: "Token", type: "password", secret: true },
      {
        key: "events",
        label: "Eventos",
        type: "multiselect",
        options: [
          { value: "pedido_pago", label: "Pedido pago" },
          { value: "pagamento_recusado", label: "Pagamento recusado" },
          { value: "reembolso", label: "Reembolso" },
          { value: "pix_gerado", label: "Pix gerado" },
          { value: "boleto_gerado", label: "Boleto gerado" },
        ],
        help: "Sem seleção, todos os eventos são enviados.",
      },
    ],
  },
  {
    kind: "pixel_tiktok",
    name: "TikTok Pixel",
    description: "Eventos de conversão no navegador do visitante.",
    icon: Music2,
    accent: "text-pink-400",
    mode: "browser",
    cardinality: "list",
    fields: [
      { key: "pixel_id", label: "Pixel ID", type: "text", placeholder: "CXXXXXXXXXXXXXX" },
      PIXEL_FLAGS,
    ],
  },
  {
    kind: "pixel_google_ads",
    name: "Google Ads",
    description: "Conversões de compra para o Google Ads.",
    icon: MousePointerClick,
    accent: "text-amber-400",
    mode: "browser",
    cardinality: "list",
    fields: [
      { key: "conversion_id", label: "Conversion ID", type: "text", placeholder: "AW-123456789" },
      {
        key: "label",
        label: "Conversion Label",
        type: "text",
        placeholder: "AbC-D_efG",
        help: "Opcional. Sem ele o evento ainda é enviado.",
      },
      PIXEL_FLAGS,
    ],
  },
  {
    kind: "pixel_ga4",
    name: "Google Analytics 4",
    description: "Funil de checkout e compras no GA4.",
    icon: LineChart,
    accent: "text-orange-400",
    mode: "browser",
    cardinality: "list",
    fields: [
      { key: "measurement_id", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX" },
      PIXEL_FLAGS,
    ],
  },
  {
    kind: "pixel_gtm",
    name: "Google Tag Manager",
    description: "Envia o funil do checkout para o dataLayer do contêiner GTM.",
    icon: Tags,
    accent: "text-sky-400",
    mode: "browser",
    cardinality: "list",
    fields: [
      {
        key: "container_id",
        label: "Container ID",
        type: "text",
        placeholder: "GTM-XXXXXXX",
        help: "O contêiner precisa ter as tags de conversão; o dataLayer manda page_view, begin_checkout, add_payment_info e purchase.",
      },
    ],
  },
  {
    kind: "pixel_script",
    name: "Script personalizado",
    description: "HTML injetado nas páginas de checkout e obrigado.",
    icon: Code2,
    accent: "text-white/70",
    mode: "browser",
    fields: [
      {
        key: "head_script",
        label: "Código",
        type: "textarea",
        placeholder: "<script>...</script>",
        help: "Executa no carregamento da página. Use apenas código de sua confiança.",
      },
    ],
  },
];

export function catalogEntry(kind: string): CatalogEntry | undefined {
  return CATALOG.find((c) => c.kind === kind);
}
