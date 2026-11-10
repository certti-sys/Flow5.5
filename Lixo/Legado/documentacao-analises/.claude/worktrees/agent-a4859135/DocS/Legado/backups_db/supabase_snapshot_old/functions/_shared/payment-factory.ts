// Factory para instanciar Payment Providers
// Local: supabase/functions/_shared/payment-factory.ts

import { PaymentProvider } from "./payment-types.ts";
import { MercadoPagoProvider } from "./providers/mercadopago.ts";

export class PaymentFactory {
    static create(slug: string, credentials: any): PaymentProvider {
        switch (slug) {
            case 'mercadopago':
                if (!credentials.access_token && !credentials.secret_key) {
                    // Fallback para mapear keys antigas se necessário
                    // O MP Provider espera { accessToken }
                }
                const token = credentials.access_token || credentials.secret_key || credentials.public_key;
                if (!token) throw new Error("Credenciais inválidas para Mercado Pago (AccessToken ausente)");

                return new MercadoPagoProvider({ accessToken: token });

            case 'stripe':
                throw new Error("Stripe provider not implemented yet");

            default:
                throw new Error(`Gateway '${slug}' não suportado.`);
        }
    }
}
