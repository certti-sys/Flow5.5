
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/payment";
import { checkoutFormSchema, CheckoutFormValues } from "@/types/checkout-form";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { CustomerForm } from "@/components/checkout/CustomerForm";
import { BoletoAddressForm } from "@/components/checkout/BoletoAddressForm";
import { PaymentMethods } from "@/components/checkout/PaymentMethods";
import { CustomCardForm } from "@/components/checkout/CustomCardForm";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { cardUtils } from "@/lib/card-utils";
import { OrderBumpCard } from "@/components/checkout/OrderBumpCard";
import { CouponInput } from "@/features/coupons/components/CouponInput";
import { CouponValidationResult } from "@/features/coupons/types";
import { StripeCardElement } from "@/components/checkout/StripeCardElement";
import { ErrorState } from "@/components/ErrorState";
import { detectUserCurrency, selectGatewayByCurrency } from "@/utils/currency";
import { normalizeCheckoutConfig } from "@/types/checkout-config";
import {
    fetchCheckoutGateways,
    resolveCheckoutGateways,
    type CheckoutMethod,
} from "@/lib/checkout-gateways";
import { CheckoutContentBlocks, CheckoutYoutube } from "@/components/checkout/CheckoutContentBlocks";
import { CheckoutTimer } from "@/components/checkout/CheckoutTimer";
import { CheckoutReviews } from "@/components/checkout/CheckoutReviews";
import { CheckoutSupportButton } from "@/components/checkout/CheckoutSupportButton";
import { CheckoutFooter } from "@/components/checkout/CheckoutFooter";

// Declare window.MercadoPago for types
declare global {
    interface Window {
        MercadoPago: any;
    }
}

type GatewaySlug = 'mercadopago' | 'stripe' | 'asaas' | 'pushinpay' | 'pagarme' | 'paypal' | 'efi' | 'cajupay';

