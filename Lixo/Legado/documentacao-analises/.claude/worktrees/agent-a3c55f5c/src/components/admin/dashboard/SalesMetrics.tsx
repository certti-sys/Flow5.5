import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    DollarSign, TrendingUp, ShoppingCart, CreditCard,
    ArrowUpRight, ArrowDownRight, Package
} from "lucide-react";

interface SalesMetrics {
    totalRevenue: number;
    todayRevenue: number;
    monthRevenue: number;
    totalOrders: number;
    paidOrders: number;
    pendingOrders: number;
    averageTicket: number;
}

export function SalesMetrics() {
    const { data: metrics, isLoading } = useQuery({
        queryKey: ["sales-metrics"],
        queryFn: async () => {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

            // Total Revenue (all time)
            const { data: allPayments } = await supabase
                .from("payments")
                .select("amount")
                .eq("status", "paid");

            const totalRevenue = allPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

            // Today Revenue
            const { data: todayPayments } = await supabase
                .from("payments")
                .select("amount")
                .eq("status", "paid")
                .gte("created_at", startOfDay);

            const todayRevenue = todayPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

            // Month Revenue
            const { data: monthPayments } = await supabase
                .from("payments")
                .select("amount")
                .eq("status", "paid")
                .gte("created_at", startOfMonth);

            const monthRevenue = monthPayments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

            // Orders count
            const { count: totalOrders } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true });

            const { count: paidOrders } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("status", "paid");

            const { count: pendingOrders } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");

            const averageTicket = paidOrders && paidOrders > 0 ? totalRevenue / paidOrders : 0;

            return {
                totalRevenue,
                todayRevenue,
                monthRevenue,
                totalOrders: totalOrders || 0,
                paidOrders: paidOrders || 0,
                pendingOrders: pendingOrders || 0,
                averageTicket
            } as SalesMetrics;
        },
        refetchInterval: 60000 // Atualiza a cada minuto
    });

    const formatCurrency = (amount: number) => {
        return `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`;
    };

    if (isLoading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardContent className="p-6">
                            <div className="animate-pulse space-y-3">
                                <div className="h-4 bg-muted rounded w-1/2"></div>
                                <div className="h-8 bg-muted rounded w-3/4"></div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const cards = [
        {
            title: "Faturamento Total",
            value: formatCurrency(metrics?.totalRevenue || 0),
            icon: DollarSign,
            description: "Todo o período",
            color: "text-green-500",
            bgColor: "bg-green-500/10"
        },
        {
            title: "Vendas Hoje",
            value: formatCurrency(metrics?.todayRevenue || 0),
            icon: TrendingUp,
            description: "Nas últimas 24h",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10"
        },
        {
            title: "Vendas do Mês",
            value: formatCurrency(metrics?.monthRevenue || 0),
            icon: CreditCard,
            description: "Mês atual",
            color: "text-purple-500",
            bgColor: "bg-purple-500/10"
        },
        {
            title: "Ticket Médio",
            value: formatCurrency(metrics?.averageTicket || 0),
            icon: ShoppingCart,
            description: `${metrics?.paidOrders || 0} pedidos pagos`,
            color: "text-orange-500",
            bgColor: "bg-orange-500/10"
        }
    ];

    return (
        <div className="space-y-6">
            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {cards.map((card, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm text-muted-foreground">{card.title}</p>
                                    <p className="text-2xl font-bold">{card.value}</p>
                                    <p className="text-xs text-muted-foreground">{card.description}</p>
                                </div>
                                <div className={`p-3 rounded-full ${card.bgColor}`}>
                                    <card.icon className={`w-6 h-6 ${card.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Resumo de Pedidos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Package className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total de Pedidos</p>
                            <p className="text-xl font-bold">{metrics?.totalOrders || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-green-500/10">
                            <ArrowUpRight className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pedidos Pagos</p>
                            <p className="text-xl font-bold text-green-500">{metrics?.paidOrders || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-3 rounded-full bg-yellow-500/10">
                            <ArrowDownRight className="w-5 h-5 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Pendentes</p>
                            <p className="text-xl font-bold text-yellow-500">{metrics?.pendingOrders || 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
