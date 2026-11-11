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

interface OrderBumpCardProps {
    bump: OrderBumpData
    selected: boolean
    onToggle: (id: string) => void
}

/**
 * Paleta do order bump. As classes são literais para o Tailwind gerar o CSS;
 * a chave é o que fica salvo em `order_bumps.color`.
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
    },
} as const

export type OrderBumpColor = keyof typeof ORDER_BUMP_COLORS

export const getOrderBumpTheme = (color?: string | null) =>
    ORDER_BUMP_COLORS[(color as OrderBumpColor) ?? "orange"] ?? ORDER_BUMP_COLORS.orange

export function OrderBumpCard({ bump, selected, onToggle }: OrderBumpCardProps) {
    const originalPrice = bump.offer_product.price
    const discountedPrice = Math.round(originalPrice * (1 - bump.discount_percent / 100))
    const theme = getOrderBumpTheme(bump.color)

    const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

    return (
        <div
            onClick={() => onToggle(bump.id)}
            className={cn(
                "border rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
                selected ? theme.selected : theme.idle
            )}
        >
            {/* Header com título e badge */}
            <div className={cn("flex items-center justify-between px-4 py-2.5", theme.header)}>
                <div className={cn("flex items-center gap-2 font-semibold text-sm", theme.text)}>
                    <Zap className="w-4 h-4" />
                    {bump.title || "OFERTA ESPECIAL"}
                </div>
                <Badge className={cn("text-xs", theme.badge)}>
                    {bump.discount_percent}% OFF
                </Badge>
            </div>

            {/* Conteúdo */}
            <div className="p-4 flex items-center gap-4">
                {/* Checkbox visual */}
                <div
                    className={cn(
                        "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        selected ? theme.check : "border-muted-foreground/40"
                    )}
                >
                    {selected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Imagem do produto */}
                {bump.offer_product.image_url && (
                    <img
                        src={bump.offer_product.image_url}
                        alt={bump.offer_product.name}
                        className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                )}

                {/* Info do produto */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                        {bump.offer_product.name}
                    </div>
                    {bump.description && (
                        <div className="text-xs text-muted-foreground truncate">
                            {bump.description}
                        </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                        <span className="line-through text-muted-foreground text-xs">
                            {formatPrice(originalPrice)}
                        </span>
                        <span className="text-green-400 font-bold text-sm">
                            {formatPrice(discountedPrice)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Texto de ação */}
            <div className="px-4 pb-3">
                <div className={cn(
                    "text-center text-xs py-1.5 rounded-md transition-colors",
                    selected ? theme.action : "bg-muted/50 text-muted-foreground"
                )}>
                    {selected ? "✓ Adicionado ao pedido" : "+ Clique para adicionar"}
                </div>
            </div>
        </div>
    )
}
