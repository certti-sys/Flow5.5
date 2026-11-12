import { Mail } from "lucide-react";
import type { CheckoutConfig } from "@/types/checkout-config";
import { cn } from "@/lib/utils";

interface CheckoutFooterProps {
    config: CheckoutConfig["footer"];
    className?: string;
}

/** Rodapé personalizado do checkout. */
export function CheckoutFooter({ config, className }: CheckoutFooterProps) {
    if (!config.enabled) return null;

    return (
        <footer
            className={cn(
                "rounded-xl border bg-card px-5 py-6 text-center text-sm text-muted-foreground",
                className,
            )}
        >
            {config.logo_url && (
                <img
                    src={config.logo_url}
                    alt="Logo"
                    loading="lazy"
                    className="mx-auto mb-3 h-10 w-auto object-contain"
                />
            )}

            {config.text && (
                <p className="mx-auto max-w-2xl whitespace-pre-line leading-relaxed">{config.text}</p>
            )}

            {config.support_email && (
                <a
                    href={`mailto:${config.support_email}`}
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                    <Mail className="h-4 w-4" />
                    {config.support_email}
                </a>
            )}
        </footer>
    );
}
