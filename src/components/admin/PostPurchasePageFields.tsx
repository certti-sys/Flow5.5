import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    fillPostPurchaseVars,
    PREVIEW_VARS,
} from "@/lib/post-purchase";
import { youtubeEmbedUrl, type CheckoutPostPurchasePage } from "@/types/checkout-config";

const inputClass = "bg-white/[0.03] border-white/10 text-white placeholder:text-white/30 h-11";

interface PostPurchasePageFieldsProps {
    page: CheckoutPostPurchasePage;
    onChange: (changes: Partial<CheckoutPostPurchasePage>) => void;
    headlinePlaceholder: string;
    subtitlePlaceholder: string;
}

/**
 * Campos de conteúdo das páginas pós-compra. Mesmo formulário nas três telas
 * (obrigado, upsell, downsell); o preview fica ao lado, em cada aba.
 */
export function PostPurchasePageFields({
    page,
    onChange,
    headlinePlaceholder,
    subtitlePlaceholder,
}: PostPurchasePageFieldsProps) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <Label className="text-[12px] text-white/70">Título</Label>
                <Input
                    value={page.headline}
                    onChange={(event) => onChange({ headline: event.target.value })}
                    placeholder={headlinePlaceholder}
                    className={inputClass}
                />
                <p className="text-[11px] text-muted-foreground">
                    Vazio = texto padrão da página.
                </p>
            </div>

            <div className="space-y-1.5">
                <Label className="text-[12px] text-white/70">Subtítulo</Label>
                <Input
                    value={page.subtitle}
                    onChange={(event) => onChange({ subtitle: event.target.value })}
                    placeholder={subtitlePlaceholder}
                    className={inputClass}
                />
            </div>

            <div className="space-y-1.5">
                <Label className="text-[12px] text-white/70">Texto (opcional)</Label>
                <Textarea
                    value={page.body}
                    onChange={(event) => onChange({ body: event.target.value })}
                    placeholder="Reforço, instruções de acesso, próximo passo..."
                    className="min-h-20 bg-white/[0.03] border-white/10 text-white placeholder:text-white/30"
                />
                <p className="text-[11px] text-muted-foreground">
                    Texto puro com quebras de linha. Aceita <code>{"{nome}"}</code> e{" "}
                    <code>{"{produto}"}</code>.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/70">Imagem (URL)</Label>
                    <Input
                        value={page.image_url}
                        onChange={(event) => onChange({ image_url: event.target.value })}
                        placeholder="https://..."
                        className={inputClass}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-[12px] text-white/70">Vídeo (YouTube)</Label>
                    <Input
                        value={page.video_url}
                        onChange={(event) => onChange({ video_url: event.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className={inputClass}
                    />
                </div>
            </div>

            {page.video_url.trim() !== "" && !youtubeEmbedUrl(page.video_url) && (
                <p className="text-[11.5px] text-amber-400">
                    Link de vídeo não reconhecido. Use YouTube (watch, youtu.be, shorts ou embed).
                </p>
            )}
        </div>
    );
}

/**
 * Prévia do miolo da página: título, subtítulo, mídia e texto. Imita a página
 * real de propósito (mesma fonte/tamanho) para o admin ver o que o cliente vê.
 */
export function PostPurchasePagePreview({
    page,
    children,
}: {
    page: CheckoutPostPurchasePage;
    /** Rodapé da prévia: botões/itens que variam por página. */
    children?: ReactNode;
}) {
    const headline = fillPostPurchaseVars(page.headline, PREVIEW_VARS).trim();
    const subtitle = fillPostPurchaseVars(page.subtitle, PREVIEW_VARS).trim();
    const body = fillPostPurchaseVars(page.body, PREVIEW_VARS).trim();
    const image = page.image_url.trim();
    const embed = youtubeEmbedUrl(page.video_url);

    return (
        <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Prévia</p>
            <div className="rounded-xl border border-white/10 bg-white p-5 text-center shadow-sm">
                {headline && (
                    <p className="text-xl font-bold leading-snug text-zinc-900">{headline}</p>
                )}
                {subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
                {image && (
                    <img
                        src={image}
                        alt=""
                        className="mt-3 w-full rounded-lg border object-cover"
                        onError={(event) => {
                            event.currentTarget.style.display = "none";
                        }}
                    />
                )}
                {embed && (
                    <div className="mt-3 overflow-hidden rounded-lg border bg-black">
                        <iframe
                            src={embed}
                            title="Prévia do vídeo"
                            className="aspect-video w-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                    </div>
                )}
                {body && (
                    <p className="mt-3 whitespace-pre-line text-left text-sm leading-relaxed text-zinc-600">
                        {body}
                    </p>
                )}
                {children}
            </div>
        </div>
    );
}