export default function CheckoutPage() {
    const { productId, slug } = useParams<{ productId?: string; slug?: string }>();
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
    const [selectedGateway, setSelectedGateway] = useState<GatewaySlug>('mercadopago');
    // Gateway escolhido para cada método no produto (checkout_config.payment_gateways).
    const [methodGateways, setMethodGateways] = useState<Partial<Record<CheckoutMethod, GatewaySlug>>>({});
    const [stripePublicKey, setStripePublicKey] = useState<string | null>(null);
    const [stripeClientSecret, setStripeClientSecret] = useState<string | null>(null);
    const [stripeOrderId, setStripeOrderId] = useState<string | null>(null);

    // 1. Fetch Product (por UUID ou pelo slug público /c/:slug)
    const { data: product, isLoading: loadingProduct, error: productError, refetch: refetchProduct } = useQuery({
        queryKey: ["checkoutProduct", productId ?? slug],
        queryFn: async () => {
            // maybeSingle(): id/slug inexistente devolve null em vez de 406 (PGRST116),
            // que aparecia como erro de rede no console para links inválidos.
            let query = supabase.from("products").select("*");

            query = productId
                ? query.eq("id", productId)
                : query.eq("checkout_slug", slug!).eq("active", true);

            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            return data as Product | null;
        },
        enabled: !!productId || !!slug
    });

    // Configuração de personalização normalizada (defaults + banco).
    const config = useMemo(
        () => normalizeCheckoutConfig(product?.checkout_config),
        [product?.checkout_config]
    );

    const resolvedProductId = product?.id ?? productId;

    // Campos exigidos pelos gateways (independente da configuração do produto).
    const gatewayRequiresCpf = selectedGateway === 'pagarme'
        || (selectedGateway === 'mercadopago' && selectedMethod === 'credit_card');
    const showCpfField = config.customer_fields.cpf || gatewayRequiresCpf;
    const showPhoneField = config.customer_fields.phone;
    const showCouponField = config.customer_fields.coupon;

    // SEO / metadados do checkout configurados no admin.
    useEffect(() => {
        if (!product) return;

        const previousTitle = document.title;
        document.title = config.seo.title || product.name;

        const managed: Array<{ el: HTMLMetaElement | HTMLLinkElement; previous: string | null }> = [];

        const ensureMeta = (attr: "name" | "property", key: string, content: string) => {
            if (!content) return;
            const selector = `meta[${attr}="${key}"]`;
            let el = document.head.querySelector<HTMLMetaElement>(selector);
            const previous = el?.getAttribute("content") ?? null;
            if (!el) {
                el = document.createElement("meta");
                el.setAttribute(attr, key);
                document.head.appendChild(el);
            }
            el.setAttribute("content", content);
            managed.push({ el, previous });
        };

        const ensureIcon = (href: string) => {
            if (!href) return;
            let el = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
            const previous = el?.getAttribute("href") ?? null;
            if (!el) {
                el = document.createElement("link");
                el.setAttribute("rel", "icon");
                document.head.appendChild(el);
            }
            el.setAttribute("href", href);
            managed.push({ el, previous });
        };

        ensureMeta("name", "description", config.seo.description);
        ensureMeta("property", "og:title", config.seo.title || product.name);
        ensureMeta("property", "og:description", config.seo.description);
        ensureMeta("property", "og:image", config.seo.og_image);
        ensureIcon(config.seo.favicon);

        return () => {
            document.title = previousTitle;
            for (const { el, previous } of managed) {
                if (previous === null) el.remove();
                else if (el instanceof HTMLMetaElement) el.setAttribute("content", previous);
                else el.setAttribute("href", previous);
            }
        };
    }, [product, config]);

    // Cor de fundo do checkout (aplicada no layout via --checkout-bg).
    useEffect(() => {
        const root = document.documentElement;
        const background = config.appearance.background_color;

        if (background) root.style.setProperty('--checkout-bg', background);
        else root.style.removeProperty('--checkout-bg');

        return () => {
            root.style.removeProperty('--checkout-bg');
        };
    }, [config.appearance.background_color]);

    // Fetch Order Bumps aplicáveis
    const { data: orderBumps } = useQuery({
        queryKey: ["orderBumps", resolvedProductId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("order_bumps")
                .select(`
                    id,
                    title,
                    description,
                    discount_percent,
                    color,
                    offer_product:products!offer_product_id(id, name, price, image_url)
                `)
                .eq("is_active", true)
                .or(`trigger_product_id.eq.${resolvedProductId},trigger_product_id.is.null`)
                .order("priority", { ascending: false });
            if (error) throw error;
            return data;
        },
        enabled: !!resolvedProductId
    });

    // 2. Fetch Gateway Public Key (Mercado Pago)
    const [gatewayId, setGatewayId] = useState<string | null>(null);
    const [mpLoaded, setMpLoaded] = useState(false);

    // Detect currency and gateway on mount
    useEffect(() => {
        const load = async () => {
            try {
                const active = await fetchCheckoutGateways();

                if (active.length === 0) {
                    console.error('❌ No active gateways found');
                    toast.error('Nenhum gateway de pagamento ativo');
                    return;
                }

                const detectedCurrency = detectUserCurrency();
                const currencySlug = selectGatewayByCurrency(detectedCurrency);
                const resolved = resolveCheckoutGateways(config, active, currencySlug);

                setMethodGateways(resolved.byMethod as Partial<Record<CheckoutMethod, GatewaySlug>>);
                setAllowedMethods(resolved.methods);

                if (resolved.fallback) setSelectedGateway(resolved.fallback as GatewaySlug);
            } catch (error) {
                console.error('Error fetching active gateways:', error);
            }
        };

        load();
        // config muda quando o produto carrega; os gateways só são lidos uma vez.
    }, [config.payment_gateways.card, config.payment_gateways.pix, config.payment_gateways.boleto]);

    useEffect(() => {
        const fetchKeyAndLoadSdk = async () => {
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
                }
            }
        };
        if (selectedGateway) {
            fetchKeyAndLoadSdk();
        }
    }, [selectedGateway]);

    // O gateway segue o método escolhido (mapa `payment_gateways` do produto).
    useEffect(() => {
        const slug = methodGateways[selectedMethod as CheckoutMethod];
        // Trocar de gateway invalida o Payment Intent em andamento.
        setStripeClientSecret(null);
        if (slug && slug !== selectedGateway) {
            setSelectedGateway(slug);
            return;
        }
        // Sem mapa para o método, usa o gateway padrão. Nunca deixa o gateway
        // atual sem suportar o método selecionado.
        if (!slug && allowedMethods.length > 0 && !allowedMethods.includes(selectedMethod)) {
            const next = allowedMethods[0] as CheckoutMethod;
            const nextSlug = methodGateways[next];
            setSelectedMethod(next);
            if (nextSlug) setSelectedGateway(nextSlug);
        }
    }, [selectedMethod, methodGateways, allowedMethods, selectedGateway]);

    // PayPal e Stripe cobram em USD; os demais em BRL.
    useEffect(() => {
        setCurrency(selectedGateway === 'stripe' || selectedGateway === 'paypal' ? 'USD' : 'BRL');
    }, [selectedGateway]);

    // O Payment Intent do Stripe é criado só no submit (handleStripePayment).
    // Criá-lo no mount gerava um pedido órfão a cada abertura do checkout.
    // Reset Stripe PI when bumps or coupon change to ensure correct amount
    useEffect(() => {
        if (stripeClientSecret) {
            setStripeClientSecret(null);
        }
    }, [selectedBumps, appliedCoupon]);

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

    // Prefill para comprador logado (visitante começa vazio).
    useEffect(() => {
        let active = true;

        supabase.auth.getUser().then(({ data }) => {
            if (!active || !data.user) return;
            const metadata = data.user.user_metadata ?? {};

            if (!form.getValues("email")) form.setValue("email", data.user.email ?? "");
            if (!form.getValues("name") && metadata.name) form.setValue("name", metadata.name);
            if (!form.getValues("phone")) {
                const phone = metadata.whatsapp || metadata.phone;
                if (phone) form.setValue("phone", phone);
            }
            if (!form.getValues("cpf") && metadata.cpf) form.setValue("cpf", metadata.cpf);
        });

        return () => {
            active = false;
        };
    }, [form]);

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
          const validation = checkoutFormSchema.safeParse({
            ...data,
            gateway: selectedGateway,
            paymentMethod: (data.paymentMethod ?? selectedMethod) as any,
          });
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

          // Obrigatoriedade condicional: respeita o checkout_config e o gateway.
          if (showCpfField && !cardUtils.validateCPF(data.cpf || "")) {
            form.setError("cpf", { message: "CPF inválido ou incompleto" });
            setIsProcessing(false);
            toast.error("Informe um CPF válido.");
            return;
          }

          if (showPhoneField && (!data.phone || data.phone.replace(/\D/g, "").length < 10)) {
            form.setError("phone", { message: "Telefone inválido ou incompleto" });
            setIsProcessing(false);
            toast.error("Informe um celular válido.");
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

            if (selectedGateway === 'mercadopago' && selectedMethod === 'credit_card') {
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
                        number: (data.cpf || "").replace(/\D/g, "")
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

            // 2. Checkout público: visitante pode comprar; o backend resolve/cria
            // a conta pelo e-mail antes de criar o pedido.

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
                    productId: resolvedProductId,
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
                    discountAmount: couponDiscountInCents,
                    address: selectedMethod === 'bolbradesco'
                        ? {
                            zip_code: (data.zipCode || '').replace(/\D/g, ''),
                            street_name: data.streetName || '',
                            street_number: data.streetNumber || '',
                            neighborhood: data.neighborhood || '',
                            city: data.city || '',
                            federal_unit: (data.federalUnit || '').toUpperCase(),
                        }
                        : undefined,
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

            // Gateways com página hospedada (ex.: cartão no Asaas) devolvem a URL
            // onde o cliente conclui o pagamento.
            if (result.redirect_url) {
                toast.success("Redirecionando para o ambiente seguro de pagamento...");
                window.location.href = result.redirect_url;
                return;
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


    const handleStripePayment = async (data: CheckoutFormValues) => {
        try {
            // 1. Checkout público: visitante pode comprar; o backend resolve a conta.

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
                    productId: resolvedProductId,
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
                // A página de obrigado precisa do id do PEDIDO (não do PaymentIntent).
                setStripeOrderId(result.orderId ?? null);
            } else {
                throw new Error("Client secret não retornado pelo backend");
            }

        } catch (e: any) {
            toast.error(e.message || "Erro ao processar pagamento.");
            setIsProcessing(false);
        }
    };

    const handleStripeSuccess = async (_paymentIntentId: string) => {
        toast.success("Pagamento aprovado! 🎉");
        if (!stripeOrderId) {
            // Sem o pedido não há como consultar o status na página de obrigado.
            window.location.href = "/";
            return;
        }
        window.location.href = `/checkout/obrigado/${stripeOrderId}?method=card`;
    };

    const handleStripeError = (error: string) => {
        toast.error(error);
        setIsProcessing(false);
        setStripeClientSecret(null); // Reset to allow retry
    };

    if (loadingProduct) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
    if (productError) {
        return (
            <ErrorState
                title="Não foi possível carregar o produto"
                description="Verifique o link do checkout ou tente novamente em instantes."
                onRetry={() => refetchProduct()}
            />
        );
    }
    if (!product) return <ErrorState title="Produto não encontrado" description="O link deste checkout pode estar incorreto ou o produto foi removido." />;

    const buyButtonColor = config.appearance.buy_button_color || config.appearance.primary_color || undefined;
    const buyButtonText = config.appearance.buy_button_text?.trim();

    return (
        <div className="space-y-8">
            <CheckoutTimer
                config={config.timer}
                storageKey={`checkout-timer:${resolvedProductId ?? slug ?? "produto"}`}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Coluna Esquerda: Formulários */}
                <div className="lg:col-span-7 space-y-6">
                    {config.logo_url && (
                        <img
                            src={config.logo_url}
                            alt={product.name}
                            className="h-12 w-auto object-contain"
                        />
                    )}

                    {config.banner_url && (
                        <img
                            src={config.banner_url}
                            alt=""
                            className="w-full rounded-xl border object-cover"
                            loading="eager"
                        />
                    )}

                    {config.youtube_position === 'top' && (
                        <CheckoutYoutube url={config.youtube_url} />
                    )}

                    <CheckoutContentBlocks
                        blocks={config.appearance.content_blocks}
                        placement="main"
                    />

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
                            <CustomerForm
                                form={form}
                                showCpf={showCpfField}
                                showPhone={showPhoneField}
                            />

                            {selectedMethod === 'bolbradesco' && (
                                <BoletoAddressForm form={form} />
                            )}

                            {/* Stripe Payment Element */}
                            {selectedGateway === 'stripe' && stripePublicKey && stripeClientSecret && (
                                <StripeCardElement
                                    publicKey={stripePublicKey}
                                    clientSecret={stripeClientSecret}
                                    orderId={stripeOrderId ?? undefined}
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

                            {/* Seletor de método — um gateway por método (mapa do produto). */}
                            {allowedMethods.length > 0 && (
                                <>
                                    <PaymentMethods
                                        form={form}
                                        onMethodChange={(m) => {
                                            setSelectedMethod(m);
                                            // Mantém o formulário sincronizado para que a
                                            // validação condicional (cartão/boleto) rode no submit.
                                            form.setValue('paymentMethod', m, { shouldValidate: false });
                                        }}
                                        allowedMethods={allowedMethods}
                                    />

                                    {/* Gateways com página hospedada: o cartão é digitado no ambiente do gateway (PCI). */}
                                    {selectedMethod === 'credit_card' && (selectedGateway === 'asaas' || selectedGateway === 'pagarme' || selectedGateway === 'paypal' || selectedGateway === 'efi' || selectedGateway === 'cajupay') && (
                                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/[0.06] p-4 text-sm text-muted-foreground">
                                            O cartão é processado no ambiente seguro do {selectedGateway === 'asaas' ? 'Asaas' : selectedGateway === 'pagarme' ? 'Pagar.me' : selectedGateway === 'paypal' ? 'PayPal' : selectedGateway === 'efi' ? 'Efí' : 'CajuPay'}. Ao confirmar,
                                            você será redirecionado para concluir o pagamento{selectedGateway === 'paypal' ? ' (valor em dólar)' : ''}.
                                        </div>
                                    )}

                                    {/* Formulário de cartão customizado apenas no Mercado Pago. */}
                                    {selectedMethod === 'credit_card' && selectedGateway === 'mercadopago' && (
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

                            {/* Submit Button - Stripe usa este botão só para gerar o
                                Payment Intent e então mostra o Element. */}
                            {allowedMethods.length > 0 && !(selectedGateway === 'stripe' && stripeClientSecret) && (
                                <>
                                    <Button
                                        type="submit"
                                        className="w-full h-12 text-lg font-medium shadow-lg hover:shadow-xl transition-all"
                                        disabled={isProcessing}
                                        style={buyButtonColor ? { backgroundColor: buyButtonColor } : undefined}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Processando...
                                            </>
                                        ) : (
                                            <>
                                                <Lock className="mr-2 h-5 w-5" />
                                                {selectedGateway === 'stripe' ? (
                                                    buyButtonText || "Continuar para pagamento"
                                                ) : (
                                                    <>{buyButtonText || "Pagar"} {currency === 'USD' ? 'US$' : 'R$'} {(() => {
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
                                                        return currency === 'USD'
                                                            ? (finalAmountInCents / 100).toFixed(2)
                                                            : (finalAmountInCents / 100).toFixed(2).replace('.', ',');
                                                    })()}</>
                                                )}
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

                    {config.youtube_position === 'bottom' && (
                        <CheckoutYoutube url={config.youtube_url} />
                    )}
                </div>

                {/* Coluna Direita: Resumo (Sticky) */}
                <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-4">
                    {showCouponField && (
                        <div className="bg-card border rounded-lg p-6 shadow-sm">
                            <CouponInput
                                productId={resolvedProductId!}
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
                    )}

                    <OrderSummary
                        product={product}
                        isLoading={loadingProduct}
                        selectedBumps={selectedBumps}
                        orderBumps={orderBumps as any}
                        appliedCoupon={appliedCoupon}
                        previousPrice={config.summary.previous_price ? config.summary.previous_price / 100 : null}
                        discountText={config.summary.discount_text}
                        showDescription={config.summary.show_description}
                    />

                    {/* Blocos laterais ficam abaixo do resumo: no topo eles
                        empurravam o pedido para fora da primeira dobra. */}
                    <CheckoutContentBlocks
                        blocks={config.appearance.content_blocks}
                        placement="sidebar"
                    />

                    <CheckoutReviews reviews={config.reviews} />
                </div>
            </div>

            <CheckoutFooter config={config.footer} />
            <CheckoutSupportButton config={config.support_button} />
        </div>
    );
}

