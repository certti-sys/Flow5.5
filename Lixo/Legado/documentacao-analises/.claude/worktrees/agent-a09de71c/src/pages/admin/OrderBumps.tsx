import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import {
    Edit2, Plus, Trash2, Zap, Eye, RefreshCw, Package,
    ArrowUpRight, Target, Percent, MousePointer2, Sparkles
} from "lucide-react"
import { toast } from "sonner"
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog"
import { AdminHeader } from "@/components/admin/AdminHeader"

interface OrderBump {
    id: string
    is_active: boolean
    title: string | null
    description: string | null
    offer_product_id: string
    trigger_product_id: string | null
    discount_percent: number
    priority: number
    color: string
    created_at: string
    offer_product?: { id: string; name: string; price: number; image_url: string | null }
    trigger_product?: { id: string; name: string } | null
}

interface Product {
    id: string
    name: string
    price: number
    image_url: string | null
}

interface FormData {
    is_active: boolean
    title: string
    description: string
    offer_product_id: string
    trigger_product_id: string
    discount_percent: number
    priority: number
    color: string
}

const defaultFormData: FormData = {
    is_active: true,
    title: "APROVEITE ESSA OFERTA EXCLUSIVA",
    description: "Leve junto e economize!",
    offer_product_id: "",
    trigger_product_id: "",
    discount_percent: 30,
    priority: 10,
    color: "orange"
}

const containerVars = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
}

const itemVars = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
}

