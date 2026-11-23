import { Check, RotateCcw } from "lucide-react";
import { THEME_PRESETS, type ThemePreset } from "@/types/theme-presets";
import { cn } from "@/lib/utils";

/** Token HSL ("H S% L%") para cor CSS. */
const c = (tokens: ThemePreset["dark"], token: string, fallback: string) =>
    tokens[token] ? `hsl(${tokens[token]})` : fallback;

/** Miniatura de um modo do preset: fundo, card, botão e borda. */
export function PresetMiniPreview({ preset, mode }: { preset: ThemePreset; mode: "light" | "dark" }) {
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

interface PresetGalleryProps {
    /** Preset ativo. `null` = padrão do sistema. */
    value: string | null;
    onChange: (presetId: string | null) => void;
    /** Qual paleta mostrar na primeira miniatura. */
    previewMode?: "light" | "dark";
    resetLabel?: string;
    resetHint?: string;
    disabled?: boolean;
}

/**
 * Galeria de presets de tema. Usada em Personalização (aplicação global) e no
 * Checkout Builder (aplicação só no checkout público do produto).
 */
export function PresetGallery({
    value,
    onChange,
    previewMode = "dark",
    resetLabel = "Padrão do sistema",
    resetHint = "Reset: limpa o preset e volta à configuração padrão do sistema.",
    disabled = false,
}: PresetGalleryProps) {
    return (
        <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-3", disabled && "pointer-events-none opacity-60")}>
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
                        <RotateCcw className="h-4 w-4" /> {resetLabel}
                    </span>
                    {value === null && <Check className="h-4 w-4 text-primary" />}
                </div>
                <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-white/15 bg-white/[0.03]">
                    <span className="text-[11px] text-muted-foreground">Configuração atual</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{resetHint}</p>
            </button>

            {THEME_PRESETS.map((preset) => {
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
                            <PresetMiniPreview preset={preset} mode={previewMode} />
                            <PresetMiniPreview preset={preset} mode={previewMode === "dark" ? "light" : "dark"} />
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
    );
}
