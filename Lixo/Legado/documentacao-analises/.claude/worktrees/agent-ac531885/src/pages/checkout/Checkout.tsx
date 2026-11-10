
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/payment";
import { checkoutFormSchema, CheckoutFormValues } from "@/types/checkout-form";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CustomerForm } from "@/components/checkout/CustomerForm";
import { PaymentMethods } from "@/components/checkout/PaymentMethods";
import { CustomCardForm } from "@/components/checkout/CustomCardForm";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { cardUtils } from "@/lib/card-utils";
import { OrderBumpCard } from "@/components/checkout/OrderBumpCard";

// Declare window.MercadoPago for types
declare global {
    interface Window {
        MercadoPago: any;
    }
}

export default function CheckoutPage() {
    const { productId } = useParams();
    const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
    const [allowedMethods, setAllowedMethods] = useState<string[]>(["credit_card", "pix", "bolbradesco"]);
    // Lifted state for payment method
    const [selectedMethod, setSelectedMethod] = useState<'credit_card' | 'pix' | 'bolbradesco'>('credit_card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
    const [installmentOptions, setInstallmentOptions] = useState<any[]>([]);

    // 1. Fetch Product
    const { data: product, isLoading: loadingProduct } = useQuery({
        queryKey: ["checkoutProduct", productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .eq("id", productId)
                .single();
            if (error) throw error;
            return data as Product;
        },
        enabled: !!productId
    });

    // Fetch Order Bumps aplicáveis
    const { data: orderBumps } = useQuery({
        queryKey: ["orderBumps", productId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("order_bumps")
                .select(`
                    id,
                    title,
                    description,
                    discount_percent,
                    offer_product:products!offer_product_id(id, name, price, image_url)
                `)
                .eq("is_active", true)
                .or(`trigger_product_id.eq.${productId},trigger_product_id.is.null`)
                .order("priority", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!productId
    });

    // 2. Fetch Gateway Public Key (Mercado Pago)
    const [gatewayId, setGatewayId] = useState<string | null>(null);
    const [mpLoaded, setMpLoaded] = useState(false);

    useEffect(() => {
        const fetchKeyAndLoadSdk = async () => {
            // Buscar chave pública do gateway
            const { data, error } = await supabase.rpc('get_gateway_public_key', { slug_input: 'mercadopago' });
            if (error) {
                console.error("[checkout] Error fetching gateway config:", error);
                toast.error("Erro ao carregar configuração de pagamento. Recarregue a página.");
                return;
            }
            if (data && data.length > 0) {
                const gatewayConfig = data[0];
                console.log("[checkout] Gateway config loaded:", {
                    hasPublicKey: Boolean(gatewayConfig.public_key),
                    gatewayId: gatewayConfig.gateway_id,
                    allowedMethods: gatewayConfig.allowed_methods
                });

                setMpPublicKey(gatewayConfig.public_key);
                setGatewayId(gatewayConfig.gateway_id);
                if (gatewayConfig.allowed_methods && gatewayConfig.allowed_methods.length > 0) {
                    setAllowedMethods(gatewayConfig.allowed_methods);
                }

                // Carregar SDK do Mercado Pago via script tag
                if (!window.MercadoPago) {
                    const script = document.createElement('script');
                    script.src = 'https://sdk.mercadopago.com/js/v2';
                    script.async = true;
                    script.onload = () => {
                        console.log("[checkout] MercadoPago SDK loaded successfully");
                        setMpLoaded(true);
                    };
                    script.onerror = () => {
                        console.error("[checkout] Failed to load MercadoPago SDK");
                        toast.error("Erro ao carregar SDK de pagamento. Verifique sua conexão.");
                    };
                    document.head.appendChild(script);
                } else {
                    setMpLoaded(true);
                }
            } else {
                console.error("[checkout] No gateway configuration found");
                toast.error("Gateway de pagamento não configurado. Contate o suporte.");
            }
        };
        fetchKeyAndLoadSdk();
    }, []);

    const form = useForm<CheckoutFormValues>({
        resolver: zodResolver(checkoutFormSchema),
        defaultValues: {
            name: "",
            email: "",
            cpf: "",
            phone: "",
            paymentMethod: "credit_card" // Default
        }
    });

    useEffect(() => {
        form.setValue("paymentMethod", selectedMethod);
    }, [selectedMethod, form]);

    const updateInstallments = async (cardNumber: string) => {
        if (cardNumber.length < 6 || !mpPublicKey || !window.MercadoPago) return;
        
        try {
            const mp = new window.MercadoPago(mpPublicKey);
            const bin = cardNumber.replace(/\s/g, '').substring(0, 6);
            
            const basePrice = product?.price || 1000;
            const bumpsTotal = selectedBumps.reduce((acc, bumpId) => {
                const bump = orderBumps?.find((b: any) => b.id === bumpId);
                if (bump?.offer_product) {
                    const offerProduct = bump.offer_product as any;
                    const discounted = Math.round(offerProduct.price * (1 - bump.discount_percent / 100));
                    return acc + discounted;
                }
                return acc;
            }, 0);
            
            const amount = (basePrice + bumpsTotal) / 100;

            const installments = await mp.getInstallments({
                amount: String(amount),
                bin: bin
            });

            if (installments && installments.length > 0) {
                // Limit to 12 installments if necessary, though MP usually returns what is configured
                const options = installments[0].payer_costs;
                setInstallmentOptions(options);
                // Auto-select first option (usually 1x) if not selected
                if (!form.getValues("installments")) {
                    form.setValue("installments", "1");
                }
            }
        } catch (error) {
            console.error("Error fetching installments:", error);
        }
    };


    const handlePaymentSubmit = async (data: CheckoutFormValues) => {
        setIsProcessing(true);
        try {
            console.log('[checkout] submit started', {
                paymentMethod: selectedMethod,
                gatewayId,
                hasPublicKey: Boolean(mpPublicKey),
                sdkLoaded: Boolean(window.MercadoPago)
            });

            // 1. If Credit Card, Tokenize
            let token = null;
            let paymentMethodId: string = selectedMethod;
            let issuerId: string | null = null;
            let installments = 1;

            if (selectedMethod === 'credit_card') {
                if (!mpPublicKey) throw new Error("Chave do MP não carregada.");

                // Verificar se SDK foi carregado
                if (!window.MercadoPago) {
                    throw new Error("SDK do Mercado Pago ainda não carregou. Aguarde e tente novamente.");
                }

                // Criar instância do MP
                const mp = new window.MercadoPago(mpPublicKey);

                // Create Card Token
                const cardFormData = {
                    cardNumber: cardUtils.normalizeCardNumber(data.cardNumber || ""),
                    cardholderName: data.cardHolder,
                    cardExpirationMonth: data.cardExpiration?.split('/')[0],
                    cardExpirationYear: "20" + data.cardExpiration?.split('/')[1], // Assume 20xx
                    securityCode: data.cardCvv,
                    identification: {
                        type: "CPF",
                        number: data.cpf.replace(/\D/g, "")
                    }
                };

                console.log("[checkout] Creating card token with data:", {
                    cardNumberLength: cardFormData.cardNumber.length,
                    hasCardholderName: Boolean(cardFormData.cardholderName),
                    expirationMonth: cardFormData.cardExpirationMonth,
                    expirationYear: cardFormData.cardExpirationYear,
                    hasCvv: Boolean(cardFormData.securityCode),
                    cpfLength: cardFormData.identification.number.length
                });

                try {
                    const tokenResponse = await mp.createCardToken(cardFormData);
                    console.log("[checkout] Token response:", { hasId: Boolean(tokenResponse?.id), tokenId: tokenResponse?.id });

                    if (!tokenResponse || !tokenResponse.id) {
                        throw new Error("Dados do cartão inválidos. Verifique número, validade e CVV.");
                    }

                    token = tokenResponse.id;

                    // Detectar bandeira do cartão
                    const bin = cardUtils.normalizeCardNumber(data.cardNumber || "").substring(0, 6);
                    const paymentMethodsResponse = await mp.getPaymentMethods({ bin });

                    if (paymentMethodsResponse.results && paymentMethodsResponse.results.length > 0) {
                        const pmResult = paymentMethodsResponse.results[0];
                        paymentMethodId = pmResult.id; // "master", "visa", etc.
                        issuerId = pmResult.issuer?.id || null; // Pode ser null
                        console.log("[checkout] Payment method detected:", { paymentMethodId, issuerId });
                    } else {
                        // Fallback para master se não encontrar
                        paymentMethodId = "master";
                        console.log("[checkout] No payment method found, using fallback: master");
                    }
                } catch (tokenError: any) {
                    console.error("[checkout] Tokenization error:", tokenError);
                    throw new Error(tokenError.message || "Erro ao processar dados do cartão. Verifique as informações.");
                }
            }

            // 2. Call Backend
            if (!gatewayId) throw new Error("Gateway não configurado");

            const idempotencyKey = crypto.randomUUID();

            console.log("[checkout] Calling payment-ops with payload:", {
                action: 'create_paymentIntent',
                productId,
                gatewayId,
                hasToken: Boolean(token),
                payment_method_id: paymentMethodId,
                issuer_id: issuerId,
                installments: Number(data.installments || 1)
            });

            const { data: result, error } = await supabase.functions.invoke('payment-ops', {
                body: {
                    action: 'create_paymentIntent',
                    payload: {
                        productId: productId,
                        gatewayId: gatewayId,
                        token,
                        payment_method_id: paymentMethodId,
                        issuer_id: issuerId,
                        installments: Number(data.installments || 1),
                        idempotencyKey,

                        // Customer Data
                        cpf: data.cpf,
                        name: data.name,
                        email: data.email,
                        phone: data.phone,

                        amount: product?.price || product?.checkout_config?.price || 1000,
                        orderBumps: selectedBumps
                    }
                }
            });

            console.log("[checkout] payment-ops response:", {
                hasError: Boolean(error),
                hasResult: Boolean(result),
                status: result?.status,
                orderId: result?.orderId
            });

            // Verificar se houve erro na função
            if (error) {
                // Tentar extrair erro detalhado do context
                let errorMessage = error.message || "Erro na função de pagamento";
                try {
                    // FunctionsHttpError pode ter context com body
                    if ((error as any).context?.body) {
                        const body = await (error as any).context.json();
                        errorMessage = body.error || body.message || errorMessage;
                    }
                } catch (e) {
                    // Failed to parse error body
                }
                console.error("[checkout] Backend error:", errorMessage);
                throw new Error(errorMessage);
            }

            // Verificar se result contém erro
            if (result?.error) {
                console.error("[checkout] Result contains error:", result.error);
                throw new Error(result.error);
            }

            // Construir URL de redirecionamento para página de obrigado
            const orderId = result.orderId || result.internalPaymentId || result.external_id;
            const method = selectedMethod === 'credit_card' ? 'card' : selectedMethod === 'pix' ? 'pix' : 'boleto';

            let redirectUrl = `/checkout/obrigado/${orderId}?method=${method}`;

            // Adicionar QR Code ou ticket URL se houver
            if (result.qr_code) {
                redirectUrl += `&qrcode=${encodeURIComponent(result.qr_code)}`;
            }
            if (result.ticket_url) {
                redirectUrl += `&ticket=${encodeURIComponent(result.ticket_url)}`;
            }

            console.log("[checkout] Payment completed:", {
                status: result.status,
                orderId,
                method,
                hasQrCode: Boolean(result.qr_code),
                hasTicketUrl: Boolean(result.ticket_url),
                redirectUrl
            });

            // Se aprovado imediatamente (cartão), mostrar sucesso e redirecionar
            if (result.status === 'paid') {
                toast.success("Pagamento aprovado! 🎉");
            } else {
                toast.success("Pagamento processado!");
            }

            // Redirecionar para página de obrigado
            window.location.href = redirectUrl;

        } catch (e: any) {
            console.error("[checkout] Payment error:", e);
            toast.error(e.message || "Erro ao processar pagamento.");
        } finally {
            setIsProcessing(false);
        }
    };

    if (loadingProduct) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
    if (!product) return <div className="p-8 text-center">Produto não encontrado</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda: Formulários */}
            <div className="lg:col-span-7 space-y-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handlePaymentSubmit)} className="space-y-6">
                        <CustomerForm form={form} />

                        <PaymentMethods
                            form={form}
                            onMethodChange={(m) => setSelectedMethod(m)}
                            allowedMethods={allowedMethods}
                        />

                        {/* Renderiza Formulário Customizado APENAS para Cartão */}
                        {selectedMethod === 'credit_card' && (
                            <CustomCardForm 
                                form={form} 
                                installmentOptions={installmentOptions}
                                onCardNumberChange={updateInstallments}
                            />
                        )}

                        {/* Order Bumps */}
                        {orderBumps && orderBumps.length > 0 && (
                            <div className="space-y-3">
                                {orderBumps.map((bump: any) => (
                                    <OrderBumpCard
                                        key={bump.id}
                                        bump={bump}
                                        selected={selectedBumps.includes(bump.id)}
                                        onToggle={(id) => {
                                            setSelectedBumps(prev =>
                                                prev.includes(id)
                                                    ? prev.filter(b => b !== id)
                                                    : [...prev, id]
                                            )
                                        }}
                                    />
                                ))}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-5 w-5" />
                                    Pagar R$ {(() => {
                                        const basePrice = product?.price || 1000;
                                        const bumpsTotal = selectedBumps.reduce((acc, bumpId) => {
                                            const bump = orderBumps?.find((b: any) => b.id === bumpId);
                                            if (bump?.offer_product) {
                                                const offerProduct = bump.offer_product as any;
                                                const discounted = Math.round(offerProduct.price * (1 - bump.discount_percent / 100));
                                                return acc + discounted;
                                            }
                                            return acc;
                                        }, 0);
                                        return ((basePrice + bumpsTotal) / 100).toFixed(2).replace('.', ',');
                                    })()}
                                </>
                            )}
                        </Button>

                        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                            <Lock className="w-3 h-3" />
                            Ambiente Criptografado e Seguro
                        </div>

                    </form>
                </Form>
            </div>

            {/* Coluna Direita: Resumo (Sticky) */}
            <div className="lg:col-span-5 lg:sticky lg:top-8">
                <OrderSummary
                    product={product}
                    isLoading={loadingProduct}
                    selectedBumps={selectedBumps}
                    orderBumps={orderBumps as any}
                />
            </div>
        </div>
    );
}
