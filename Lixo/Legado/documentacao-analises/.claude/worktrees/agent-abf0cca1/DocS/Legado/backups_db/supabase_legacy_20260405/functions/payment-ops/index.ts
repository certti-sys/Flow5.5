// Função de Pagamento - Versão Funcional Simplificada
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PaymentProvider {
    createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult>;
}

interface OrderContext {
    id: string;
    amount: number;
    currency: string;
    description: string;
    customer: {
        email: string;
        name: string;
        tax_id?: string;
    };
    items: Array<{
        id: string;
        title: string;
        unit_price: number;
        quantity: number;
    }>;
    metadata?: Record<string, any>;
}

interface PaymentIntentResult {
    external_id: string;
    status: 'pending' | 'paid' | 'failed';
    client_secret?: string;
    ticket_url?: string;
    qr_code?: string;
    raw_response: any;
}

class MercadoPagoProvider implements PaymentProvider {
    private accessToken: string;
    private baseUrl = "https://api.mercadopago.com";

    constructor(credentials: { accessToken: string }) {
        this.accessToken = credentials.accessToken;
    }

    private async request(endpoint: string, method: string, body?: any) {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers: {
                "Authorization": `Bearer ${this.accessToken}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined
        });

        const data = await res.json();
        if (!res.ok) {
            throw new Error(`Mercado Pago Error: ${data.message || res.statusText}`);
        }
        return data;
    }

    async createPaymentIntent(order: OrderContext): Promise<PaymentIntentResult> {
        const paymentMethod = order.metadata?.payment_method_id || 'pix';

        const payload: any = {
            transaction_amount: order.amount / 100,
            description: order.description,
            payment_method_id: paymentMethod,
            payer: {
                email: order.customer.email,
                first_name: order.customer.name.split(" ")[0] || "Cliente",
                last_name: order.customer.name.split(" ").slice(1).join(" ") || "Cliente",
                identification: {
                    type: "CPF",
                    number: order.customer.tax_id || "00000000000"
                }
            },
            external_reference: order.id,
            metadata: { order_id: order.id }
        };

        if (paymentMethod !== 'pix' && paymentMethod !== 'bolbradesco') {
            if (!order.metadata?.token) throw new Error("Token obrigatório");
            payload.token = order.metadata.token;
            payload.installments = order.metadata.installments || 1;
        }

        const data = await this.request("/v1/payments", "POST", payload);

        let status: 'pending' | 'paid' | 'failed' = 'pending';
        if (data.status === 'approved') status = 'paid';
        if (data.status === 'rejected') status = 'failed';

        return {
            external_id: data.id.toString(),
            status,
            qr_code: data.point_of_interaction?.transaction_data?.qr_code,
            ticket_url: data.point_of_interaction?.transaction_data?.ticket_url,
            raw_response: data
        };
    }
}

function createPaymentProvider(slug: string, credentials: any): PaymentProvider {
    if (slug === 'mercadopago') {
        const token = credentials.access_token || credentials.secret_key || credentials.public_key;
        if (!token) throw new Error("Token ausente");
        return new MercadoPagoProvider({ accessToken: token });
    }
    throw new Error(`Gateway '${slug}' não suportado`);
}

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

        const authHeader = req.headers.get('Authorization');
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: authHeader || '' } }
        });
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

        const { action, payload } = await req.json();

        if (action === 'create_paymentIntent') {
            const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
            if (userError || !user) throw new Error("Não autenticado");

            const { productId, gatewayId } = payload;
            if (!productId || !gatewayId) throw new Error("productId e gatewayId obrigatórios");

            const { data: cred } = await supabaseAdmin
                .from('gateway_credentials')
                .select('*, gateway:gateways(slug)')
                .eq('gateway_id', gatewayId)
                .eq('is_active', true)
                .order('env', { ascending: false })
                .limit(1)
                .single();

            if (!cred) throw new Error("Gateway inativo");

            const provider = createPaymentProvider(cred.gateway.slug, cred);

            const { data: product } = await supabaseAdmin
                .from('products')
                .select('id, name, price, course_id')
                .eq('id', productId)
                .single();

            if (!product) throw new Error("Produto não encontrado");

            const price = product.price || payload.amount || 0;

            const { data: order } = await supabaseAdmin.from('orders').insert({
                user_id: user.id,
                status: 'pending',
                currency: 'BRL',
                total_amount: price,
                customer_email: user.email || payload.email,
                customer_name: payload.name || user.user_metadata?.name || null,
                customer_phone: payload.phone || user.user_metadata?.phone || null,
                customer_cpf: payload.cpf || null
            }).select('*').single();

            await supabaseAdmin.from('order_items').insert({
                order_id: order.id,
                product_id: productId,
                quantity: 1,
                unit_amount: price
            });

            const orderContext: OrderContext = {
                id: order.id,
                amount: price,
                currency: 'BRL',
                description: `Pedido #${order.id.slice(0, 8)}`,
                customer: {
                    email: user.email!,
                    name: payload.name || user.user_metadata?.name || "Cliente",
                    tax_id: payload.cpf || user.user_metadata?.cpf
                },
                items: [{
                    id: productId,
                    title: product.name,
                    unit_price: price,
                    quantity: 1
                }],
                metadata: {
                    token: payload.token,
                    installments: payload.installments,
                    payment_method_id: payload.payment_method_id
                }
            };

            const result = await provider.createPaymentIntent(orderContext);

            const { data: paymentRecord } = await supabaseAdmin.from('payments').insert({
                order_id: order.id,
                gateway_id: gatewayId,
                external_payment_id: result.external_id,
                status: result.status,
                amount: price,
                currency: 'BRL',
                payment_method_type: payload.payment_method_id || 'unknown',
                raw_response: result.raw_response,
                paid_at: result.status === 'paid' ? new Date().toISOString() : null
            }).select('id').single();

            if (result.status === 'paid') {
                await supabaseAdmin.from('orders').update({ status: 'paid' }).eq('id', order.id);

                if (product.course_id) {
                    const { data: existing } = await supabaseAdmin
                        .from('user_course_access')
                        .select('id')
                        .eq('user_id', user.id)
                        .eq('course_id', product.course_id)
                        .maybeSingle();

                    if (!existing) {
                        await supabaseAdmin.from('user_course_access').insert({
                            user_id: user.id,
                            course_id: product.course_id,
                            source: 'checkout',
                            granted_by: null
                        });
                    }
                }
            }

            return new Response(JSON.stringify({
                ...result,
                orderId: order.id,
                internalPaymentId: paymentRecord?.id
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error(`Action não suportada`);

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
