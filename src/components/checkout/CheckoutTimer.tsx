import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import type { CheckoutConfig } from "@/types/checkout-config";
import { cn } from "@/lib/utils";

/** Tempo restante calculado a partir da primeira visita (persistido no navegador). */
function remainingSeconds(minutes: number, storageKey: string): number {
    const total = Math.max(1, minutes) * 60;
    const now = Date.now();

    try {
        const stored = Number(window.localStorage.getItem(storageKey));
        if (!Number.isFinite(stored) || stored <= 0) {
            window.localStorage.setItem(storageKey, String(now + total * 1000));
            return total;
        }
        return Math.max(0, Math.floor((stored - now) / 1000));
    } catch {
        return total;
    }
}

interface CheckoutTimerProps {
    config: CheckoutConfig["timer"];
    storageKey: string;
    className?: string;
}

/** Contador de urgência no topo do checkout. */
export function CheckoutTimer({ config, storageKey, className }: CheckoutTimerProps) {
    const [seconds, setSeconds] = useState(() => remainingSeconds(config.minutes, storageKey));

    useEffect(() => {
        if (!config.enabled) return;

        const interval = setInterval(() => {
            setSeconds((current) => (current <= 1 ? 0 : current - 1));
        }, 1000);

        return () => clearInterval(interval);
    }, [config.enabled]);

    if (!config.enabled) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const pad = (value: number) => String(value).padStart(2, "0");

    return (
        <div
            className={cn(
                "w-full px-4 py-3 text-center",
                config.sticky && "sticky top-0 z-40",
                className,
            )}
            style={{
                backgroundColor: config.background_color || "#DC2626",
                color: config.text_color || "#FFFFFF",
            }}
        >
            <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 text-sm font-bold tracking-wide">
                <Clock className="h-4 w-4 shrink-0" />
                <span>{config.text || "Oferta expira em"}</span>
                <span className="font-mono text-base tabular-nums">
                    {hours > 0 && `${pad(hours)}:`}
                    {pad(minutes)}:{pad(secs)}
                </span>
            </div>
        </div>
    );
}
