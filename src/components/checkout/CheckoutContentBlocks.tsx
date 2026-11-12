import { cn } from "@/lib/utils";
import { isSafeUrl, youtubeEmbedUrl, type CheckoutContentBlock } from "@/types/checkout-config";

const ASPECT_CLASS: Record<string, string> = {
    hero: "aspect-[3/1]",
    wide: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[2/3]",
};

interface CheckoutContentBlocksProps {
    blocks: CheckoutContentBlock[];
    placement?: "main" | "sidebar";
    className?: string;
}

/**
 * Blocos de conteúdo do checkout (imagens e textos) configurados no admin.
 * Nunca interpreta HTML: os textos são renderizados como texto puro.
 */
export function CheckoutContentBlocks({
    blocks,
    placement = "main",
    className,
}: CheckoutContentBlocksProps) {
    const visible = blocks.filter((block) => {
        if (block.type === "image") return block.placement === placement;
        return placement === "main";
    });

    if (visible.length === 0) return null;

    return (
        <div className={cn("space-y-4", className)}>
            {visible.map((block) => {
                if (block.type === "text") {
                    return (
                        <div
                            key={block.id}
                            className={cn(
                                "rounded-xl border bg-card/60 p-5",
                                block.align === "left" && "text-left",
                                block.align === "center" && "text-center",
                                block.align === "right" && "text-right",
                            )}
                        >
                            {block.title.trim() && (
                                <h2 className="text-lg font-bold leading-snug text-foreground">
                                    {block.title}
                                </h2>
                            )}
                            {block.body.trim() && (
                                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                    {block.body}
                                </p>
                            )}
                        </div>
                    );
                }

                const image = (
                    <img
                        src={block.url}
                        alt={block.alt || "Imagem do checkout"}
                        loading={block.format === "hero" ? "eager" : "lazy"}
                        className="h-full w-full object-cover"
                    />
                );

                const content = (
                    <div
                        className={cn(
                            "w-full overflow-hidden rounded-xl border bg-muted/30",
                            ASPECT_CLASS[block.format] ?? ASPECT_CLASS.wide,
                        )}
                    >
                        {image}
                    </div>
                );

                if (block.link && isSafeUrl(block.link)) {
                    return (
                        <a
                            key={block.id}
                            href={block.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block transition-opacity hover:opacity-90"
                        >
                            {content}
                        </a>
                    );
                }

                return <div key={block.id}>{content}</div>;
            })}
        </div>
    );
}

interface CheckoutYoutubeProps {
    url: string;
    className?: string;
}

export function CheckoutYoutube({ url, className }: CheckoutYoutubeProps) {
    const embedUrl = youtubeEmbedUrl(url);
    if (!embedUrl) return null;

    return (
        <div className={cn("overflow-hidden rounded-xl border bg-black", className)}>
            <iframe
                src={embedUrl}
                title="Vídeo do checkout"
                className="aspect-video w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
            />
        </div>
    );
}
