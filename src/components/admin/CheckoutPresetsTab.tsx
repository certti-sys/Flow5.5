import { Check, Palette } from "lucide-react";
import { CHECKOUT_PRESETS, type CheckoutPreset } from "@/types/checkout-presets";
import { cn } from "@/lib/utils";

/** hstoken -> cor css; prefixo `hsl()` porque os tokens são "H S% L%". */
const c = (tokens: CheckoutPreset["dark"], token: string, fallback: string) =>
    tokens[token] ? `hsl(${tokens[token]})` : fallback;

/** Miniatura de um modo do preset: fundo, card, botão e borda. */
function MiniPreview({ preset, mode }: { preset: CheckoutPreset; mode: "light" | "dark" }) {
    const t = mode === "light" ? preset.light : preset.dark;
    return (
        <div
            className="flex-1 space-y-1.5 rounded-md p-2"
            style={{ backgroundColor: c(t, "--background", "transparent") }}
        >
            <div
                className="space-y-1 rounded p-1.5"
                style={{
                    backgroundColor: c(t, "--card", "transparent"),
                    border: `1px solid ${c(t, "--border", "transparent")}`,
                    borderRadius: preset.radius ?? "0.5rem",
                }}
            >
                <div
                    className="h-1 w-2/3 rounded-full"
                    style={{ backgroundColor: c(t, "--foreground", "transparent") }}
                />
                <div
                    className="h-0.5 w-1/2 rounded-full"
                    style={{ backgroundColor: c(t, "--muted-foreground", "transparent") }}
                />
                <div
                    className="h-2 w-full rounded"
                    style={{
                        backgroundColor: c(t, "--primary", "transparent"),
                        borderRadius: preset.radius ?? "0.5rem",
                    }}
                />
            </div>
            <div className="flex gap-1">
                <div
                    className="h-1 flex-1 rounded-full"
                    style={{ backgroundColor: c(t, "--border", "transparent") }}
                />
                <div
                    className="h-1 w-1/3 rounded-full"
                    style={{ backgroundColor: c(t, "--primary", "transparent") }}
                />
            </div>
        </div>
    );
}

interface CheckoutPresetsTabProps {
    /** Preset salvo no produto. `null` = cores manuais. */
    value: string | null;
    onChange: (presetId: string | null) => void;
}

/**
 * Galeria de presets de tema do checkout.
 *
 * Cada preset traz as paletas clara e escura; qual das duas aparece é decidido
 * pelo "Tema do checkout" em Geral → Cores e botão.
 */
export function CheckoutPresetsTab({ value, onChange }: CheckoutPresetsTabProps) {
    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[13px] font-medium text-white/90">Presets de tema</p>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                    Cada preset define as cores, o arredondamento das bordas e a fonte do checkout
                    público. Aplicar um preset limpa as cores manuais para o preset aparecer de fato.
                    O painel administrativo não é afetado.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <button
                    type="button"
                    onClick={() => onChange(null)}
                    className={cn(
                        "flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
                        value === null
                            ? "border-primary bg-primary/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/25",
                    )}
                >
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[13px] font-semibold text-white/90">
                            <Palette className="h-4 w-4" /> Cores manuais
                        </span>
                        {value === null && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex gap-2">
                        <div className="h-16 flex-1 rounded-md border border-dashed border-white/15 bg-white/[0.03]" />
                        <div className="h-16 flex-1 rounded-md border border-dashed border-white/15 bg-black/30" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                        Usa o tema escuro/claro atual e as cores definidas acima.
                    </p>
                </button>

                {CHECKOUT_PRESETS.map((preset) => {
                    const active = value === preset.id;
                    return (
                        <button
                            key={preset.id}
                            type="button"
                            onClick={() => onChange(preset.id)}
                            className={cn(
                                "flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors",
                                active
                                    ? "border-primary bg-primary/10"
                                    : "border-white/10 bg-white/[0.02] hover:border-white/25",
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-[13px] font-semibold text-white/90">{preset.name}</span>
                                {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                            </div>
                            <div className="flex gap-2">
                                <MiniPreview preset={preset} mode="light" />
                                <MiniPreview preset={preset} mode="dark" />
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {preset.font ? preset.font.split(",")[0] : "fonte atual"}
                                {" · "}
                                {preset.radius ?? "raio atual"}
                            </p>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
