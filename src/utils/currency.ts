/**
 * Utilitário para detecção de moeda e seleção de gateway
 * Suporta múltiplas moedas e seleciona automaticamente o gateway apropriado
 */

export interface Currency {
    code: string;
    symbol: string;
    name: string;
    gateway: 'mercadopago' | 'stripe';
    locale: string;
}

export const SUPPORTED_CURRENCIES: Record<string, Currency> = {
    BRL: {
        code: 'BRL',
        symbol: 'R$',
        name: 'Real Brasileiro',
        gateway: 'mercadopago',
        locale: 'pt-BR'
    },
    USD: {
        code: 'USD',
        symbol: '$',
        name: 'US Dollar',
        gateway: 'stripe',
        locale: 'en-US'
    },
    EUR: {
        code: 'EUR',
        symbol: '€',
        name: 'Euro',
        gateway: 'stripe',
        locale: 'en-GB'
    },
    GBP: {
        code: 'GBP',
        symbol: '£',
        name: 'British Pound',
        gateway: 'stripe',
        locale: 'en-GB'
    }
};

/**
 * Detectar moeda do usuário baseado em geolocalização e locale
 */
export function detectUserCurrency(): string {
    // Tentar detectar pelo locale do navegador
    const userLocale = navigator.language || 'en-US';

    // Brasil
    if (userLocale.startsWith('pt-BR') || userLocale.startsWith('pt')) {
        return 'BRL';
    }

    // Estados Unidos
    if (userLocale.startsWith('en-US')) {
        return 'USD';
    }

    // Reino Unido
    if (userLocale.startsWith('en-GB')) {
        return 'GBP';
    }

    // Países da zona do Euro
    const euroCountries = ['de', 'fr', 'es', 'it', 'nl', 'be', 'at', 'pt', 'ie', 'fi', 'gr', 'ee', 'lv', 'lt', 'lu', 'mt', 'sk', 'si'];
    const country = userLocale.split('-')[1]?.toLowerCase();
    if (country && euroCountries.includes(country)) {
        return 'EUR';
    }

    // Default: USD para mercado internacional
    return 'USD';
}

/**
 * Selecionar gateway baseado na moeda
 */
export function selectGatewayByCurrency(currency: string): 'stripe' | 'mercadopago' {
    const currencyInfo = SUPPORTED_CURRENCIES[currency.toUpperCase()];
    return currencyInfo?.gateway || 'stripe';
}

/**
 * Formatar valor monetário
 */
export function formatCurrency(amount: number, currency: string): string {
    const currencyInfo = SUPPORTED_CURRENCIES[currency.toUpperCase()];

    if (!currencyInfo) {
        return `${currency} ${(amount / 100).toFixed(2)}`;
    }

    const formatter = new Intl.NumberFormat(currencyInfo.locale, {
        style: 'currency',
        currency: currencyInfo.code,
    });

    return formatter.format(amount / 100);
}

/**
 * Converter valor entre moedas (taxas fixas para exemplo)
 * Em produção, usar API de câmbio real
 */
export function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) return amount;

    // Taxas de câmbio aproximadas (BRL como base)
    const rates: Record<string, number> = {
        BRL: 1,
        USD: 0.20,  // 1 BRL = 0.20 USD
        EUR: 0.18,  // 1 BRL = 0.18 EUR
        GBP: 0.16   // 1 BRL = 0.16 GBP
    };

    const fromRate = rates[fromCurrency.toUpperCase()] || 1;
    const toRate = rates[toCurrency.toUpperCase()] || 1;

    // Converter para BRL primeiro, depois para moeda de destino
    const amountInBRL = amount / fromRate;
    const convertedAmount = amountInBRL * toRate;

    return Math.round(convertedAmount);
}

/**
 * Obter símbolo da moeda
 */
export function getCurrencySymbol(currency: string): string {
    return SUPPORTED_CURRENCIES[currency.toUpperCase()]?.symbol || currency;
}

/**
 * Obter nome da moeda
 */
export function getCurrencyName(currency: string): string {
    return SUPPORTED_CURRENCIES[currency.toUpperCase()]?.name || currency;
}

/**
 * Verificar se moeda é suportada
 */
export function isCurrencySupported(currency: string): boolean {
    return currency.toUpperCase() in SUPPORTED_CURRENCIES;
}

/**
 * Listar todas as moedas suportadas
 */
export function getSupportedCurrencies(): Currency[] {
    return Object.values(SUPPORTED_CURRENCIES);
}

/**
 * Obter informações completas da moeda
 */
export function getCurrencyInfo(currency: string): Currency | null {
    return SUPPORTED_CURRENCIES[currency.toUpperCase()] || null;
}

/**
 * Detectar se usuário está no Brasil
 */
export function isUserInBrazil(): boolean {
    const userLocale = navigator.language || 'en-US';
    return userLocale.startsWith('pt-BR') || userLocale.startsWith('pt');
}

/**
 * Sugerir moeda baseado em IP (placeholder)
 * Em produção, usar serviço de geolocalização real
 */
export async function detectCurrencyByIP(): Promise<string> {
    try {
        // Placeholder: em produção, usar API como ipapi.co ou similar
        // const response = await fetch('https://ipapi.co/json/');
        // const data = await response.json();
        // return mapCountryToCurrency(data.country_code);

        // Por enquanto, usar detecção por locale
        return detectUserCurrency();
    } catch (error) {
        console.error('Error detecting currency by IP:', error);
        return detectUserCurrency();
    }
}

/**
 * Mapear código de país para moeda
 */
function mapCountryToCurrency(countryCode: string): string {
    const countryToCurrency: Record<string, string> = {
        BR: 'BRL',
        US: 'USD',
        GB: 'GBP',
        DE: 'EUR',
        FR: 'EUR',
        ES: 'EUR',
        IT: 'EUR',
        PT: 'EUR',
        NL: 'EUR',
        BE: 'EUR',
        AT: 'EUR',
        IE: 'EUR',
        FI: 'EUR',
        GR: 'EUR',
    };

    return countryToCurrency[countryCode.toUpperCase()] || 'USD';
}

/**
 * Validar valor mínimo por moeda
 */
export function getMinimumAmount(currency: string): number {
    // Valores mínimos em centavos
    const minimums: Record<string, number> = {
        BRL: 100,   // R$ 1,00
        USD: 50,    // $0.50
        EUR: 50,    // €0.50
        GBP: 30     // £0.30
    };

    return minimums[currency.toUpperCase()] || 50;
}

/**
 * Validar se valor está acima do mínimo
 */
export function isAmountValid(amount: number, currency: string): boolean {
    const minimum = getMinimumAmount(currency);
    return amount >= minimum;
}