export default function OrderBumpsPage() {
    const queryClient = useQueryClient()
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingBump, setEditingBump] = useState<OrderBump | null>(null)
    const [formData, setFormData] = useState<FormData>(defaultFormData)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [deletingBumpId, setDeletingBumpId] = useState<string | null>(null)

    const { data: orderBumps, isLoading, refetch } = useQuery({
        queryKey: ["order-bumps"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("order_bumps")
                .select(`
                    *,
                    offer_product:products!offer_product_id(id, name, price, image_url),
                    trigger_product:products!trigger_product_id(id, name)
                `)
                .order("priority", { ascending: false })
            if (error) throw error
            return data as OrderBump[]
        }
    })

    const { data: products } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("id, name, price, image_url")
                .eq("active", true)
                .order("name")
            if (error) throw error
            return data as Product[]
        }
    })

    const saveMutation = useMutation({
        mutationFn: async (data: FormData) => {
            const payload = {
                is_active: data.is_active,
                title: data.title || null,
                description: data.description || null,
                offer_product_id: data.offer_product_id,
                trigger_product_id: data.trigger_product_id || null,
                discount_percent: data.discount_percent,
                priority: data.priority,
                color: data.color
            }

            if (editingBump) {
                const { error } = await supabase
                    .from("order_bumps")
                    .update(payload)
                    .eq("id", editingBump.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from("order_bumps")
                    .insert(payload)
                if (error) throw error
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-bumps"] })
            setIsModalOpen(false)
            setEditingBump(null)
            setFormData(defaultFormData)
            toast.success(editingBump ? "Order bump atualizado!" : "Order bump criado!")
        },
        onError: (error: any) => {
            toast.error(error.message || "Erro ao salvar")
        }
    })

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("order_bumps").delete().eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-bumps"] })
            toast.success("Order bump deletado!")
        }
    })

    const toggleMutation = useMutation({
        mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
            const { error } = await supabase
                .from("order_bumps")
                .update({ is_active })
                .eq("id", id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["order-bumps"] })
        }
    })

    const handleCreate = () => {
        setEditingBump(null)
        setFormData(defaultFormData)
        setIsModalOpen(true)
    }

    const handleEdit = (bump: OrderBump) => {
        setEditingBump(bump)
        setFormData({
            is_active: bump.is_active,
            title: bump.title || "",
            description: bump.description || "",
            offer_product_id: bump.offer_product_id,
            trigger_product_id: bump.trigger_product_id || "",
            discount_percent: bump.discount_percent,
            priority: bump.priority,
            color: bump.color || "orange"
        })
        setIsModalOpen(true)
    }

    const formatPrice = (cents: number) => `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

    const getDiscountedPrice = (price: number, discount: number) => {
        return Math.round(price * (1 - discount / 100))
    }

    const selectedOfferProduct = products?.find(p => p.id === formData.offer_product_id)

    const stats = {
        total: orderBumps?.length ?? 0,
        active: orderBumps?.filter(b => b.is_active).length ?? 0,
        avgDiscount: orderBumps && orderBumps.length > 0
            ? Math.round(orderBumps.reduce((sum, b) => sum + b.discount_percent, 0) / orderBumps.length)
            : 0,
    }

    return (
        <motion.div 
            variants={containerVars}
            initial="hidden"
            animate="show"
            className="space-y-6 pb-20"
        >
            <AdminHeader
                title="Order Bumps"
                description="Estratégias de Upsell no Checkout para aumentar seu ticket médio."
                actionButton={
                    <div className="flex gap-2">
                        <Button
                            onClick={() => refetch()}
                            variant="outline"
                            className="glass-card border-white/5 hover:bg-white/10 text-white h-[44px] px-4 rounded-[14px]"
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                            Sincronizar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="gradient-primary shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all h-[44px] px-6 rounded-[14px] font-bold text-[13px] uppercase tracking-wider"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Bump
                        </Button>
                    </div>
                }
            />

            {/* Bento Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
               {[
                   { label: "Total de Ofertas", value: stats.total, icon: Zap, color: "primary" },
                   { label: "Bumps em Produção", value: stats.active, icon: Sparkles, color: "secondary" },
                   { label: "Desconto Médio", value: `${stats.avgDiscount}%`, icon: Percent, color: "accent" }
               ].map((stat, i) => (
                   <motion.div
                       key={i}
                       variants={itemVars}
                       className="glass-card p-6 rounded-[24px] border-white/5 bg-white/[0.01] relative overflow-hidden group"
                   >
                       <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500" />
                       <div className="relative z-10 flex items-center gap-4">
                           <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:border-primary/30 transition-all duration-500">
                               <stat.icon className="w-6 h-6 text-primary" />
                           </div>
                           <div>
                               <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">{stat.label}</p>
                               <h3 className="text-2xl font-black text-white mt-0.5 tracking-tight">{stat.value}</h3>
                           </div>
                       </div>
                   </motion.div>
               ))}
            </div>

            {/* Order Bumps Table */}
            <div className="glass-card rounded-[24px] border-white/5 overflow-hidden bg-white/[0.01]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-white/[0.02]">
                                <th className="text-left px-6 py-5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">Oferta & Desconto</th>
                                <th className="text-left px-6 py-5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/50 hidden md:table-cell">Gatilho (Alvo)</th>
                                <th className="text-center px-6 py-5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/50 hidden sm:table-cell w-32">Prioridade</th>
                                <th className="text-right px-6 py-5 text-[11px] font-black uppercase tracking-widest text-muted-foreground/50">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence mode="popLayout">
                                {orderBumps?.map((bump) => (
                                    <motion.tr
                                        key={bump.id}
                                        variants={itemVars}
                                        layout
                                        className={cn(
                                            "group/row hover:bg-white/[0.02] transition-all cursor-pointer",
                                            !bump.is_active && "opacity-50 grayscale-[0.5]"
                                        )}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                                    <Switch
                                                        checked={bump.is_active}
                                                        onCheckedChange={(checked) =>
                                                            toggleMutation.mutate({ id: bump.id, is_active: checked })
                                                        }
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                </div>
                                                <div className="flex items-center gap-4 min-w-0">
                                                    <div className="relative group/thumb">
                                                        {bump.offer_product?.image_url ? (
                                                            <img
                                                                src={bump.offer_product.image_url}
                                                                className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg group-hover/row:scale-105 transition-transform duration-500"
                                                                alt=""
                                                            />
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-orange-500/10 flex items-center justify-center border border-white/10 group-hover/row:scale-105 transition-transform duration-500">
                                                                <Package className="w-5 h-5 text-primary" />
                                                            </div>
                                                        )}
                                                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-lg flex items-center justify-center text-[10px] font-black text-white shadow-glow-sm scale-90 group-hover/row:scale-100 transition-transform">
                                                            {bump.discount_percent}%
                                                        </div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-white group-hover/row:text-primary transition-colors truncate max-w-[200px]">
                                                            {bump.offer_product?.name || "Produto sem nome"}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <span className="text-[12px] font-black text-emerald-400">
                                                                {formatPrice(getDiscountedPrice(bump.offer_product?.price || 0, bump.discount_percent))}
                                                            </span>
                                                            <span className="text-[10px] text-muted-foreground/50 line-through">
                                                                {formatPrice(bump.offer_product?.price || 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 hidden md:table-cell">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center scale-90">
                                                    <Target className="w-3.5 h-3.5 text-muted-foreground/60" />
                                                </div>
                                                <span className="text-xs font-bold text-muted-foreground/80">
                                                    {bump.trigger_product?.name || "Qualquer Produto (Global)"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center hidden sm:table-cell">
                                            <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-muted-foreground/40 uppercase">
                                                P{bump.priority}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleEdit(bump)
                                                    }}
                                                    className="w-10 h-10 rounded-xl hover:bg-white/10 text-muted-foreground hover:text-white transition-all border border-transparent hover:border-white/5 shadow-none"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost" size="icon"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setDeletingBumpId(bump.id)
                                                        setDeleteDialogOpen(true)
                                                    }}
                                                    className="w-10 h-10 rounded-xl hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-all shadow-none"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal de Criação / Edição — Design Premium 2.0 */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="glass-card border-white/10 rounded-[32px] max-w-3xl p-0 overflow-hidden bg-black/90 backdrop-blur-3xl shadow-2xl">
                    <DialogHeader className="p-8 border-b border-white/5 bg-white/[0.02] flex-row items-center gap-5 space-y-0">
                        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-glow-sm">
                            <Zap className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left">
                            <DialogTitle className="text-2xl font-black text-white tracking-tight">
                                {editingBump ? "Refinar Estratégia" : "Nova Oferta Relâmpago"}
                            </DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-1">
                                Otimize seu checkout adicionando produtos complementares irresistíveis.
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-1 lg:grid-cols-5 h-[65vh]">
                        {/* Formulário */}
                        <div className="lg:col-span-3 p-8 overflow-y-auto scrollbar-styled space-y-8 bg-black/40">
                             <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl">
                                    <div className="space-y-0.5">
                                        <Label className="text-white font-bold text-sm">Status da Oferta</Label>
                                        <p className="text-[11px] text-muted-foreground/60 uppercase font-black tracking-widest">Ativa no checkout agora</p>
                                    </div>
                                    <Switch
                                        checked={formData.is_active}
                                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-6">
                                    <div className="space-y-2.5">
                                        <Label className="text-white/60 text-xs font-black uppercase tracking-widest">Conteúdo da Chamada</Label>
                                        <Input
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            placeholder="Ex: APROVEITE ESSA OFERTA EXCLUSIVA"
                                            className="bg-white/5 border-white/10 h-12 rounded-xl text-white placeholder:text-white/20 focus:ring-primary/20"
                                        />
                                        <Input
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Ex: Leve junto e economize muito mais!"
                                            className="bg-white/5 border-white/10 h-12 rounded-xl text-white placeholder:text-white/20 focus:ring-primary/20"
                                        />
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label className="text-white/60 text-xs font-black uppercase tracking-widest">Produto a Ofertar</Label>
                                        <Select
                                            value={formData.offer_product_id}
                                            onValueChange={(val) => setFormData({ ...formData, offer_product_id: val })}
                                        >
                                            <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-white">
                                                <SelectValue placeholder="Selecione o produto principal" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#0f0f12] border-white/10">
                                                {products?.map((p) => (
                                                    <SelectItem key={p.id} value={p.id} className="text-white">
                                                        {p.name} — {formatPrice(p.price)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2.5">
                                        <Label className="text-white/60 text-xs font-black uppercase tracking-widest">Gatilho de Exibição (Onde aparecer?)</Label>
                                        <Select
                                            value={formData.trigger_product_id || "global"}
                                            onValueChange={(v) => setFormData({ ...formData, trigger_product_id: v === "global" ? "" : v })}
                                        >
                                            <SelectTrigger className="bg-white/5 border-white/10 h-12 rounded-xl text-white">
                                                <SelectValue placeholder="Qualquer produto (Global)" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-[#0f0f12] border-white/10">
                                                <SelectItem value="global" className="text-white">Global (Todos os Checkouts)</SelectItem>
                                                {products?.map((p) => (
                                                    <SelectItem key={p.id} value={p.id} className="text-white">Apenas quando comprar: {p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2.5">
                                            <Label className="text-white/60 text-xs font-black uppercase tracking-widest">Desconto (%)</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={formData.discount_percent}
                                                    onChange={(e) => setFormData({ ...formData, discount_percent: parseInt(e.target.value) || 0 })}
                                                    className="bg-white/5 border-white/10 h-12 rounded-xl text-white pr-10"
                                                />
                                                <Percent className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                            </div>
                                        </div>
                                        <div className="space-y-2.5">
                                            <Label className="text-white/60 text-xs font-black uppercase tracking-widest">Prioridade</Label>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    value={formData.priority}
                                                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                                                    className="bg-white/5 border-white/10 h-12 rounded-xl text-white pr-10"
                                                />
                                                <ArrowUpRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* Super Preview Real-time */}
                        <div className="lg:col-span-2 p-8 bg-gradient-to-br from-primary/5 to-transparent border-l border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="w-full max-w-[280px] space-y-6">
                                <div className="text-left space-y-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/60 flex items-center gap-2">
                                        <Eye className="w-3 h-3" /> Live Preview
                                    </Label>
                                    <p className="text-xs text-muted-foreground/50">Veja como aparecerá no checkout</p>
                                </div>

                                {selectedOfferProduct ? (
                                    <motion.div 
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="relative group/card"
                                    >
                                        {/* Glow Effect */}
                                        <div className="absolute inset-0 bg-primary/20 blur-3xl opacity-20" />
                                        
                                        <div className="relative border-2 border-primary/30 rounded-3xl overflow-hidden bg-[#0f0f12] shadow-2xl flex flex-col">
                                            {/* Header do Bump */}
                                            <div className="bg-gradient-to-r from-primary to-orange-600 px-4 py-3 flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-white font-black text-[10px] uppercase tracking-tighter">
                                                    <Zap className="w-3.5 h-3.5 fill-white" />
                                                    {formData.title || "OFERTA RELÂMPAGO"}
                                                </div>
                                                <div className="bg-black/20 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md">
                                                    {formData.discount_percent}% OFF
                                                </div>
                                            </div>
                                            
                                            {/* Body do Bump */}
                                            <div className="p-5 flex flex-col items-center text-center gap-4">
                                                <div className="relative h-28 w-28 rounded-2xl overflow-hidden shadow-inner border border-white/5">
                                                    {selectedOfferProduct.image_url ? (
                                                        <img src={selectedOfferProduct.image_url} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                                            <Package className="w-8 h-8 text-white/10" />
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                <div className="space-y-1">
                                                    <h4 className="text-sm font-bold text-white line-clamp-1">{selectedOfferProduct.name}</h4>
                                                    <p className="text-[11px] text-muted-foreground/60 leading-tight h-8 line-clamp-2">
                                                        {formData.description || "Descrição da oferta complementar..."}
                                                    </p>
                                                </div>

                                                <div className="w-full pt-2 flex items-center justify-center gap-3">
                                                    <span className="text-muted-foreground/30 line-through text-xs">{formatPrice(selectedOfferProduct.price)}</span>
                                                    <span className="text-emerald-400 font-black text-xl">
                                                        {formatPrice(getDiscountedPrice(selectedOfferProduct.price, formData.discount_percent))}
                                                    </span>
                                                </div>

                                                <Button disabled className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-2xl h-11 pointer-events-none font-black text-[10px] uppercase tracking-widest mt-2">
                                                    Adicionar Agora
                                                </Button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <div className="aspect-[3/4] rounded-3xl border-2 border-dashed border-white/5 flex flex-col items-center justify-center p-8 text-muted-foreground/30">
                                        <MousePointer2 className="w-8 h-8 mb-4 animate-pulse" />
                                        <p className="text-xs font-bold uppercase tracking-widest">Aguardando Produto</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[32px]">
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            className="h-12 px-8 glass-card border-white/10 hover:bg-white/5 rounded-2xl text-white bg-transparent font-black uppercase tracking-widest text-[10px]"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={() => saveMutation.mutate(formData)}
                            disabled={!formData.offer_product_id || saveMutation.isPending}
                            className="h-12 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] shadow-glow"
                        >
                            {saveMutation.isPending ? "Processando..." : editingBump ? "Atualizar Estratégia" : "Ativar Oferta"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <ConfirmDeleteDialog
                open={deleteDialogOpen}
                onOpenChange={(open) => {
                    setDeleteDialogOpen(open)
                    if (!open) setDeletingBumpId(null)
                }}
                onConfirm={() => {
                    if (deletingBumpId) {
                        deleteMutation.mutate(deletingBumpId, {
                            onSettled: () => {
                                setDeleteDialogOpen(false)
                                setDeletingBumpId(null)
                            }
                        })
                    }
                }}
                title="Deletar Order Bump"
                description="Tem certeza que deseja deletar este order bump? Ele será removido do checkout imediatamente."
                confirmLabel="Deletar Order Bump"
                isPending={deleteMutation.isPending}
            />
        </motion.div>
    )
}
