import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Copy, Check, ArrowRight, Home, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/ErrorState";

interface PublicOrderItem {
    product_id: string | null;
    name: string;
    image_url: string | null;
    quantity: number;
    unit_amount: number;
    kind: string;
}

interface PublicOrder {
    id: string;
    status: string;
    total_amount: number;
    currency: string;
    customer_first_name: string | null;
    created_at: string;
    paid_at: string | null;
    items: PublicOrderItem[];
    redirect_after_purchase: string | null;
    payment: { status: string; method: string | null } | null;
}

export default function ThankYouPage() {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const paymentMethod = searchParams.get("method") || "card";
    const ticketUrl = searchParams.get("ticket");
    const qrCode = searchParams.get("qrcode");
    const qrCodeBase64 = searchParams.get("qrcode_base64");

    const [copied, setCopied] = useState(false);
    const [order, setOrder] = useState<PublicOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) {
            setLoading(false);
            setLoadError("Pedido inválido");
            return;
        }

        let active = true;

        // RPC pública: a página de obrigado não exige login, e as tabelas
        // orders/order_items/payments só liberam leitura para autenticados.
        supabase
            .rpc("get_order_public", { p_order_id: orderId })
            .then(({ data, error }) => {
                if (!active) return;

                if (error) setLoadError(error.message);
                else if (!data) setLoadError("Pedido não encontrado");
                else setOrder(data as PublicOrder);

                setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [orderId]);

    // Polling de verificação de pagamento (reconfirma status no PSP a cada 3s enquanto pendente)
    useEffect(() => {
        if (!orderId) return;
        if (order?.status === "paid" || order?.payment?.status === "paid") return;

        let cancelled = false;
        const interval = setInterval(async () => {
            if (cancelled) return;
            try {
                const { data, error } = await supabase.functions.invoke("payment-ops", {
                    body: {
                        action: "check_payment_status",
                        payload: { orderId }
                    }
                });

                if (!error && data?.status === "paid" && !cancelled) {
                    setOrder((prev) => prev ? { ...prev, status: "paid" } : prev);
                    toast.success("Pagamento confirmado! Acesso liberado. 🎉");
                    clearInterval(interval);
                }
            } catch {
                // Silêncio em erros transitórios de rede no polling
            }
        }, 3000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [orderId, order?.status, order?.payment?.status]);

    const isPaid = order?.status === "paid" || order?.payment?.status === "paid";
    const redirectAfterPurchase = order?.redirect_after_purchase ?? null;

    // Redirecionamento pós-compra configurado no produto.
    useEffect(() => {
        if (!isPaid || !redirectAfterPurchase) return;
        if (!/^https?:\/\//i.test(redirectAfterPurchase)) return;

        const timer = setTimeout(() => {
            window.location.href = redirectAfterPurchase;
        }, 2500);

        return () => clearTimeout(timer);
    }, [isPaid, redirectAfterPurchase]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (amount: number, currency = "BRL") => {
        const value = (amount / 100).toFixed(2);
        return currency === "USD" ? `US$ ${value}` : `R$ ${value.replace(".", ",")}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <ErrorState
                    title="Não foi possível carregar o pedido"
                    description="O link pode estar incorreto ou o pedido ainda não foi gerado."
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="text-4xl">🔒</div>
                        <h1 className="text-xl font-bold">Pedido não encontrado</h1>
                        <p className="text-muted-foreground text-sm">
                            Este pedido não existe ou o link está incompleto.
                        </p>
                        <Button asChild variant="outline" className="mt-4">
                            <Link to="/">
                                <Home className="w-4 h-4 mr-2" />
                                Voltar ao Início
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg shadow-xl border-primary/20">
                <CardContent className="p-8 text-center space-y-6">
                    {/* Ícone de Sucesso */}
                    <div className="flex justify-center">
                        <div className={`p-4 rounded-full ${isPaid ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                            {isPaid ? (
                                <CheckCircle className="w-16 h-16 text-green-500" />
                            ) : (
                                <Clock className="w-16 h-16 text-yellow-500" />
                            )}
                        </div>
                    </div>

                    {/* Mensagem Principal */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">
                            {isPaid
                                ? "Pagamento Confirmado!"
                                : order.customer_first_name
                                    ? `Quase lá, ${order.customer_first_name}!`
                                    : "Aguardando Pagamento"}
                        </h1>
                        <p className="text-muted-foreground">
                            {isPaid
                                ? "Seu acesso já foi liberado automaticamente."
                                : paymentMethod === "pix"
                                    ? "Escaneie o QR Code abaixo ou copie o código PIX para pagar."
                                    : paymentMethod === "boleto"
                                        ? "Clique abaixo para visualizar e pagar seu boleto."
                                        : "Seu pagamento está sendo processado."
                            }
                        </p>
                    </div>

                    <Separator />

                    {/* QR Code PIX */}
                    {paymentMethod === "pix" && (qrCodeBase64 || qrCode) && !isPaid && (
                        <div className="space-y-4">
                            <div className="p-4 bg-white rounded-lg inline-block">
                                <img
                                    src={qrCodeBase64 ? `data:image/png;base64,${qrCodeBase64}` : `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode!)}`}
                                    alt="QR Code PIX"
                                    className="w-48 h-48"
                                    loading="eager"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Ou copie o código:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={qrCode ?? ""}
                                        readOnly
                                        className="flex-1 text-xs p-2 rounded border bg-muted/50 truncate"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => qrCode && handleCopy(qrCode)}
                                    >
                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Link do Boleto */}
                    {paymentMethod === "boleto" && ticketUrl && !isPaid && (
                        <div className="space-y-4">
                            <Button asChild className="w-full" size="lg">
                                <a href={ticketUrl} target="_blank" rel="noopener noreferrer">
                                    Visualizar Boleto
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </a>
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                O boleto pode levar até 3 dias úteis para compensar.
                            </p>
                        </div>
                    )}

                    {/* Detalhes do Pedido */}
                    <div className="text-left p-4 bg-muted/30 rounded-lg space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Pedido</span>
                            <span className="font-mono">#{order.id?.slice(0, 8)}</span>
                        </div>
                        {order.items?.map((item, i) => (
                            <div key={`${item.product_id}-${i}`} className="flex justify-between gap-3 text-sm">
                                <span className="truncate">{item.name}</span>
                                <span className="font-medium shrink-0">
                                    {formatCurrency(item.unit_amount, order.currency)}
                                </span>
                            </div>
                        ))}
                        <Separator className="my-2" />
                        <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span className="text-primary">{formatCurrency(order.total_amount, order.currency)}</span>
                        </div>
                    </div>

                    <Separator />

                    {/* Botões de Ação */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Button asChild variant="outline" className="flex-1">
                            <Link to="/">
                                <Home className="w-4 h-4 mr-2" />
                                Página Inicial
                            </Link>
                        </Button>
                        {isPaid && (
                            <Button asChild className="flex-1">
                                <Link to="/dashboard">
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Acessar Conteúdo
                                </Link>
                            </Button>
                        )}
                        {isPaid && redirectAfterPurchase && /^https?:\/\//i.test(redirectAfterPurchase) && (
                            <Button asChild className="flex-1">
                                <a href={redirectAfterPurchase}>
                                    Continuar
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </a>
                            </Button>
                        )}
                    </div>

                    {isPaid && (
                        <p className="text-xs text-muted-foreground">
                            Primeiro acesso? Entre com seu e-mail e use{" "}
                            <Link to="/login" className="underline">
                                Esqueci minha senha
                            </Link>{" "}
                            para definir a senha.
                        </p>
                    )}

                    {isPaid && redirectAfterPurchase && /^https?:\/\//i.test(redirectAfterPurchase) && (
                        <p className="text-xs text-muted-foreground">
                            Você será redirecionado automaticamente em instantes.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
