/** Logos e bandeiras em `public/images/gateways` (mesmos arquivos do Getfy). */

const LOGOS: Record<string, string> = {
    mercadopago: "mercado-pago.webp",
    stripe: "stripe.png",
    asaas: "asaas.png",
    pushinpay: "pushinpay.png",
    pagarme: "pagarme.png",
    paypal: "paypal.png",
    efi: "efi.png",
    cajupay: "cajupay.png",
};

const COUNTRIES: Record<string, { flag: string; name: string }> = {
    mercadopago: { flag: "brasil.png", name: "Brasil" },
    stripe: { flag: "global.png", name: "Global" },
    asaas: { flag: "brasil.png", name: "Brasil" },
    pushinpay: { flag: "brasil.png", name: "Brasil" },
    pagarme: { flag: "brasil.png", name: "Brasil" },
    paypal: { flag: "global.png", name: "Global" },
    efi: { flag: "brasil.png", name: "Brasil" },
    cajupay: { flag: "brasil.png", name: "Brasil" },
};

export function gatewayLogo(slug: string): string | null {
    const file = LOGOS[slug];
    return file ? `/images/gateways/${file}` : null;
}

export function gatewayCountry(slug: string): { flag: string; name: string } | null {
    const country = COUNTRIES[slug];
    return country ? { ...country, flag: `/images/gateways/paises/${country.flag}` } : null;
}

/** Ícone do seletor de método no checkout. */
export const METHOD_ICONS: Record<string, string> = {
    credit_card: "/images/gateways/card-method.png",
    card: "/images/gateways/card-method.png",
    pix: "/images/gateways/pix.svg",
    bolbradesco: "/images/gateways/boleto.png",
    boleto: "/images/gateways/boleto.png",
};

/** Prefixos BIN na mesma ordem do Getfy (mais longos primeiro). */
const CARD_BRANDS: Array<[string, string[]]> = [
    ["elo", ["636368", "636297", "636269", "438935", "504175", "451416", "627780", "5067", "4576", "4011", "506", "509", "636", "6500", "6504", "6505", "6507", "6509", "6516", "6550"]],
    ["hipercard", ["606282", "3841", "60", "38"]],
    ["hiper", ["637095", "637599", "637609", "637612", "637600", "637568", "637"]],
    ["amex", ["34", "37"]],
    ["diners", ["300", "301", "302", "303", "304", "305", "36", "39"]],
    ["discover", ["6011", "644", "645", "646", "647", "648", "649", "65"]],
    ["jcb", ["35"]],
    ["mastercard", ["2221", "2222", "2223", "2224", "2225", "2226", "2227", "2228", "2229", "223", "224", "225", "226", "227", "228", "229", "23", "24", "25", "26", "27", "2720", "51", "52", "53", "54", "55"]],
    ["visa", ["4"]],
];

/** Bandeira detectada pelo número digitado, ou `null` enquanto não dá para saber. */
export function cardBrand(number: string): string | null {
    const digits = number.replace(/\D/g, "");
    if (digits.length < 2) return null;
    for (const [slug, prefixes] of CARD_BRANDS) {
        if (prefixes.some((prefix) => digits.startsWith(prefix))) return slug;
    }
    return null;
}

export function cardBrandLogo(number: string): string {
    const brand = cardBrand(number);
    return `/images/gateways/cards/${brand ?? "generic"}.svg`;
}
