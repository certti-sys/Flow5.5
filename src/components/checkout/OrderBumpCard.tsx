import { Zap, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface OrderBumpData {
    id: string
    title: string | null
    description: string | null
    discount_percent: number
    color?: string | null
    offer_product: {
        id: string
        name: string
        price: number
        image_url: string | null
    }
}

/**
 * Paleta do order bump. As classes são literais para o Tailwind gerar o CSS;
 * a chave é o que fica salvo em `order_bumps.color`.
 *
 * Cada chave tem duas variantes: a escura (campos de topo) e a clara (`light`),
 * usada quando o checkout roda com `appearance.theme = 'light'`. Na clara os
 * tons vão de -600 a -800 porque os -400/-500 reprovam AA sobre branco.
 */
export const ORDER_BUMP_COLORS = {
    orange: {
        label: "Laranja",
        dot: "bg-orange-500",
        selected: "border-orange-500 bg-gradient-to-r from-orange-950/50 to-orange-900/30 ring-2 ring-orange-500/50",
        idle: "border-white/[0.08] bg-card hover:border-orange-500/50 hover:bg-orange-950/20",
        header: "bg-gradient-to-r from-orange-600/20 to-transparent",
        text: "text-orange-400",
        badge: "bg-orange-500 hover:bg-orange-600",
        check: "bg-orange-500 border-orange-500",
        action: "bg-orange-500/20 text-orange-400",
        light: {
            selected: "border-orange-600 bg-orange-50 ring-2 ring-orange-600/30",
            idle: "border-orange-600/40 bg-card hover:border-orange-600 hover:bg-orange-50/60",
            header: "bg-gradient-to-r from-orange-100 to-transparent",
            text: "text-orange-700",
            badge: "bg-orange-700 hover:bg-orange-800 text-white",
            check: "bg-orange-600 border-orange-600",
            action: "bg-orange-100 text-orange-700",
        },
    },
    amber: {
        label: "Âmbar",
        dot: "bg-amber-500",
        selected: "border-amber-500 bg-gradient-to-r from-amber-950/50 to-amber-900/30 ring-2 ring-amber-500/50",
        idle: "border-white/[0.08] bg-card hover:border-amber-500/50 hover:bg-amber-950/20",
        header: "bg-gradient-to-r from-amber-600/20 to-transparent",
        text: "text-amber-400",
        badge: "bg-amber-500 hover:bg-amber-600",
        check: "bg-amber-500 border-amber-500",
        action: "bg-amber-500/20 text-amber-400",
        light: {
            selected: "border-amber-600 bg-amber-50 ring-2 ring-amber-600/30",
            idle: "border-amber-600/40 bg-card hover:border-amber-600 hover:bg-amber-50/60",
            header: "bg-gradient-to-r from-amber-100 to-transparent",
            text: "text-amber-700",
            badge: "bg-amber-700 hover:bg-amber-800 text-white",
            check: "bg-amber-600 border-amber-600",
            action: "bg-amber-100 text-amber-700",
        },
    },
    emerald: {
        label: "Esmeralda",
        dot: "bg-emerald-500",
        selected: "border-emerald-500 bg-gradient-to-r from-emerald-950/50 to-emerald-900/30 ring-2 ring-emerald-500/50",
        idle: "border-white/[0.08] bg-card hover:border-emerald-500/50 hover:bg-emerald-950/20",
        header: "bg-gradient-to-r from-emerald-600/20 to-transparent",
        text: "text-emerald-400",
        badge: "bg-emerald-500 hover:bg-emerald-600",
        check: "bg-emerald-500 border-emerald-500",
        action: "bg-emerald-500/20 text-emerald-400",
        light: {
            selected: "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-700/30",
            idle: "border-emerald-700/40 bg-card hover:border-emerald-700 hover:bg-emerald-50/60",
            header: "bg-gradient-to-r from-emerald-100 to-transparent",
            text: "text-emerald-700",
            badge: "bg-emerald-700 hover:bg-emerald-800 text-white",
            check: "bg-emerald-700 border-emerald-700",
            action: "bg-emerald-100 text-emerald-700",
        },
    },
    cyan: {
        label: "Ciano",
        dot: "bg-cyan-500",
        selected: "border-cyan-500 bg-gradient-to-r from-cyan-950/50 to-cyan-900/30 ring-2 ring-cyan-500/50",
        idle: "border-white/[0.08] bg-card hover:border-cyan-500/50 hover:bg-cyan-950/20",
        header: "bg-gradient-to-r from-cyan-600/20 to-transparent",
        text: "text-cyan-400",
        badge: "bg-cyan-500 hover:bg-cyan-600",
        check: "bg-cyan-500 border-cyan-500",
        action: "bg-cyan-500/20 text-cyan-400",
        light: {
            selected: "border-cyan-700 bg-cyan-50 ring-2 ring-cyan-700/30",
            idle: "border-cyan-700/40 bg-card hover:border-cyan-700 hover:bg-cyan-50/60",
            header: "bg-gradient-to-r from-cyan-100 to-transparent",
            text: "text-cyan-700",
            badge: "bg-cyan-700 hover:bg-cyan-800 text-white",
            check: "bg-cyan-700 border-cyan-700",
            action: "bg-cyan-100 text-cyan-700",
        },
    },
    blue: {
        label: "Azul",
        dot: "bg-blue-500",
        selected: "border-blue-500 bg-gradient-to-r from-blue-950/50 to-blue-900/30 ring-2 ring-blue-500/50",
        idle: "border-white/[0.08] bg-card hover:border-blue-500/50 hover:bg-blue-950/20",
        header: "bg-gradient-to-r from-blue-600/20 to-transparent",
        text: "text-blue-400",
        badge: "bg-blue-500 hover:bg-blue-600",
        check: "bg-blue-500 border-blue-500",
        action: "bg-blue-500/20 text-blue-400",
        light: {
            selected: "border-blue-700 bg-blue-50 ring-2 ring-blue-700/30",
            idle: "border-blue-700/40 bg-card hover:border-blue-700 hover:bg-blue-50/60",
            header: "bg-gradient-to-r from-blue-100 to-transparent",
            text: "text-blue-700",
            badge: "bg-blue-700 hover:bg-blue-800 text-white",
            check: "bg-blue-700 border-blue-700",
            action: "bg-blue-100 text-blue-700",
        },
    },
    violet: {
        label: "Violeta",
        dot: "bg-violet-500",
        selected: "border-violet-500 bg-gradient-to-r from-violet-950/50 to-violet-900/30 ring-2 ring-violet-500/50",
        idle: "border-white/[0.08] bg-card hover:border-violet-500/50 hover:bg-violet-950/20",
        header: "bg-gradient-to-r from-violet-600/20 to-transparent",
        text: "text-violet-400",
        badge: "bg-violet-500 hover:bg-violet-600",
        check: "bg-violet-500 border-violet-500",
        action: "bg-violet-500/20 text-violet-400",
        light: {
            selected: "border-violet-700 bg-violet-50 ring-2 ring-violet-700/30",
            idle: "border-violet-700/40 bg-card hover:border-violet-700 hover:bg-violet-50/60",
            header: "bg-gradient-to-r from-violet-100 to-transparent",
            text: "text-violet-700",
            badge: "bg-violet-700 hover:bg-violet-800 text-white",
            check: "bg-violet-700 border-violet-700",
            action: "bg-violet-100 text-violet-700",
        },
    },
    rose: {
        label: "Rosa",
        dot: "bg-rose-500",
        selected: "border-rose-500 bg-gradient-to-r from-rose-950/50 to-rose-900/30 ring-2 ring-rose-500/50",
        idle: "border-white/[0.08] bg-card hover:border-rose-500/50 hover:bg-rose-950/20",
        header: "bg-gradient-to-r from-rose-600/20 to-transparent",
        text: "text-rose-400",
        badge: "bg-rose-500 hover:bg-rose-600",
        check: "bg-rose-500 border-rose-500",
        action: "bg-rose-500/20 text-rose-400",
        light: {
            selected: "border-rose-700 bg-rose-50 ring-2 ring-rose-700/30",
            idle: "border-rose-700/40 bg-card hover:border-rose-700 hover:bg-rose-50/60",
            header: "bg-gradient-to-r from-rose-100 to-transparent",
            text: "text-rose-700",
            badge: "bg-rose-700 hover:bg-rose-800 text-white",
            check: "bg-rose-700 border-rose-700",
            action: "bg-rose-100 text-rose-700",
        },
    },
} as const

export type OrderBumpColor = keyof typeof ORDER_BUMP_COLORS

type BumpTheme = Omit<(typeof ORDER_BUMP_COLORS)[OrderBumpColor], "light">

/** Junta a variante escura com a clara; `light` sobrescreve só as cores. */
export const getOrderBumpTheme = (color?: string | null, light = false): BumpTheme => {
    const base = ORDER_BUMP_COLORS[(color as OrderBumpColor) ?? "orange"] ?? ORDER_BUMP_COLORS.orange
    return (light ? { ...base, ...base.light } : base) as BumpTheme
}

interface OrderBumpCardProps {
    bump: OrderBumpData
    selected: boolean
    onToggle: (id: string) => void
    /** `light` usa a variante clara da paleta (checkout com tema claro). */
    themeMode?: "light" | "dark"
}

export function OrderBumpCard({ bump, selected, onToggle, themeMode = "dark" }: OrderBumpCardProps) {
    const originalPrice = bump.offer_product.price
    const discountedPrice = Math.round(originalPrice * (1 - bump.discount_percent / 100))
    const light = themeMode === "light"
    const theme = getOrderBumpTheme(bump.color, light)

    const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

    return (
        <label
            className={cn(
                "block rounded-xl overflow-hidden cursor-pointer transition-all duration-200",
                light ? "border-2 border-dashed" : "border",
                selected ? theme.selected : theme.idle
            )}
        >
            {/* Checkbox real: o card inteiro é o label, então clicar em qualquer
                parte alterna. Fica invisível mas continua acessível por teclado. */}
            <input
                type="checkbox"
                className="sr-only"
                checked={selected}
                onChange={() => onToggle(bump.id)}
            />

            <div className={cn("flex items-center justify-between gap-2 px-4 py-2.5", theme.header)}>
                <div className={cn("flex items-center gap-2 font-semibold text-sm min-w-0", theme.text)}>
                    <Zap className="w-4 h-4 shrink-0" />
                    <span className="truncate">{bump.title || "OFERTA ESPECIAL"}</span>
                </div>
                <Badge className={cn("text-xs shrink-0", theme.badge)}>
                    {bump.discount_percent}% OFF
                </Badge>
            </div>

            <div className="p-4 flex items-start gap-3">
                {bump.offer_product.image_url && (
                    <img
                        src={bump.offer_product.image_url}
                        alt={bump.offer_product.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                )}

                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm leading-snug">
                        {bump.offer_product.name}
                    </div>
                    {bump.description && (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {bump.description}
                        </div>
                    )}
                    <div className="flex items-baseline gap-2 mt-1.5">
                        <span className="text-xs text-muted-foreground">
                            De {formatPrice(originalPrice)}
                        </span>
                        <span className={cn("font-bold text-sm", light ? "text-emerald-700" : "text-green-400")}>
                            {formatPrice(discountedPrice)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Ação explícita, no padrão do checkbox "Sim, quero esta oferta!" */}
            <div className={cn("mx-4 mb-4 flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm", selected ? theme.action : "bg-muted/50 text-muted-foreground")}>
                <span className="flex items-center gap-2 font-medium">
                    <span
                        className={cn(
                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0",
                            selected ? theme.check : "border-muted-foreground/50"
                        )}
                        aria-hidden="true"
                    >
                        {selected && <Check className="w-3 h-3 text-white" />}
                    </span>
                    {selected ? "Adicionado ao pedido" : "Sim, quero esta oferta!"}
                </span>
                <span className="text-xs tabular-nums whitespace-nowrap">
                    {formatPrice(discountedPrice)}
                </span>
            </div>
        </label>
    )
}
