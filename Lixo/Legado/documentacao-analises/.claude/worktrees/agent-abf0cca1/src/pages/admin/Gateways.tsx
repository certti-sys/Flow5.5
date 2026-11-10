
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
        <div className="space-y-8 pb-12">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
                <div>
                    <h1 className="text-[28px] font-semibold tracking-tight text-white leading-[36px]">
                        Gateways de Pagamento
                    </h1>
                    <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
                        Gerencie os provedores de pagamento disponíveis para checkout.
                    </p>
                </div>
                <Button
                    onClick={() => refetch()}
                    variant="outline"
                    className="glass-card border-white/10 hover:bg-white/5 h-[40px] px-4 rounded-[12px]"
                >
                    <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                    Atualizar
                </Button>
            </motion.div>

            {/* Bento Grid Stats */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-[16px]"
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
                        <div className="glass-card p-[24px] relative overflow-hidden group border border-white/10 hover:border-white/20 transition-all duration-500 rounded-[16px]">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500" />
                            <div className="flex items-center gap-[8px] mb-[16px]">
                                <div className={`p-[10px] rounded-[12px] bg-black/40 border border-white/10 ${stat.color}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                                <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
                            </div>
                            <h3 className="text-[24px] font-bold font-geist tracking-tighter leading-[28px] capitalize">{stat.value}</h3>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Gateway Cards */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-56 w-full animate-pulse bg-white/5 rounded-[16px]" />
                    ))}
                </div>
            ) : gateways && gateways.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                    <AnimatePresence mode="popLayout">
                        {gateways.map((gateway, idx) => (
                            <motion.div
                                key={gateway.id}
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.06 }}
                                className={cn(
                                    "glass-card p-[24px] border rounded-[16px] relative overflow-hidden group transition-all duration-500",
                                    gateway.is_default
                                        ? "border-primary/40 shadow-[0_0_30px_rgba(139,92,246,0.15)]"
                                        : "border-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-500" />

                                {/* Header */}
                                <div className="flex items-center justify-between mb-[20px] relative z-10">
                                    <div className="flex items-center gap-[12px]">
                                        <div className={cn(
                                            "w-[44px] h-[44px] rounded-[12px] flex items-center justify-center border",
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
                                            <h4 className="text-[16px] font-bold text-white capitalize">{gateway.name}</h4>
                                            <p className="text-[11px] font-mono text-white/30">{gateway.slug}</p>
                                        </div>
                                    </div>

                                    {gateway.is_default && (
                                        <Badge
                                            variant="outline"
                                            className="bg-primary/10 text-primary border-primary/20 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                                        >
                                            <Star className="w-3 h-3 mr-1 fill-primary" />
                                            Padrão
                                        </Badge>
                                    )}
                                </div>

                                {/* Status Toggle */}
                                <div className="flex items-center justify-between p-[14px] bg-black/30 rounded-[12px] border border-white/5 mb-[16px]">
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
                                <div className="flex gap-2 relative z-10">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 glass-card border-white/10 hover:bg-white/10 h-[40px] rounded-[12px] text-[11px] uppercase tracking-widest font-bold"
                                        onClick={() => handleConfigure(gateway)}
                                    >
                                        <Settings className="w-3.5 h-3.5 mr-1.5" />
                                        Configurar
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        title={gateway.is_default ? "Gateway Padrão" : "Definir como Padrão"}
                                        disabled={gateway.is_default}
                                        onClick={() => setDefaultMutation.mutate(gateway.id)}
                                        className={cn(
                                            "w-[40px] h-[40px] rounded-[12px] transition-all",
                                            gateway.is_default
                                                ? "bg-primary/10 border-primary/20 text-primary cursor-default"
                                                : "glass-card border-white/10 hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-400 text-white/40"
                                        )}
                                    >
                                        {gateway.is_default ? (
                                            <Star className="w-4 h-4 fill-primary text-primary" />
                                        ) : (
                                            <StarOff className="w-4 h-4" />
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
                    className="glass-card p-[64px] flex flex-col items-center justify-center text-center gap-4 border-dashed border-white/10 rounded-[16px]"
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
        </div>
    );
}
