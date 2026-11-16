import { BarChart3, Facebook, FileText, LineChart, MessageSquare, Music2, MousePointerClick, Code2, Radio } from "lucide-react";

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
  | "pixel_script";

export type FieldType = "text" | "password" | "select" | "textarea" | "multiselect";

export type Field = {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  help?: string;
  options?: Array<{ value: string; label: string }>;
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
    fields: [{ key: "pixel_id", label: "Pixel ID", type: "text", placeholder: "CXXXXXXXXXXXXXX" }],
  },
  {
    kind: "pixel_google_ads",
    name: "Google Ads",
    description: "Conversões de compra para o Google Ads.",
    icon: MousePointerClick,
    accent: "text-amber-400",
    mode: "browser",
    fields: [
      { key: "conversion_id", label: "Conversion ID", type: "text", placeholder: "AW-123456789" },
      {
        key: "label",
        label: "Conversion Label",
        type: "text",
        placeholder: "AbC-D_efG",
        help: "Opcional. Sem ele o evento ainda é enviado.",
      },
    ],
  },
  {
    kind: "pixel_ga4",
    name: "Google Analytics 4",
    description: "Funil de checkout e compras no GA4.",
    icon: LineChart,
    accent: "text-orange-400",
    mode: "browser",
    fields: [{ key: "measurement_id", label: "Measurement ID", type: "text", placeholder: "G-XXXXXXXXXX" }],
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
