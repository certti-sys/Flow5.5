
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Gateway } from "@/types/payment";
import { GatewayConfigModal } from "@/components/admin/GatewayConfigModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  CreditCard, Settings, Star, StarOff, RefreshCw,
  Wallet, CheckCircle2, XCircle
} from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";

export default function GatewaysPage() {
    const queryClient = useQueryClient();
    const [selectedGateway, setSelectedGateway] = useState<Gateway | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data: gateways, isLoading, refetch } = useQuery({
        queryKey: ["gateways"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("gateways")
                .select("*")
                .order("name");
            if (error) throw error;
            return data as Gateway[];
        },
    });

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, currentState }: { id: string; currentState: boolean }) => {
            const { error } = await supabase
                .from("gateways")
                .update({ is_active: !currentState })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gateways"] });
            toast.success("Status do gateway atualizado.");
        },
        onError: (e: any) => toast.error(e.message),
    });

    const setDefaultMutation = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("gateways").update({ is_default: false }).neq("id", id);
            const { error } = await supabase.from("gateways").update({ is_default: true }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["gateways"] });
            toast.success("Gateway padrão definido.");
        },
    });

    const handleConfigure = (gateway: Gateway) => {
        setSelectedGateway(gateway);
        setIsModalOpen(true);
    };

    const stats = {
        total: gateways?.length ?? 0,
        active: gateways?.filter(g => g.is_active).length ?? 0,
        defaultGw: gateways?.find(g => g.is_default)?.name ?? "—",
    };

    const gatewayColor: Record<string, string> = {
        mercadopago: "text-blue-400",
        stripe: "text-purple-400",
        asaas: "text-emerald-400",
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6 pb-20"
        >
            {/* Header */}
            <AdminHeader
                title="Gateways de Pagamento"
                description="Gerencie os provedores de pagamento disponíveis para checkout."
                showSearch={false}
                actionButton={
                    <Button
                        onClick={() => refetch()}
                        variant="outline"
                        className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-5 rounded-[12px] font-bold text-[13px] tracking-tight"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                        Atualizar
                    </Button>
                }
            />

            {/* Bento Grid Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
                {[
                    { label: "Total de Gateways", value: String(stats.total), icon: Wallet, color: "text-blue-500" },
                    { label: "Gateways Ativos", value: String(stats.active), icon: CheckCircle2, color: "text-emerald-500" },
                    { label: "Gateway Padrão", value: stats.defaultGw, icon: Star, color: "text-amber-500" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.06 }}
                    >
                        <div className="glass-card p-6 relative overflow-hidden group border border-white/10 hover:border-white/20 transition-all duration-500 rounded-[20px]">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`p-3 rounded-[12px] bg-black/40 border border-white/10 ${stat.color}`}>
                                        <stat.icon className="w-5 h-5" />
                                    </div>
                                    <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white leading-tight capitalize">{stat.value}</h3>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Gateway Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-[200px] w-full animate-pulse bg-white/5 rounded-[20px]" />
                    ))}
                </div>
            ) : gateways && gateways.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {gateways.map((gateway, idx) => (
                            <motion.div
                                key={gateway.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className={cn(
                                    "glass-card p-6 border rounded-[20px] relative overflow-hidden group transition-all duration-500",
                                    gateway.is_default
                                        ? "border-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                                        : "border-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 group-hover:bg-primary/10 transition-all duration-500" />

                                {/* Header */}
                                <div className="flex items-center justify-between mb-6 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-12 h-12 rounded-[14px] flex items-center justify-center border",
                                            gateway.is_active
                                                ? "bg-gradient-to-br from-primary/20 to-secondary/20 border-white/10"
                                                : "bg-black/40 border-white/5"
                                        )}>
                                            <CreditCard className={cn(
                                                "w-5 h-5",
                                                gatewayColor[gateway.slug] || "text-primary"
                                            )} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-[15px] text-white capitalize">{gateway.name}</h4>
                                            <p className="text-[11px] font-mono text-white/30">{gateway.slug}</p>
                                        </div>
                                    </div>

                                    {gateway.is_default && (
                                        <Badge
                                            variant="outline"
                                            className="bg-primary/10 text-primary border-primary/20 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                                        >
                                            <Star className="w-3 h-3 mr-1 fill-primary" />
                                            Padrão
                                        </Badge>
                                    )}
                                </div>

                                {/* Status Toggle */}
                                <div className="flex items-center justify-between p-4 bg-black/30 rounded-[16px] border border-white/5 mb-6">
                                    <div className="flex items-center gap-2">
                                        {gateway.is_active ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-4 h-4 text-white/20" />
                                        )}
                                        <span className={cn(
                                            "text-[13px] font-medium",
                                            gateway.is_active ? "text-emerald-400" : "text-white/40"
                                        )}>
                                            {gateway.is_active ? "Ativo" : "Inativo"}
                                        </span>
                                    </div>
                                    <Switch
                                        checked={gateway.is_active}
                                        onCheckedChange={() =>
                                            toggleActiveMutation.mutate({ id: gateway.id, currentState: gateway.is_active })
                                        }
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 relative z-20">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 glass-card border-white/10 hover:bg-white/5 h-[44px] rounded-[12px] text-[11px] uppercase tracking-widest font-bold text-white"
                                        onClick={() => handleConfigure(gateway)}
                                    >
                                        <Settings className="w-4 h-4 mr-2" />
                                        Configurar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        title={gateway.is_default ? "Gateway Padrão" : "Definir como Padrão"}
                                        disabled={gateway.is_default}
                                        onClick={() => setDefaultMutation.mutate(gateway.id)}
                                        className={cn(
                                            "w-10 h-10 rounded-[12px] transition-all shadow-lg",
                                            gateway.is_default
                                                ? "bg-primary/10 border-primary/20 text-primary cursor-default"
                                                : "glass-card border-white/10 hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-400 text-white/40"
                                        )}
                                    >
                                        {gateway.is_default ? (
                                            <Star className="w-5 h-5 fill-primary text-primary" />
                                        ) : (
                                            <StarOff className="w-5 h-5" />
                                        )}
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            ) : (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card p-12 flex flex-col items-center justify-center text-center gap-4 border-dashed border-white/10 rounded-[20px]"
                >
                    <div className="w-[80px] h-[80px] rounded-full bg-white/5 flex items-center justify-center">
                        <CreditCard className="w-10 h-10 text-white/10" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">Nenhum gateway encontrado</h3>
                        <p className="text-white/40 max-w-[300px] mt-1 text-[14px]">
                            Configure um provedor de pagamento para habilitar o checkout.
                        </p>
                    </div>
                </motion.div>
            )}

            <GatewayConfigModal
                gateway={selectedGateway}
                open={isModalOpen}
                onOpenChange={setIsModalOpen}
            />
        </motion.div>
    );
}