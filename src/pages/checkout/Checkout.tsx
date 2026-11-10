
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { CouponInput } from "@/features/coupons/components/CouponInput";
import { CouponValidationResult } from "@/features/coupons/types";
import { StripeCardElement } from "@/components/checkout/StripeCardElement";
import { detectUserCurrency, selectGatewayByCurrency } from "@/utils/currency";

// Declare window.MercadoPago for types
declare global {
    interface Window {
        MercadoPago: any;
    }
}

export default function CheckoutPage() {
    const { productId } = useParams();
    const [mpPublicKey, setMpPublicKey] = useState<string | null>(null);
    const [allowedMethods, setAllowedMethods] = useState<string[]>([]);
    // Lifted state for payment method
    const [selectedMethod, setSelectedMethod] = useState<string>('credit_card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedBumps, setSelectedBumps] = useState<string[]>([]);
    const [installmentOptions, setInstallmentOptions] = useState<any[]>([]);
    const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

    // Stripe state
    const [currency, setCurrency] = useState<string>('BRL');
    const [selectedGateway, setSelectedGateway] = useState<'mercadopago' | 'stripe'>('mercadopago');
    const [stripePublicKey, setStripePublicKey] = useState<string | null>(null);
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
    const [isCreatingPaymentIntent, setIsCreatingPaymentIntent] = useState(false);

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

    // Detect currency and gateway on mount
    useEffect(() => {
        const fetchActiveGateways = async () => {
            // Buscar gateways ativos
            const { data: activeGateways, error } = await supabase
                .from('gateways')
                .select('slug')
                .eq('is_active', true);

            if (error) {
                console.error('Error fetching active gateways:', error);
                return;
            }

            console.log('🔌 Active gateways:', activeGateways);

            if (!activeGateways || activeGateways.length === 0) {
                console.error('❌ No active gateways found');
                toast.error('Nenhum gateway de pagamento ativo');
                return;
            }

            // Se houver apenas 1 gateway ativo, usar ele
            if (activeGateways.length === 1) {
                const gateway = activeGateways[0].slug as 'mercadopago' | 'stripe';
                console.log('✅ Single gateway mode:', gateway);
                setSelectedGateway(gateway);
                // Definir moeda baseada no gateway
                setCurrency(gateway === 'mercadopago' ? 'BRL' : 'USD');
                return;
            }

            // Se houver múltiplos gateways, usar detecção por locale
            const detectedCurrency = detectUserCurrency();
            setCurrency(detectedCurrency);
            const gateway = selectGatewayByCurrency(detectedCurrency);
            console.log('🌍 Multi-gateway mode - Currency:', detectedCurrency, '→ Gateway:', gateway);

            // Verificar se o gateway selecionado está ativo
            const isGatewayActive = activeGateways.some(g => g.slug === gateway);
            if (isGatewayActive) {
                setSelectedGateway(gateway);
            } else {
                // Fallback para o primeiro gateway ativo
                const fallbackGateway = activeGateways[0].slug as 'mercadopago' | 'stripe';
                console.warn('⚠️ Selected gateway not active, using fallback:', fallbackGateway);
                setSelectedGateway(fallbackGateway);
            }
        };

        fetchActiveGateways();
    }, []);

    useEffect(() => {
        const fetchKeyAndLoadSdk = async () => {
            // Fetch gateway based on selected gateway
            const gatewaySlug = selectedGateway;
            console.log('🔍 Fetching gateway config for:', gatewaySlug);

            const { data, error } = await supabase.rpc('get_gateway_public_key', { slug_input: gatewaySlug });
            if (error) {
                console.error("Error fetching PK:", error);
                return;
            }
            console.log('📦 Gateway config received:', data);
            if (data && data.length > 0) {
                const gatewayConfig = data[0];
                setGatewayId(gatewayConfig.gateway_id);

                if (gatewaySlug === 'mercadopago') {
                    setMpPublicKey(gatewayConfig.public_key);
                    if (gatewayConfig.allowed_methods && gatewayConfig.allowed_methods.length > 0) {
                        setAllowedMethods(gatewayConfig.allowed_methods);
                    }

                    // Carregar SDK do Mercado Pago via script tag
                    if (!window.MercadoPago) {
                        const script = document.createElement('script');
                        script.src = 'https://sdk.mercadopago.com/js/v2';
                        script.async = true;
                        script.onload = () => {
                            setMpLoaded(true);
                        };
                        script.onerror = () => {
                            // SDK loading failed
                        };
                        document.head.appendChild(script);
                    } else {
                        setMpLoaded(true);
                    }
                } else if (gatewaySlug === 'stripe') {
                    setStripePublicKey(gatewayConfig.public_key);
                    if (gatewayConfig.allowed_methods && gatewayConfig.allowed_methods.length > 0) {
                        console.log('🔵 Stripe allowed_methods:', gatewayConfig.allowed_methods);
                        setAllowedMethods(gatewayConfig.allowed_methods);
                    } else {
                        console.warn('⚠️ Stripe sem allowed_methods, usando padrão');
                        setAllowedMethods(['card']);
                    }
                    // Payment Intent will be created by useEffect when product is ready
                }
            }
        };
        if (selectedGateway) {
            fetchKeyAndLoadSdk();
        }
    }, [selectedGateway]);

    // Create Stripe Payment Intent when ready
    useEffect(() => {
        if (selectedGateway === 'stripe' && gatewayId && product && !isCreatingPaymentIntent && !stripeClientSecret) {
            console.log('🎯 Conditions met for PI creation:', { gatewayId, productPrice: product.price });
            setIsCreatingPaymentIntent(true);
            createStripePaymentIntent(gatewayId);
        }
    }, [selectedGateway, gatewayId, product, isCreatingPaymentIntent, stripeClientSecret]);

    const form = useForm<CheckoutFormValues>({
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

            const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
            const totalInCents = Math.max(0, basePrice + bumpsTotal - couponDiscountInCents);
            const amount = totalInCents / 100;

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
          const validation = checkoutFormSchema.safeParse(data);
          if (!validation.success) {
            validation.error.issues.forEach((err) => {
              if (err.path[0]) {
                form.setError(err.path[0] as string, { message: err.message });
              }
            });
            setIsProcessing(false);
            toast.error("Verifique os campos obrigatórios do checkout.");
            return;
          }

            // If Stripe gateway, create Payment Intent first
            if (selectedGateway === 'stripe') {
                await handleStripePayment(data);
                return;
            }

            // Mercado Pago flow continues below
            // [DEBUG] Temporary instrumentation to verify submit is reached
            console.log('[checkout] submit disparado', {
                paymentMethod: selectedMethod,
                gatewayId,
                hasPublicKey: Boolean(mpPublicKey),
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

                console.log(">>> Criando token com dados:", cardFormData);

                try {
                    const tokenResponse = await mp.createCardToken(cardFormData);

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
                    } else {
                        // Fallback para master se não encontrar
                        paymentMethodId = "master";
                    }
                } catch (tokenError: any) {
                    throw new Error(tokenError.message || "Erro ao processar dados do cartão. Verifique as informações.");
                }
            }

            // 2. Verify user is authenticated
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error("Você precisa estar autenticado para fazer uma compra. Faça login e tente novamente.");
            }

            // 3. Call Backend
            if (!gatewayId) throw new Error("Gateway não configurado");

            const idempotencyKey = crypto.randomUUID();

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

            const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
            const finalAmountInCents = Math.max(0, basePrice + bumpsTotal - couponDiscountInCents);

            const payloadToSend = {
                action: 'create_paymentIntent',
                payload: {
                    productId: productId,
                    gatewayId: gatewayId,
                    token: token || undefined,
                    payment_method_id: paymentMethodId || undefined,
                    issuer_id: issuerId ? String(issuerId) : undefined,
                    installments: selectedMethod === 'credit_card' ? Number(data.installments || 1) : undefined,
                    idempotencyKey,
                    cpf: data.cpf,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    amount: finalAmountInCents,
                    orderBumps: selectedBumps,
                    couponId: appliedCoupon?.valid ? appliedCoupon.coupon?.id : null,
                    couponCode: appliedCoupon?.valid ? appliedCoupon.coupon?.code : null,
                    discountAmount: couponDiscountInCents
                }
            };

            console.log('[checkout] Enviando para payment-ops:', payloadToSend);

            const { data: result, error } = await supabase.functions.invoke('payment-ops', {
                body: payloadToSend
            });

            // Verificar se houve erro na função
            if (error) {
                console.error('[checkout] Erro da payment-ops:', error);
                // Tentar extrair erro detalhado do context
                let errorMessage = error.message || "Erro na função de pagamento";
                try {
                    // FunctionsHttpError pode ter context com body
                    if ((error as any).context?.body) {
                        const body = await (error as any).context.json();
                        console.error('[checkout] Erro detalhado:', body);
                        console.error('[checkout] Details completo:', JSON.stringify(body.details, null, 2));
                        errorMessage = body.error || body.message || errorMessage;
                    }
                } catch (e) {
                    // Failed to parse error body
                }
                throw new Error(errorMessage);
            }

            // Verificar se result contém erro
            if (result?.error) {
                throw new Error(result.error);
            }

            console.log('[checkout] Resposta da payment-ops:', result);

            // Construir URL de redirecionamento para página de obrigado
            const orderId = result.orderId || result.internalPaymentId || result.external_id;
            const method = selectedMethod === 'credit_card' ? 'card' : selectedMethod === 'pix' ? 'pix' : 'boleto';

            let redirectUrl = `/checkout/obrigado/${orderId}?method=${method}`;

            // Adicionar QR Code ou ticket URL se houver
            if (result.qr_code) {
                redirectUrl += `&qrcode=${encodeURIComponent(result.qr_code)}`;
            }
            if (result.qr_code_base64) {
                redirectUrl += `&qrcode_base64=${encodeURIComponent(result.qr_code_base64)}`;
            }
            if (result.ticket_url) {
                redirectUrl += `&ticket=${encodeURIComponent(result.ticket_url)}`;
            }

            // Se aprovado imediatamente (cartão), mostrar sucesso e redirecionar
            if (result.status === 'paid') {
                toast.success("Pagamento aprovado! 🎉");
            } else {
                toast.success("Pagamento processado!");
            }

            // Redirecionar para página de obrigado
            window.location.href = redirectUrl;

        } catch (e: any) {
            toast.error(e.message || "Erro ao processar pagamento.");
        } finally {
            setIsProcessing(false);
        }
    };


    const createStripePaymentIntent = async (gatewayIdParam: string) => {
        try {
            console.log('💳 Creating Stripe Payment Intent...');
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                console.warn('User not authenticated yet');
                setIsCreatingPaymentIntent(false);
                return;
            }
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
            const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
            const finalAmountInCents = Math.max(0, basePrice + bumpsTotal - couponDiscountInCents);
            const { data: result, error } = await supabase.functions.invoke('payment-ops', {
                body: {
                    action: 'create_paymentIntent',
                    payload: {
                        productId: productId,
                        gatewayId: gatewayIdParam,
                        amount: finalAmountInCents,
                        orderBumps: selectedBumps,
                        couponId: appliedCoupon?.valid ? appliedCoupon.coupon?.id : null,
                        couponCode: appliedCoupon?.valid ? appliedCoupon.coupon?.code : null,
                        discountAmount: couponDiscountInCents
                    }
                }
            });
            if (error) {
                console.error('❌ Error creating PI:', error);
                setIsCreatingPaymentIntent(false);
                return;
            }
            if (result?.client_secret) {
                console.log('✅ PI created successfully');
                setStripeClientSecret(result.client_secret);
                setIsCreatingPaymentIntent(false);
            }
        } catch (e: any) {
            console.error('❌ Exception creating PI:', e);
            setIsCreatingPaymentIntent(false);
        }
    };
    const handleStripePayment = async (data: CheckoutFormValues) => {
        try {
            // 1. Verify user is authenticated
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) {
                throw new Error("Você precisa estar autenticado para fazer uma compra. Faça login e tente novamente.");
            }

            // 2. Calculate final amount
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

            const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
            const finalAmountInCents = Math.max(0, basePrice + bumpsTotal - couponDiscountInCents);

            // 3. Create Payment Intent via backend
            if (!gatewayId) throw new Error("Gateway não configurado");

            const payloadToSend = {
                action: 'create_paymentIntent',
                payload: {
                    productId: productId,
                    gatewayId: gatewayId,
                    cpf: data.cpf,
                    name: data.name,
                    email: data.email,
                    phone: data.phone,
                    amount: finalAmountInCents,
                    orderBumps: selectedBumps,
                    couponId: appliedCoupon?.valid ? appliedCoupon.coupon?.id : null,
                    couponCode: appliedCoupon?.valid ? appliedCoupon.coupon?.code : null,
                    discountAmount: couponDiscountInCents
                }
            };

            console.log('[checkout] Creating Stripe Payment Intent:', payloadToSend);

            const { data: result, error } = await supabase.functions.invoke('payment-ops', {
                body: payloadToSend
            });

            if (error) {
                console.error('[checkout] Erro da payment-ops:', error);
                let errorMessage = error.message || "Erro na função de pagamento";
                try {
                    if ((error as any).context?.body) {
                        const body = await (error as any).context.json();
                        console.error('[checkout] Erro detalhado:', body);
                        errorMessage = body.error || body.message || errorMessage;
                    }
                } catch (e) {
                    // Failed to parse error body
                }
                throw new Error(errorMessage);
            }

            if (result?.error) {
                throw new Error(result.error);
            }

            console.log('[checkout] Payment Intent created:', result);

            // 4. Set client secret to render Stripe Elements
            if (result.client_secret) {
                setStripeClientSecret(result.client_secret);
            } else {
                throw new Error("Client secret não retornado pelo backend");
            }

        } catch (e: any) {
            toast.error(e.message || "Erro ao processar pagamento.");
            setIsProcessing(false);
        }
    };

    const handleStripeSuccess = async (paymentIntentId: string) => {
        toast.success("Pagamento aprovado! 🎉");
        // Redirect to thank you page
        window.location.href = `/checkout/obrigado/${paymentIntentId}?method=card`;
    };

    const handleStripeError = (error: string) => {
        toast.error(error);
        setIsProcessing(false);
        setStripeClientSecret(null); // Reset to allow retry
    };

    if (loadingProduct) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
    if (!product) return <div className="p-8 text-center">Produto não encontrado</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Coluna Esquerda: Formulários */}
            <div className="lg:col-span-7 space-y-6">
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(
                            handlePaymentSubmit,
                            (errors) => {
                                // [DEBUG] Temporary instrumentation for validation errors
                                console.error('[checkout] validation errors', errors);
                                toast.error('Verifique os campos obrigatórios do checkout.');
                            }
                        )}
                        className="space-y-6"
                    >
                        <CustomerForm form={form} />

                        {/* Stripe Payment Element */}
                        {selectedGateway === 'stripe' && stripePublicKey && stripeClientSecret && (
                            <StripeCardElement
                                publicKey={stripePublicKey}
                                clientSecret={stripeClientSecret}
                                amount={(() => {
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
                                    const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
                                    return Math.max(0, basePrice + bumpsTotal - couponDiscountInCents);
                                })()}
                                currency={currency}
                                onSuccess={handleStripeSuccess}
                                onError={handleStripeError}
                            />
                        )}

                        {/* Mercado Pago Payment Methods */}
                        {selectedGateway === 'mercadopago' && allowedMethods.length > 0 && (
                            <>
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
                            </>
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

                        {/* Submit Button - Only show for Mercado Pago, Stripe has its own button */}
                        {selectedGateway === 'mercadopago' && (
                            <>
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
                                                const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
                                                const finalAmountInCents = Math.max(0, basePrice + bumpsTotal - couponDiscountInCents);
                                                return (finalAmountInCents / 100).toFixed(2).replace('.', ',');
                                            })()}
                                        </>
                                    )}
                                </Button>

                                <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
                                    <Lock className="w-3 h-3" />
                                    Ambiente Criptografado e Seguro
                                </div>
                            </>
                        )}

                    </form>
                </Form>
            </div>

            {/* Coluna Direita: Resumo (Sticky) */}
            <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
                <div className="bg-card border rounded-lg p-6 shadow-sm">
                    <CouponInput
                        productId={productId!}
                        amount={(() => {
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
                            return (basePrice + bumpsTotal) / 100;
                        })()}
                        onApply={(result) => setAppliedCoupon(result)}
                        disabled={isProcessing}
                    />
                </div>

                <OrderSummary
                    product={product}
                    isLoading={loadingProduct}
                    selectedBumps={selectedBumps}
                    orderBumps={orderBumps as any}
                    appliedCoupon={appliedCoupon}
                />
            </div>
        </div>
    );
}

