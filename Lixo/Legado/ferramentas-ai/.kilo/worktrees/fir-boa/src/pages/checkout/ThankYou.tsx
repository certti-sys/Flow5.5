import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Clock, Copy, Check, ArrowRight, Home, BookOpen } from "lucide-react";
import { toast } from "sonner";

export default function ThankYouPage() {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const paymentMethod = searchParams.get("method") || "card";
    const ticketUrl = searchParams.get("ticket");
    const qrCode = searchParams.get("qrcode");

    const [copied, setCopied] = useState(false);
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) return;
            const { data } = await supabase
                .from("orders")
                .select(`
                    *,
                    order_items(
                        quantity,
                        unit_amount,
                        product:products(name)
                    ),
                    payments(status, external_payment_id)
                `)
                .eq("id", orderId)
                .single();
            setOrder(data);
            setLoading(false);
        };
        fetchOrder();
    }, [orderId]);

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    const formatCurrency = (amount: number) => {
        return `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Carregando...</div>
            </div>
        );
    }

    // Se o pedido não foi encontrado (RLS bloqueou ou não existe)
    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-xl">
                    <CardContent className="p-8 text-center space-y-4">
                        <div className="text-4xl">🔒</div>
                        <h1 className="text-xl font-bold">Pedido não encontrado</h1>
                        <p className="text-muted-foreground text-sm">
                            Este pedido não existe ou você não tem permissão para acessá-lo.
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

    const isPaid = order?.status === "paid" || order?.payments?.[0]?.status === "paid";

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
                            {isPaid ? "Pagamento Confirmado!" : "Aguardando Pagamento"}
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
                    {paymentMethod === "pix" && qrCode && !isPaid && (
                        <div className="space-y-4">
                            <div className="p-4 bg-white rounded-lg inline-block">
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`}
                                    alt="QR Code PIX"
                                    className="w-48 h-48"
                                    loading="eager"
                                    fetchPriority="high"
                                />
                            </div>
                            <div className="space-y-2">
                                <p className="text-sm text-muted-foreground">Ou copie o código:</p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={qrCode}
                                        readOnly
                                        className="flex-1 text-xs p-2 rounded border bg-muted/50 truncate"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleCopy(qrCode)}
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
                    {order && (
                        <div className="text-left p-4 bg-muted/30 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Pedido</span>
                                <span className="font-mono">#{order.id?.slice(0, 8)}</span>
                            </div>
                            {order.order_items?.map((item: any, i: number) => (
                                <div key={i} className="flex justify-between text-sm">
                                    <span>{item.product?.name}</span>
                                    <span className="font-medium">{formatCurrency(item.unit_amount)}</span>
                                </div>
                            ))}
                            <Separator className="my-2" />
                            <div className="flex justify-between font-bold">
                                <span>Total</span>
                                <span className="text-primary">{formatCurrency(order.total_amount)}</span>
                            </div>
                        </div>
                    )}

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
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
