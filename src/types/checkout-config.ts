/**
 * Configuração de personalização do checkout.
 *
 * Estrutura compatível com a referência `Getfy` (checkout_config), mas com
 * defaults próprios do Flow5.5. Chaves desconhecidas são preservadas para não
 * apagar configurações de fases futuras (gateways, timer, upsell, etc.).
 */

import { findThemePreset } from './theme-presets';

export type CheckoutImageFormat = 'hero' | 'wide' | 'portrait' | 'square';
export type CheckoutBlockPlacement = 'main' | 'sidebar';
export type CheckoutTextAlign = 'left' | 'center' | 'right';
export type CheckoutTheme = 'dark' | 'light';

export interface CheckoutImageBlock {
    id: string;
    type: 'image';
    url: string;
    format: CheckoutImageFormat;
    placement: CheckoutBlockPlacement;
    link: string;
    alt: string;
}

export interface CheckoutTextBlock {
    id: string;
    type: 'text';
    title: string;
    body: string;
    align: CheckoutTextAlign;
}

export type CheckoutContentBlock = CheckoutImageBlock | CheckoutTextBlock;

/** Método no vocabulário do gateway (como no Getfy). */
export type CheckoutPaymentMethodKey = 'card' | 'pix' | 'boleto';

/** Oferta exibida na página de upsell, após o pagamento aprovado. */
export interface CheckoutUpsellOffer {
    product_id: string | null;
    /** Sobrescreve o nome do produto na página. Vazio = nome do produto. */
    title_override: string;
    description: string;
    image_url: string;
}

/**
 * Conteúdo editável das páginas pós-compra (obrigado, upsell, downsell).
 * Tudo é texto puro — nunca HTML — para não abrir XSS no checkout público.
 */
export interface CheckoutPostPurchasePage {
    /** '' = usa o texto padrão da página. */
    headline: string;
    subtitle: string;
    body: string;
    image_url: string;
    /** YouTube: entra como iframe, nunca como arquivo direto. */
    video_url: string;
}

/** Oferta alternativa, exibida quando o cliente recusa o upsell. */
export interface CheckoutDownsell extends CheckoutUpsellOffer {
    enabled: boolean;
    page: CheckoutPostPurchasePage;
}

export interface CheckoutUpsellConfig {
    enabled: boolean;
    products: CheckoutUpsellOffer[];
    downsell: CheckoutDownsell;
    page: CheckoutPostPurchasePage;
}

export interface CheckoutPaymentGateways {
    /** Slug do gateway, '' (segue o padrão do sistema) ou '__default__'. */
    card: string;
    pix: string;
    boleto: string;
}

/** Liga/desliga cada método no checkout do produto, mesmo que o gateway o ofereça. */
export interface CheckoutPaymentMethods {
    card: boolean;
    pix: boolean;
    boleto: boolean;
}

export interface CheckoutReview {
    photo: string;
    author: string;
    description: string;
    stars: number;
    verified_badge: boolean;
    testimonial_image: string;
}

export interface CheckoutConfig {
    /** Campos legados (ainda usados pelo modal de produto). */
    banner_url?: string | null;
    logo_url?: string | null;
    primary_color?: string;
    price?: number;

    summary: {
        previous_price: number | null;
        discount_text: string;
        show_description: boolean;
        mobile_sticky_footer: boolean;
        mobile_sticky_icon_url: string;
    };

    appearance: {
        background_color: string;
        primary_color: string;
        buy_button_color: string;
        buy_button_text: string;
        order_bump_color: string;
        order_bump_inner_color: string;
        content_blocks: CheckoutContentBlock[];
        /** Tema do checkout público. `dark` é o padrão histórico. */
        theme: CheckoutTheme;
        /** Preset de tema (`CHECKOUT_PRESETS`). `null` = cores manuais. */
        preset: string | null;
    };

    customer_fields: {
        name: boolean;
        cpf: boolean;
        phone: boolean;
        coupon: boolean;
    };

    reviews: CheckoutReview[];

