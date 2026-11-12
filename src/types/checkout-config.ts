/**
 * Configuração de personalização do checkout.
 *
 * Estrutura compatível com a referência `Getfy` (checkout_config), mas com
 * defaults próprios do Flow5.5. Chaves desconhecidas são preservadas para não
 * apagar configurações de fases futuras (gateways, timer, upsell, etc.).
 */

export type CheckoutImageFormat = 'hero' | 'wide' | 'portrait' | 'square';
export type CheckoutBlockPlacement = 'main' | 'sidebar';
export type CheckoutTextAlign = 'left' | 'center' | 'right';

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
    };

    customer_fields: {
        name: boolean;
        cpf: boolean;
        phone: boolean;
        coupon: boolean;
    };

    reviews: CheckoutReview[];

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
    },
    customer_fields: {
        name: true,
        cpf: true,
        phone: true,
        // O checkout atual sempre exibiu cupom; novo default mantém o comportamento.
        coupon: true,
    },
    reviews: [],
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
    config.reviews = normalizeReviews(config.reviews);

    config.youtube_url = asString(config.youtube_url);
    config.youtube_position = config.youtube_position === 'bottom' ? 'bottom' : 'top';
    config.redirect_after_purchase = asString(config.redirect_after_purchase);

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
