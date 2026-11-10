// Função de Pagamento - Versão 15 - Suporte a Order Bumps
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
        const { action, payload } = await req.json();

        if (action === 'create_paymentIntent') {
            const { productId, gatewayId, orderBumps = [] } = payload;
            if (!productId || !gatewayId) {
                return new Response(JSON.stringify({ error: "productId e gatewayId obrigatórios" }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Dados do cliente
            const customerEmail = payload.email;
            const customerName = payload.name || 'Cliente';
            const customerPhone = payload.phone || null;
            const customerCpf = payload.cpf?.replace(/\D/g, '') || '00000000000';

            if (!customerEmail) {
                return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Buscar credenciais
            const { data: cred, error: credError } = await supabaseAdmin
                .from('gateway_credentials')
                .select('*, gateway:gateways(slug)')
                .eq('gateway_id', gatewayId)
                .eq('is_active', true)
                .single();

            if (credError || !cred || !cred.secret_key) {
                return new Response(JSON.stringify({ error: "Gateway não configurado" }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Buscar produto principal
            const { data: product, error: productError } = await supabaseAdmin
                .from('products')
                .select('id, name, price, course_id')
                .eq('id', productId)
                .single();

            if (productError || !product) {
                return new Response(JSON.stringify({ error: "Produto não encontrado" }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Calcular total: produto principal + order bumps
            let totalAmount = product.price || 0;\n            const bumpItems: { bumpId: string; productId: string; price: number; discountedPrice: number }[] = [];\n\n            // Processar order bumps selecionados\n            if (orderBumps.length > 0) {\n                const { data: bumps } = await supabaseAdmin\n                    .from('order_bumps')\n                    .select(`\n                        id,\n                        discount_percent,\n                        offer_product:products!offer_product_id(id, name, price, course_id)\n                    `)\n                    .in('id', orderBumps)\n                    .eq('is_active', true);\n\n                if (bumps) {\n                    for (const bump of bumps) {\n                        const offerProduct = bump.offer_product as any;\n                        if (offerProduct) {\n                            const originalPrice = offerProduct.price || 0;\n                            const discountedPrice = Math.round(originalPrice * (1 - (bump.discount_percent || 0) / 100));\n                            totalAmount += discountedPrice;\n                            bumpItems.push({\n                                bumpId: bump.id,\n                                productId: offerProduct.id,\n                                price: originalPrice,\n                                discountedPrice\n                            });\n                        }\n                    }\n                }\n            }

            const paymentMethod = payload.payment_method_id || 'pix';

            // Criar pedido
            const { data: order, error: orderError } = await supabaseAdmin.from('orders').insert({
                user_id: null,
                status: 'pending',
                currency: 'BRL',
                total_amount: totalAmount,
                customer_email: customerEmail,
                customer_name: customerName,
                customer_phone: customerPhone,
                customer_cpf: customerCpf
            }).select('*').single();

            if (orderError) {
                return new Response(JSON.stringify({ error: "Erro ao criar pedido: " + orderError.message }), {
                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            // Criar item principal
            await supabaseAdmin.from('order_items').insert({
                order_id: order.id,
                product_id: productId,
                quantity: 1,
                unit_amount: product.price || 0,
                total_amount: product.price || 0,
                kind: 'main'
            });

            // Criar items de order bump
            for (const bump of bumpItems) {
                await supabaseAdmin.from('order_items').insert({
                    order_id: order.id,
                    product_id: bump.productId,
                    quantity: 1,
                    unit_amount: bump.discountedPrice,
                    total_amount: bump.discountedPrice,
                    kind: 'order_bump'
                });
            }

            // Montar payload do Mercado Pago
            const mpPayload: any = {
                transaction_amount: totalAmount / 100,
                description: `Pedido #\${order.id.slice(0, 8)}`,
                payment_method_id: paymentMethod,
                payer: {
                    email: customerEmail,
                    first_name: customerName.split(' ')[0] || 'Cliente',
                    last_name: customerName.split(' ').slice(1).join(' ') || 'Cliente',
                    identification: { type: 'CPF', number: customerCpf }
                },
                external_reference: order.id,
                metadata: { order_id: order.id }
            };

            // Adicionar token para cartão
            if (paymentMethod !== 'pix' && paymentMethod !== 'bolbradesco') {
                if (!payload.token) {
                    return new Response(JSON.stringify({ error: "Token do cartão é obrigatório" }), {
                        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                }
                mpPayload.token = payload.token;
                mpPayload.installments = payload.installments || 1;
                if (payload.issuer_id) {
                    mpPayload.issuer_id = payload.issuer_id;
                }
            }

            // Gerar X-Idempotency-Key
            const idempotencyKey = order.id;

            // Chamar API do Mercado Pago
            const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer \${cred.secret_key}`,
                    'Content-Type': 'application/json',
                    'X-Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify(mpPayload)
            });

            const mpData = await mpResponse.json();

            if (!mpResponse.ok) {
                const errorDetail = mpData.message || JSON.stringify(mpData.cause) || mpResponse.statusText;\n                return new Response(JSON.stringify({ \n                    error: `Mercado Pago: \${errorDetail}`,\n                    mp_status: mpResponse.status,\n                    mp_response: mpData\n                }), {\n                    status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }\n                });\n            }\n\n            // Determinar status\n            let status: string = 'pending';\n            if (mpData.status === 'approved') status = 'paid';\n            if (mpData.status === 'rejected') status = 'failed';\n\n            // Salvar pagamento\n            await supabaseAdmin.from('payments').insert({\n                order_id: order.id,\n                gateway_id: gatewayId,\n                external_payment_id: mpData.id.toString(),\n                status,\n                amount: totalAmount,\n                currency: 'BRL',\n                payment_method_type: paymentMethod,\n                raw_response: mpData,\n                paid_at: status === 'paid' ? new Date().toISOString() : null\n            });\n\n            // Atualizar pedido se pago\n            if (status === 'paid') {\n                await supabaseAdmin.from('orders').update({ status: 'paid' }).eq('id', order.id);\n            }\n\n            // Retornar sucesso\n            return new Response(JSON.stringify({\n                status,\n                external_id: mpData.id.toString(),\n                orderId: order.id,\n                qr_code: mpData.point_of_interaction?.transaction_data?.qr_code || null,\n                ticket_url: mpData.point_of_interaction?.transaction_data?.ticket_url || null\n            }), {\n                headers: { ...corsHeaders, 'Content-Type': 'application/json' }\n            });\n        }\n\n        return new Response(JSON.stringify({ error: "Action não suportada" }), {\n            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }\n        });\n\n    } catch (err: any) {\n        return new Response(JSON.stringify({ error: err.message || 'Erro desconhecido' }), {\n            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }\n        });\n    }\n});\n