    /**
     * Gateway por método de pagamento (como no Getfy). Cada chave aceita um
     * slug de gateway, vazio (usa o padrão) ou `__default__` (usa a ordem
     * global). `*_redundancy` é a fila de reserva caso o principal não sirva.
     */
    payment_gateways: CheckoutPaymentGateways;

    /** Métodos exibidos no checkout do produto. Desligado = não aparece nem processa. */
    payment_methods: CheckoutPaymentMethods;

    timer: {
        enabled: boolean;
        text: string;
        minutes: number;
        background_color: string;
        text_color: string;
        sticky: boolean;
    };

    youtube_url: string;
    youtube_position: 'top' | 'bottom';
    redirect_after_purchase: string;

    /** Ofertas exibidas depois do pagamento aprovado. */
    upsell: CheckoutUpsellConfig;

    /** Conteúdo da página de obrigado (pós-pagamento). */
    thank_you: CheckoutPostPurchasePage;

    seo: {
        title: string;
        description: string;
        og_image: string;
        favicon: string;
    };

    support_button: {
        enabled: boolean;
        text: string;
        icon: 'whatsapp' | 'link';
        position: 'bottom-right' | 'bottom-left';
        url: string;
        color: string;
    };

    footer: {
        enabled: boolean;
        logo_url: string;
        support_email: string;
        text: string;
    };

    /** Mantido para evolução (timer, popup, pixels, upsell etc.). */
    [key: string]: unknown;
}

export const CHECKOUT_IMAGE_FORMATS: Array<{
    id: CheckoutImageFormat;
    label: string;
    ratioLabel: string;
}> = [
    { id: 'hero', label: 'Hero (topo, 3:1)', ratioLabel: '3:1' },
    { id: 'wide', label: 'Largo (16:9)', ratioLabel: '16:9' },
    { id: 'square', label: 'Quadrado (1:1)', ratioLabel: '1:1' },
    { id: 'portrait', label: 'Retrato (2:3, lateral)', ratioLabel: '2:3' },
];

