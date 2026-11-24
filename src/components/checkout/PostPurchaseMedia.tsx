import { CheckoutYoutube } from "@/components/checkout/CheckoutContentBlocks";
import { cn } from "@/lib/utils";
import { fillPostPurchaseVars, type PostPurchaseVars } from "@/lib/post-purchase";
import { isSafeUrl, type CheckoutPostPurchasePage } from "@/types/checkout-config";

interface PostPurchaseMediaProps {
    page: CheckoutPostPurchasePage;
    vars?: PostPurchaseVars;
    className?: string;
}

/**
 * Mídia e texto corrido das páginas pós-compra. Título e subtítulo ficam com
 * cada página (o estilo muda entre obrigado, upsell e downsell), então aqui só
 * entra o que é igual nos três. Nunca interpreta HTML.
 */
export function PostPurchaseMedia({ page, vars, className }: PostPurchaseMediaProps) {
    const image = page.image_url.trim();
    const hasImage = image !== '' && isSafeUrl(image);
    const body = fillPostPurchaseVars(page.body, vars).trim();

    if (!hasImage && !page.video_url.trim() && !body) return null;

    return (
        <div className={cn("space-y-4", className)}>
            {hasImage && (
                <img
                    src={image}
                    alt=""
                    loading="lazy"
                    className="w-full rounded-xl border object-cover"
                />
            )}
            {/* Política de vídeo: sempre embed, nunca arquivo direto. */}
            <CheckoutYoutube url={page.video_url} />
            {body && (
                <p className="whitespace-pre-line text-left text-sm leading-relaxed text-muted-foreground">
                    {body}
                </p>
            )}
        </div>
    );
}
