
import { Product } from "@/types/payment";
import { ShieldCheck, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OrderBumpItem {
    id: string
    title: string | null
    discount_percent: number
    offer_product: {
        id: string
        name: string
        price: number
        image_url: string | null
    }
}

interface OrderSummaryProps {
    product: Product | null;
    isLoading: boolean;
    selectedBumps?: string[];
    orderBumps?: OrderBumpItem[];
}

export function OrderSummary({ product, isLoading, selectedBumps = [], orderBumps = [] }: OrderSummaryProps) {
    if (isLoading) {
        return <div className="animate-pulse h-64 bg-gray-200 rounded-lg"></div>;
    }

    if (!product) return null;

    // Usa preço do produto (em centavos) ou fallback para checkout_config
    const priceInCents = (product as any).price || product.checkout_config?.price || 0;

    // Calcular total dos bumps selecionados
    const bumpsTotal = selectedBumps.reduce((acc, bumpId) => {
        const bump = orderBumps.find(b => b.id === bumpId);
        if (bump?.offer_product) {
            const discounted = Math.round(bump.offer_product.price * (1 - bump.discount_percent / 100));
            return acc + discounted;
        }
        return acc;
    }, 0);

    const totalInCents = priceInCents + bumpsTotal;
    const displayPrice = `R$ ${(totalInCents / 100).toFixed(2).replace(".", ",")}`;
    const productPrice = `R$ ${(priceInCents / 100).toFixed(2).replace(".", ",")}`;

    // Bumps selecionados para exibir
    const selectedBumpItems = orderBumps.filter(b => selectedBumps.includes(b.id));

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-t-primary shadow-md overflow-hidden">
                <CardHeader className="bg-primary/5 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-green-600" />
                        Compra Segura
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                    {/* Produto Principal */}
                    <div className="flex gap-4">
                        {product.image_url ? (
                            <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-20 h-20 rounded-md object-cover border"
                            />
                        ) : (
                            <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-xs text-center p-1">
                                Sem Imagem
                            </div>
                        )}
                        <div className="flex-1">
                            <h3 className="font-bold text-lg leading-tight">{product.name}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {product.description?.slice(0, 60)}...
                            </p>
                            <p className="text-sm font-medium text-primary mt-1">{productPrice}</p>
                        </div>
                    </div>

                    {/* Order Bumps Selecionados */}
                    {selectedBumpItems.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                {selectedBumpItems.map(bump => {
                                    const discountedPrice = Math.round(bump.offer_product.price * (1 - bump.discount_percent / 100));
                                    return (
                                        <div key={bump.id} className="flex items-center gap-3 p-2 bg-orange-500/10 rounded-md border border-orange-500/30">
                                            {bump.offer_product.image_url ? (
                                                <img
                                                    src={bump.offer_product.image_url}
                                                    alt={bump.offer_product.name}
                                                    className="w-10 h-10 rounded object-cover"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-xs">
                                                    Img
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{bump.offer_product.name}</p>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <span className="line-through text-muted-foreground">
                                                        R$ {(bump.offer_product.price / 100).toFixed(2).replace(".", ",")}
                                                    </span>
                                                    <span className="text-green-500 font-semibold">
                                                        R$ {(discountedPrice / 100).toFixed(2).replace(".", ",")}
                                                    </span>
                                                    <span className="text-orange-400 text-xs">
                                                        ({bump.discount_percent}% OFF)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    <Separator />

                    <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-muted-foreground">Total</span>
                        <div className="text-right">
                            <span className="text-2xl font-bold text-primary block">{displayPrice}</span>
                            <span className="text-xs text-muted-foreground">à vista</span>
                        </div>
                    </div>

                    <div className="bg-muted/30 p-3 rounded text-xs text-center text-muted-foreground flex flex-col gap-1 items-center">
                        <div className="flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Ambiente Criptografado</span>
                        </div>
                        <p>Seus dados estão protegidos.</p>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-card border rounded-lg p-4 space-y-3 shadow-sm">
                <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Liberação imediata</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">7 dias de garantia</span>
                </div>
                <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                    <span className="text-sm">Pagamento via Pix, Boleto ou Cartão</span>
                </div>
            </div>
        </div>
    );
}