export const DEFAULT_CHECKOUT_CONFIG: CheckoutConfig = {
    banner_url: null,
    logo_url: null,
    primary_color: '',
    summary: {
        previous_price: null,
        discount_text: '',
        show_description: true,
        mobile_sticky_footer: false,
        mobile_sticky_icon_url: '',
    },
    appearance: {
        background_color: '',
        primary_color: '',
        buy_button_color: '',
        buy_button_text: '',
        order_bump_color: '#F59E0B',
        order_bump_inner_color: '#86EFAC',
        content_blocks: [],
        theme: 'dark',
        preset: null,
    },
    customer_fields: {
        name: true,
        cpf: true,
        phone: true,
        // O checkout atual sempre exibiu cupom; novo default mantém o comportamento.
        coupon: true,
    },
    reviews: [],
    payment_gateways: {
        card: '',
        pix: '',
        boleto: '',
    },
    payment_methods: {
        // Sem configuração salva, todos continuam aparecendo (comportamento antigo).
        card: true,
        pix: true,
        boleto: true,
    },
    timer: {
        enabled: false,
        text: 'Oferta expira em',
        minutes: 15,
        background_color: '#DC2626',
        text_color: '#FFFFFF',
        sticky: true,
    },
    youtube_url: '',
    youtube_position: 'top',
    redirect_after_purchase: '',
    upsell: {
        enabled: false,
        products: [],
        downsell: {
            enabled: false,
            product_id: null,
            title_override: '',
            description: '',
            image_url: '',
            page: emptyPostPurchasePage(),
        },
        page: emptyPostPurchasePage(),
    },
    thank_you: emptyPostPurchasePage(),
    seo: {
        title: '',
        description: '',
        og_image: '',
        favicon: '',
    },
    support_button: {
        enabled: false,
        text: 'Suporte',
        icon: 'whatsapp',
        position: 'bottom-right',
        url: '',
        color: '#25D366',
    },
    footer: {
        enabled: false,
        logo_url: '',
        support_email: '',
        text: '',
    },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Merge profundo: arrays e escalares do `override` substituem os do `base`. */
export function deepMerge<T>(base: T, override: unknown): T {
    if (Array.isArray(base)) {
        return (Array.isArray(override) ? override : base) as T;
    }

    if (isPlainObject(base)) {
        if (!isPlainObject(override)) return base;

        const result: Record<string, unknown> = { ...base };
        for (const [key, value] of Object.entries(override)) {
            result[key] = key in result
                ? deepMerge((base as Record<string, unknown>)[key], value)
                : value;
        }
        return result as T;
    }

    return (override === undefined ? base : override) as T;
}

function asString(value: unknown, fallback = ''): string {
    return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
    return typeof value === 'boolean' ? value : fallback;
}

function emptyPostPurchasePage(): CheckoutPostPurchasePage {
    return { headline: '', subtitle: '', body: '', image_url: '', video_url: '' };
}

/** Página pós-compra: todos os campos são texto puro. */
function normalizePostPurchasePage(value: unknown): CheckoutPostPurchasePage {
    const source = isPlainObject(value) ? value : {};
    return {
        headline: asString(source.headline).trim(),
        subtitle: asString(source.subtitle).trim(),
        body: asString(source.body),
        image_url: asString(source.image_url).trim(),
        video_url: asString(source.video_url).trim(),
    };
}

function normalizeBlocks(value: unknown): CheckoutContentBlock[] {
    if (!Array.isArray(value)) return [];

    return value.flatMap((raw): CheckoutContentBlock[] => {
        if (!isPlainObject(raw)) return [];

        const id = asString(raw.id) || `block-${Math.random().toString(36).slice(2, 10)}`;

        if (raw.type === 'text') {
            return [{
                id,
                type: 'text',
                title: asString(raw.title),
                body: asString(raw.body),
                align: raw.align === 'left' || raw.align === 'right' ? raw.align : 'center',
            }];
        }

        const url = asString(raw.url).trim();
        if (!url) return [];

        const format = raw.format === 'hero' || raw.format === 'square' || raw.format === 'portrait'
            ? raw.format
            : 'wide';

        return [{
            id,
            type: 'image',
            url,
            format,
            placement: raw.placement === 'sidebar' ? 'sidebar' : 'main',
            link: asString(raw.link),
            alt: asString(raw.alt),
        }];
    });
}

function normalizeReviews(value: unknown): CheckoutReview[] {
    if (!Array.isArray(value)) return [];

    return value
        .filter(isPlainObject)
        .map((raw) => ({
            photo: asString(raw.photo),
            author: asString(raw.author),
            description: asString(raw.description),
            stars: Math.max(0, Math.min(5, Number(raw.stars) || 0)),
            verified_badge: asBoolean(raw.verified_badge, false),
            testimonial_image: asString(raw.testimonial_image),
        }))
        .filter((review) => review.author.trim() !== '' || review.description.trim() !== '');
}

/**
 * Normaliza as ofertas pós-compra. Aceita o formato do Getfy
 * (`upsell.products`, `downsell.product_id`); campos que não existem no
 * Flow5.5 (oferta por produto) são descartados.
 */
function normalizeUpsell(value: unknown): CheckoutUpsellConfig {
    const source = isPlainObject(value) ? value : {};
    const downsellSource = isPlainObject(source.downsell) ? source.downsell : {};

    const products = Array.isArray(source.products)
        ? source.products.flatMap((raw): CheckoutUpsellOffer[] => {
            if (!isPlainObject(raw)) return [];
            const productId = asString(raw.product_id).trim();
            if (!productId) return [];
            return [{
                product_id: productId,
                title_override: asString(raw.title_override),
                description: asString(raw.description),
                image_url: asString(raw.image_url),
            }];
        })
        : [];

    const downsellProductId = asString(downsellSource.product_id).trim();

    return {
        enabled: asBoolean(source.enabled, false) && products.length > 0,
        products,
        page: normalizePostPurchasePage(source.page),
        downsell: {
            enabled: asBoolean(downsellSource.enabled, false) && !!downsellProductId,
            product_id: downsellProductId || null,
            title_override: asString(downsellSource.title_override),
            description: asString(downsellSource.description),
            image_url: asString(downsellSource.image_url),
            page: normalizePostPurchasePage(downsellSource.page),
        },
    };
}

/**
 * Normaliza o JSON vindo do banco (inclusive o formato antigo, que só tinha
 * `primary_color`, `banner_url`, `logo_url` e `features`).
 */
export function normalizeCheckoutConfig(raw: unknown): CheckoutConfig {
    const source = isPlainObject(raw) ? raw : {};
    const config = deepMerge(DEFAULT_CHECKOUT_CONFIG, source);

    // Compatibilidade com o formato legado do modal de produto.
    const legacyPrimary = asString(source.primary_color).trim();
    if (!config.appearance.primary_color && legacyPrimary) {
        config.appearance.primary_color = legacyPrimary;
    }

    config.banner_url = asString(source.banner_url) || null;
    config.logo_url = asString(source.logo_url) || null;

    config.summary.previous_price = Number.isFinite(Number(config.summary.previous_price)) && Number(config.summary.previous_price) > 0
        ? Number(config.summary.previous_price)
        : null;

    config.appearance.content_blocks = normalizeBlocks(config.appearance.content_blocks);
    config.appearance.theme = config.appearance.theme === 'light' ? 'light' : 'dark';
    // Preset inexistente (removido do catálogo) cai em `null` = cores manuais.
    config.appearance.preset = findThemePreset(asString(config.appearance.preset)) ? config.appearance.preset : null;
    config.reviews = normalizeReviews(config.reviews);

    for (const key of ['card', 'pix', 'boleto'] as const) {
        config.payment_gateways[key] = asString(config.payment_gateways?.[key]).trim();
        // Só `false` desliga; ausente/legado continua ligado.
        config.payment_methods[key] = config.payment_methods?.[key] !== false;
    }

    // Nunca deixa o checkout sem nenhum método de pagamento.
    if (!config.payment_methods.card && !config.payment_methods.pix && !config.payment_methods.boleto) {
        config.payment_methods.card = true;
    }

    config.youtube_url = asString(config.youtube_url);
    config.youtube_position = config.youtube_position === 'bottom' ? 'bottom' : 'top';
    config.redirect_after_purchase = asString(config.redirect_after_purchase);
    config.upsell = normalizeUpsell(config.upsell);
    config.thank_you = normalizePostPurchasePage(config.thank_you);

    config.timer.text = asString(config.timer.text, 'Oferta expira em');
    config.timer.minutes = Math.min(720, Math.max(1, Number(config.timer.minutes) || 15));
    config.timer.background_color = asString(config.timer.background_color, '#DC2626');
    config.timer.text_color = asString(config.timer.text_color, '#FFFFFF');
    config.timer.enabled = asBoolean(config.timer.enabled, false);
    config.timer.sticky = asBoolean(config.timer.sticky, true);

    config.support_button.url = asString(config.support_button.url);
    config.support_button.text = asString(config.support_button.text, 'Suporte');
    config.support_button.position = config.support_button.position === 'bottom-left'
        ? 'bottom-left'
        : 'bottom-right';

    config.footer.logo_url = asString(config.footer.logo_url);
    config.footer.support_email = asString(config.footer.support_email);
    config.footer.text = asString(config.footer.text);

    config.seo.title = asString(config.seo.title);
    config.seo.description = asString(config.seo.description);
    config.seo.og_image = asString(config.seo.og_image);
    config.seo.favicon = asString(config.seo.favicon);

    return config;
}

export function isSafeUrl(value: string): boolean {
    if (!value) return false;
    try {
        const url = new URL(value, window.location.origin);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

/** Extrai o ID de um link do YouTube e devolve a URL de embed. */
export function youtubeEmbedUrl(value: string): string | null {
    if (!value) return null;

    const patterns = [
        /(?:youtube\.com\/watch\?[^#]*v=)([a-zA-Z0-9_-]{6,})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{6,})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{6,})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{6,})/,
    ];

    for (const pattern of patterns) {
        const match = value.match(pattern);
        if (match?.[1]) {
            return `https://www.youtube.com/embed/${match[1]}`;
        }
    }

    return null;
}

export function newCheckoutBlockId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return `block-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
