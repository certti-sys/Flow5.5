
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/payment";
import { ProductFormModal } from "@/components/admin/ProductFormModal";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Edit2, Plus, ExternalLink, Trash2, Search,
    Package, RefreshCw, ShoppingBag, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { CheckCircle2, XCircle } from "lucide-react";

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.06 }
    }
};

const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
};

const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="glass-card p-6 relative overflow-hidden group border-white/5 hover:border-white/10 transition-all duration-500 rounded-[20px] bg-white/[0.01]">
        <div className="flex items-center gap-3 relative z-10">
            <div className={cn("p-2.5 rounded-[12px] bg-white/[0.03] border border-white/5", colorClass)}>
                <Icon className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
                <span className="text-[12px] font-bold text-muted-foreground uppercase tracking-wider">{title}</span>
                <h3 className="text-[22px] font-black text-white leading-none mt-1 uppercase tracking-tighter">{value}</h3>
            </div>
        </div>
    </Card>
);

export default function ProductsPage() {
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const queryClient = useQueryClient();

    const { data: products, isLoading, refetch } = useQuery({
        queryKey: ["products"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("products")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as Product[];
        },
    });

    const handleCreate = () => {
        setSelectedProduct(null);
        setIsModalOpen(true);
    };

    const handleEdit = (product: Product) => {
        setSelectedProduct(product);
        setIsModalOpen(true);
    };

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase
                .from("products")
                .delete()
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Produto excluído com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["products"] });
            setProductToDelete(null);
        },
        onError: (error: any) => {
            toast.error("Erro ao excluir produto: " + error.message);
        }
    });

    const filteredProducts = products?.filter(p => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            p.name.toLowerCase().includes(term) ||
            p.description?.toLowerCase().includes(term)
        );
    });

    const formatCurrency = (amount?: number) => {
        if (!amount) return "—";
        return `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`;
    };

    const stats = {
        total: products?.length ?? 0,
        active: products?.filter(p => p.active).length ?? 0,
        oneTime: products?.filter(p => p.type === 'one_time').length ?? 0,
        subscription: products?.filter(p => p.type === 'subscription').length ?? 0,
    };

    return (
        <div className="space-y-6 pb-20">
            <AdminHeader
                title="Gestão de Produtos"
                description="Controle de cursos, assinaturas e ofertas da plataforma."
                searchValue={searchTerm}
                onSearchChange={setSearchTerm}
                searchPlaceholder="Buscar por nome ou descrição..."
                actionButton={
                    <div className="flex items-center gap-3">
                        <Button 
                            onClick={() => refetch()} 
                            variant="ghost"
                            className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/80 h-[44px] rounded-[12px] px-5 font-bold font-inter text-[13px]"
                        >
                            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                            Sincronizar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="bg-primary hover:bg-primary/90 text-white shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px] border-none"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Novo Produto
                        </Button>
                    </div>
                }
            />

            {/* Stats Section */}
            <motion.div 
                layout
                initial="hidden"
                animate="show"
                variants={container}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
            >
                <motion.div variants={item}><StatCard title="Total de Produtos" value={stats.total} icon={Package} colorClass="text-blue-500" /></motion.div>
                <motion.div variants={item}><StatCard title="Produtos Ativos" value={stats.active} icon={ShoppingBag} colorClass="text-emerald-500" /></motion.div>
                <motion.div variants={item}><StatCard title="Venda Única" value={stats.oneTime} icon={CreditCard} colorClass="text-amber-500" /></motion.div>
                <motion.div variants={item}><StatCard title="Assinatura" value={stats.subscription} icon={RefreshCw} colorClass="text-purple-500" /></motion.div>
            </motion.div>

            {/* Product List - Refined Bento */}
            <motion.div layout className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-white/[0.03] border-b border-white/5 text-muted-foreground/60 text-[11px] font-bold uppercase tracking-[0.1em]">
                                <th className="px-6 py-4 text-left">Informações do Produto</th>
                                <th className="px-6 py-4 text-center hidden sm:table-cell">Status</th>
                                <th className="px-6 py-4 text-left hidden md:table-cell">Tipo</th>
                                <th className="px-6 py-5 text-right">Preço</th>
                                <th className="px-6 py-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {isLoading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={5} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full"></div></td>
                                    </tr>
                                ))
                            ) : filteredProducts && filteredProducts.length > 0 ? (
                                <AnimatePresence mode="popLayout">
                                    {filteredProducts.map((product) => (
                                        <motion.tr
                                            key={product.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="hover:bg-white/[0.03] transition-all group/row border-l-2 border-l-transparent hover:border-l-primary/40"
                                        >
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-[44px] h-[44px] rounded-[14px] bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center border border-white/10 group-hover/row:scale-105 transition-transform duration-500">
                                                        <Package className="w-5 h-5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-bold text-[15px] text-white/90 leading-tight group-hover/row:text-primary transition-colors">
                                                            {product.name}
                                                        </p>
                                                        {product.description && (
                                                            <p className="text-[12px] text-muted-foreground truncate max-w-[300px] mt-1 group-hover/row:text-white/60 transition-colors">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center hidden sm:table-cell">
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border-white/5 transition-all duration-300",
                                                        product.active
                                                            ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                                                            : "bg-red-500/10 text-red-500 border-red-500/20"
                                                    )}
                                                >
                                                    {product.active ? (
                                                        <><CheckCircle2 className="w-3 h-3 mr-1.5" /> Ativo</>
                                                    ) : (
                                                        <><XCircle className="w-3 h-3 mr-1.5" /> Inativo</>
                                                    )}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 hidden md:table-cell">
                                                <Badge
                                                    variant="outline"
                                                    className="text-[10px] uppercase font-bold tracking-widest bg-black/40 border-white/5 text-white/40 rounded-lg"
                                                >
                                                    {product.type === 'one_time' ? 'Venda Única' : 'Assinatura'}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-white text-[16px] tracking-tight">
                                                {product.price != null && product.price > 0 ? formatCurrency(product.price) : "—"}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => window.open(`/checkout/${product.id}`, '_blank')}
                                                        className="w-9 h-9 rounded-xl hover:bg-white/10 text-white/60 hover:text-white border border-white/5 transition-all duration-300 shadow-none"
                                                    >
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={() => handleEdit(product)}
                                                        className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/20 transition-all duration-300 shadow-none"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setProductToDelete(product);
                                                        }}
                                                        className="w-9 h-9 rounded-xl hover:bg-red-500/20 text-muted-foreground hover:text-red-500 border border-white/5 transition-all duration-300 shadow-none"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Package className="w-8 h-8 text-white/10" />
                                            </div>
                                            <div>
                                                <p className="text-white/40 font-bold uppercase tracking-widest text-[12px]">Nenhum produto encontrado</p>
                                                <Button variant="link" onClick={() => setSearchTerm("")} className="text-primary mt-1 text-[13px] font-bold">Limpar Busca</Button>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>

            <ProductFormModal
                product={selectedProduct}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />

            <ConfirmDeleteDialog
                open={!!productToDelete}
                onOpenChange={(open) => !open && setProductToDelete(null)}
                onConfirm={() => productToDelete && deleteMutation.mutate(productToDelete.id)}
                title="EXCLUIR PRODUTO"
                description={`Atenção: O produto "${productToDelete?.name}" será removido permanentemente. Esta ação não poderá ser revertida.`}
                confirmLabel="Excluir Definitivamente"
                isPending={deleteMutation.isPending}
            />
        </div>
    );
}
