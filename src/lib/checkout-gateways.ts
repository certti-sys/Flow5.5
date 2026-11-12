import { supabase } from "@/integrations/supabase/client";
import type { CheckoutConfig, CheckoutPaymentMethodKey } from "@/types/checkout-config";

export type CheckoutMethod = "credit_card" | "pix" | "bolbradesco";

export interface CheckoutGatewayOption {
    slug: string;
    name: string;
    isDefault: boolean;
    /** Métodos no vocabulário do checkout. */
    methods: CheckoutMethod[];
}

/** `allowed_methods` mistura `card`/`boleto` (Stripe) com `credit_card`/`bolbradesco`. */
export function normalizeMethods(methods: string[] | null | undefined): CheckoutMethod[] {
    const result = new Set<CheckoutMethod>();

    for (const raw of methods ?? []) {
        const value = String(raw).trim().toLowerCase();
        if (value === "card" || value === "credit_card") result.add("credit_card");
        else if (value === "pix") result.add("pix");
        else if (value === "boleto" || value === "bolbradesco") result.add("bolbradesco");
    }

    return [...result];
}

export function checkoutMethodToKey(method: string): CheckoutPaymentMethodKey | null {
    if (method === "credit_card" || method === "card") return "card";
    if (method === "pix") return "pix";
    if (method === "bolbradesco" || method === "boleto") return "boleto";
    return null;
}

/** Gateways ativos que têm pelo menos uma credencial ativa (RPC pública). */
export async function fetchCheckoutGateways(): Promise<CheckoutGatewayOption[]> {
    const { data, error } = await supabase.rpc("get_checkout_gateways");
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
        slug: row.slug,
        name: row.name ?? row.slug,
        isDefault: Boolean(row.is_default),
        methods: normalizeMethods(row.allowed_methods),
    }));
}

export interface ResolvedGateways {
    /** Método do checkout → slug do gateway. */
    byMethod: Partial<Record<CheckoutMethod, string>>;
    /** Métodos disponíveis (na ordem em que aparecem no seletor). */
    methods: CheckoutMethod[];
    /** Slug usado quando nenhum método é escolhido ainda. */
    fallback: string | null;
}

const METHOD_ORDER: CheckoutMethod[] = ["credit_card", "pix", "bolbradesco"];

/**
 * Aplica o mapa `checkout_config.payment_gateways` sobre os gateways ativos.
 * Slug explícito vence; `__default__` e vazio caem na ordem global
 * (`is_default` → moeda → primeiro ativo), como era antes.
 */
export function resolveCheckoutGateways(
    config: CheckoutConfig,
    gateways: CheckoutGatewayOption[],
    preferredSlug: string,
): ResolvedGateways {
    const bySlug = new Map(gateways.map((gateway) => [gateway.slug, gateway]));
    const globalDefault = gateways.find((gateway) => gateway.isDefault)?.slug
        ?? (bySlug.has(preferredSlug) ? preferredSlug : undefined)
        ?? gateways[0]?.slug
        ?? null;

    const byMethod: Partial<Record<CheckoutMethod, string>> = {};
    const methods: CheckoutMethod[] = [];

    /**
     * Getfy tenta o gateway escolhido e depois a lista de redundância. Aqui a
     * redundância é implícita: qualquer outro gateway ativo que suporte o método.
     * ponytail: fila de reserva explícita por método só quando existir um caso
     * real de dois gateways do mesmo tipo com prioridade configurável.
     */
    const pick = (key: CheckoutPaymentMethodKey, method: CheckoutMethod) => {
        const configured = (config.payment_gateways?.[key] ?? "").trim();

        const candidates = configured && configured !== "__default__"
            ? [configured, globalDefault ?? ""]
            : [globalDefault ?? ""];

        for (const slug of candidates) {
            const gateway = bySlug.get(slug);
            if (gateway && gateway.methods.includes(method)) {
                byMethod[method] = gateway.slug;
                methods.push(method);
                return;
            }
        }

        // Último recurso: qualquer gateway ativo que suporte o método.
        const alternative = gateways.find((gateway) => gateway.methods.includes(method));
        if (alternative) {
            byMethod[method] = alternative.slug;
            methods.push(method);
        }
    };

    for (const method of METHOD_ORDER) {
        const key = checkoutMethodToKey(method);
        if (key) pick(key, method);
    }

    return { byMethod, methods, fallback: globalDefault };
}
