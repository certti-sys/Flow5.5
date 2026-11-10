import { Zap, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface OrderBumpData {
    id: string
    title: string | null
    description: string | null
    discount_percent: number
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

export function OrderBumpCard({ bump, selected, onToggle }: OrderBumpCardProps) {
    const originalPrice = bump.offer_product.price
    const discountedPrice = Math.round(originalPrice * (1 - bump.discount_percent / 100))

    const formatPrice = (cents: number) => `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

    return (
        <div
            onClick={() => onToggle(bump.id)}
            className={cn(
                "border rounded-lg overflow-hidden cursor-pointer transition-all duration-200",
                selected
                    ? "border-orange-500 bg-gradient-to-r from-orange-950/50 to-orange-900/30 ring-2 ring-orange-500/50"
                    : "border-white/[0.08] bg-card hover:border-orange-500/50 hover:bg-orange-950/20"
            )}
        >
            {/* Header com título e badge */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-orange-600/20 to-transparent">
                <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
                    <Zap className="w-4 h-4" />
                    {bump.title || "OFERTA ESPECIAL"}
                </div>
                <Badge className="bg-orange-500 hover:bg-orange-600 text-xs">
                    {bump.discount_percent}% OFF
                </Badge>
            </div>

            {/* Conteúdo */}
            <div className="p-4 flex items-center gap-4">
                {/* Checkbox visual */}
                <div
                    className={cn(
                        "w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all",
                        selected
                            ? "bg-orange-500 border-orange-500"
                            : "border-muted-foreground/40"
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
                    selected
                        ? "bg-orange-500/20 text-orange-400"
                        : "bg-muted/50 text-muted-foreground"
                )}>
                    {selected ? "✓ Adicionado ao pedido" : "+ Clique para adicionar"}
                </div>
            </div>
        </div>
    )
}
