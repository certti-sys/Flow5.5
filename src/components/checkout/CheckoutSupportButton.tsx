import { MessageCircle, Link as LinkIcon } from "lucide-react";
import type { CheckoutConfig } from "@/types/checkout-config";
import { isSafeUrl } from "@/types/checkout-config";
import { cn } from "@/lib/utils";

interface CheckoutSupportButtonProps {
    config: CheckoutConfig["support_button"];
}

/** Botão flutuante de suporte (WhatsApp ou link). */
export function CheckoutSupportButton({ config }: CheckoutSupportButtonProps) {
    if (!config.enabled || !config.url || !isSafeUrl(config.url)) return null;

    const Icon = config.icon === "whatsapp" ? MessageCircle : LinkIcon;

    return (
        <a
            href={config.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={config.text || "Suporte"}
            className={cn(
                "fixed bottom-5 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105",
                config.position === "bottom-left" ? "left-5" : "right-5",
            )}
            style={{
                backgroundColor: config.color || "#25D366",
                bottom: "calc(1.25rem + env(safe-area-inset-bottom))",
            }}
        >
            <Icon className="h-5 w-5" />
            <span className="hidden sm:inline">{config.text || "Suporte"}</span>
        </a>
    );
}
