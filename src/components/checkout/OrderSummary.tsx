import { Product } from "@/types/payment";
import { ShieldCheck, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CouponValidationResult } from "@/features/coupons/types";

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
    appliedCoupon?: CouponValidationResult | null;
    /** Preço anterior (em reais) para o "de/por". */
    previousPrice?: number | null;
    /** Texto de desconto exibido ao lado do preço. */
    discountText?: string;
    /** Config `summary.show_description`. */
    showDescription?: boolean;
    /** Tema visual do checkout. */
    theme?: "dark" | "light";
}

const formatBRL = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;

/**
 * Resumo compacto, no padrão do checkout de referência: item, adicionais,
 * desconto e total — nada de banners ou listas de benefícios. Os benefícios
 * ficam em `OrderSummaryBullets`, no rodapé da página.
 */
export function OrderSummary({
    product,
    isLoading,
    selectedBumps = [],
    orderBumps = [],
    appliedCoupon = null,
    previousPrice = null,
    discountText = "",
    showDescription = true,
    theme = "dark",
}: OrderSummaryProps) {
    if (isLoading) {
        return <div className="animate-pulse h-56 bg-muted rounded-xl"></div>;
    }

    if (!product) return null;

    const priceInCents = (product as any).price || product.checkout_config?.price || 0;

    const bumpsTotal = selectedBumps.reduce((acc, bumpId) => {
        const bump = orderBumps.find(b => b.id === bumpId);
        if (bump?.offer_product) {
            const discounted = Math.round(bump.offer_product.price * (1 - bump.discount_percent / 100));
            return acc + discounted;
        }
        return acc;
    }, 0);

    const couponDiscountInCents = appliedCoupon?.valid ? Math.round((appliedCoupon.discount_applied || 0) * 100) : 0;
    const totalInCents = Math.max(0, priceInCents + bumpsTotal - couponDiscountInCents);
    const selectedBumpItems = orderBumps.filter(b => selectedBumps.includes(b.id));
    const light = theme === "light";

    return (
        <Card className="overflow-hidden rounded-xl border shadow-sm">
            <CardContent className="p-5 space-y-4">
                <h2 className="text-sm font-semibold text-foreground">Resumo da compra</h2>

                <div className="flex items-start gap-3">
                    {product.image_url ? (
                        <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-14 h-14 rounded-lg object-cover border shrink-0"
                        />
                    ) : null}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm leading-snug">{product.name}</h3>
                        {showDescription && product.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                {product.description}
                            </p>
                        )}
                    </div>
                    <div className="text-right shrink-0">
                        {previousPrice != null && previousPrice > 0 && (
                            <span className="block text-xs text-muted-foreground line-through">
                                {formatBRL(previousPrice * 100)}
                            </span>
                        )}
                        <span className="text-sm font-medium text-foreground tabular-nums">
                            {formatBRL(priceInCents)}
                        </span>
                    </div>
                </div>

                {selectedBumpItems.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                        {selectedBumpItems.map(bump => {
                            const discountedPrice = Math.round(bump.offer_product.price * (1 - bump.discount_percent / 100));
                            return (
                                <div key={bump.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="flex items-center gap-1.5 min-w-0 text-muted-foreground">
                                        <CheckCircle className={light ? "w-3.5 h-3.5 shrink-0 text-emerald-700" : "w-3.5 h-3.5 shrink-0 text-green-500"} />
                                        <span className="truncate">{bump.offer_product.name}</span>
                                    </span>
                                    <span className="tabular-nums shrink-0">{formatBRL(discountedPrice)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {appliedCoupon?.valid && (
                    <div className={light
                        ? "flex justify-between items-center text-sm rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800"
                        : "flex justify-between items-center text-sm rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-green-400"}
                    >
                        <span className="font-medium truncate">
                            Cupom {appliedCoupon.coupon?.code}
                        </span>
                        <span className="font-bold tabular-nums">
                            - {formatBRL((appliedCoupon.discount_applied || 0) * 100)}
                        </span>
                    </div>
                )}

                {discountText && (
                    <span className={light
                        ? "inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-800"
                        : "inline-block rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-400"}>
                        {discountText}
                    </span>
                )}

                <Separator />

                <div className="flex items-end justify-between">
                    <span className="text-sm font-semibold text-foreground">Total a pagar</span>
                    <div className="text-right">
                        <span className={light ? "block text-xl font-bold tabular-nums text-emerald-700" : "block text-xl font-bold tabular-nums text-primary"}>
                            {formatBRL(totalInCents)}
                        </span>
                        <span className="text-xs text-muted-foreground">à vista</span>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 border-t pt-3 text-xs text-muted-foreground">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Compra segura · dados criptografados</span>
                </div>
            </CardContent>
        </Card>
    );
}

interface OrderSummaryBulletsProps {
    /** Texto do item de garantia; oculto quando vazio. */
    guaranteeText?: string;
    theme?: "dark" | "light";
    className?: string;
}

/** Benefícios do pedido. Ficam no rodapé, abaixo do formulário. */
export function OrderSummaryBullets({
    guaranteeText = "7 dias de garantia",
    theme = "dark",
    className,
}: OrderSummaryBulletsProps) {
    const light = theme === "light";
    const items = ["Liberação imediata", guaranteeText, "Pagamento via Pix, Boleto ou Cartão"].filter(Boolean);

    return (
        <div className={className}>
            <div className="grid gap-3 sm:grid-cols-3">
                {items.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                        <CheckCircle className={light ? "w-4 h-4 mt-0.5 shrink-0 text-emerald-700" : "w-4 h-4 mt-0.5 shrink-0 text-green-500"} />
                        <span className="text-sm">{item}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
