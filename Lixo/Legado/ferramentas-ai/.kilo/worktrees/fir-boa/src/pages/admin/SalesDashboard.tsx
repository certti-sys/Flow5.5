import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfDay, startOfWeek, startOfMonth, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import {
    DollarSign, TrendingUp, ShoppingCart, CreditCard,
    Package, ArrowUpRight, ArrowDownRight, BarChart3,
    Users, RefreshCw
} from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useTheme } from "@/hooks/useTheme";

type PeriodFilter = "today" | "week" | "month" | "year" | "all";

export default function SalesDashboard() {
    const [period, setPeriod] = useState<PeriodFilter>("all");

    const getPeriodStart = (p: PeriodFilter) => {
        const now = new Date();
        switch (p) {
            case "today": return startOfDay(now).toISOString();
            case "week": return startOfWeek(now, { weekStartsOn: 0 }).toISOString();
            case "month": return startOfMonth(now).toISOString();
            case "year": return startOfYear(now).toISOString();
            default: return null;
        }
    };

    const { data: metrics, isLoading, refetch } = useQuery({
        queryKey: ["sales-dashboard-metrics", period],
        queryFn: async () => {
            const periodStart = getPeriodStart(period);

            // Query base
            let paymentsQuery = supabase
                .from("payments")
                .select("amount, payment_method_type, created_at")
                .eq("status", "paid");

            if (periodStart) {
                paymentsQuery = paymentsQuery.gte("created_at", periodStart);
            }

            const { data: payments } = await paymentsQuery;

            // Calcular métricas
            const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
            const totalSales = payments?.length || 0;
            const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

            // Vendas por método
            const byMethod: Record<string, number> = {};
            payments?.forEach(p => {
                const method = p.payment_method_type || "unknown";
                byMethod[method] = (byMethod[method] || 0) + (p.amount || 0);
            });

            // Pedidos
            let ordersQuery = supabase
                .from("orders")
                .select("id, status, created_at", { count: "exact" });

            if (periodStart) {
                ordersQuery = ordersQuery.gte("created_at", periodStart);
            }

            const { count: totalOrders } = await ordersQuery;

            const { count: paidOrders } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("status", "paid")
                .gte("created_at", periodStart || "1900-01-01");

            const { count: pendingOrders } = await supabase
                .from("orders")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending")
                .gte("created_at", periodStart || "1900-01-01");

            // Clientes
            const { count: totalCustomers } = await supabase
                .from("customers")
                .select("*", { count: "exact", head: true });

            // Dados para o gráfico (Mock parcial se vazio)
            const chartData = [
                { name: "Seg", total: 450 },
                { name: "Ter", total: 820 },
                { name: "Qua", total: 610 },
                { name: "Qui", total: 950 },
                { name: "Sex", total: 1200 },
                { name: "Sáb", total: 890 },
                { name: "Dom", total: 540 }
            ];

            return {
                totalRevenue,
                totalSales,
                avgTicket,
                byMethod,
                chartData,
                totalOrders: totalOrders || 0,
                paidOrders: paidOrders || 0,
                pendingOrders: pendingOrders || 0,
                totalOrdersInPeriod: totalOrders || 0,
                totalCustomers: totalCustomers || 0,
                conversionRate: totalOrders && totalOrders > 0
                    ? Math.round((paidOrders || 0) / totalOrders * 100)
                    : 0
            };
        }
    });

    // Top Produtos
    const { data: topProducts } = useQuery({
        queryKey: ["top-products", period],
        queryFn: async () => {
            const periodStart = getPeriodStart(period);

            let query = supabase
                .from("order_items")
                .select(`
                    product_id,
                    unit_amount,
                    quantity,
                    order:orders!inner(status, created_at),
                    product:products(name)
                `)
                .eq("order.status", "paid");

            if (periodStart) {
                query = query.gte("order.created_at", periodStart);
            }

            const { data } = await query;

            // Agrupar por produto
            const productSales: Record<string, { name: string; total: number; qty: number }> = {};
            data?.forEach((item: any) => {
                const id = item.product_id;
                if (!productSales[id]) {
                    productSales[id] = { name: item.product?.name || "Produto", total: 0, qty: 0 };
                }
                productSales[id].total += item.unit_amount * item.quantity;
                productSales[id].qty += item.quantity;
            });

            return Object.entries(productSales)
                .map(([id, data]) => ({ id, ...data }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 5);
        }
    });

    // Últimas Vendas
    const { data: recentSales } = useQuery({
        queryKey: ["recent-sales"],
        queryFn: async () => {
            const { data } = await supabase
                .from("payments")
                .select(`
                    id,
                    amount,
                    payment_method_type,
                    created_at,
                    order:orders(
                        id,
                        profile:profiles!user_id(name, email),
                        order_items(product:products(name))
                    )
                `)
                .eq("status", "paid")
                .order("created_at", { ascending: false })
                .limit(10);

            return data;
        }
    });

    const formatCurrency = (amount: number) => {
        return `R$ ${(amount / 100).toFixed(2).replace(".", ",")}`;
    };

    const periodLabels: Record<PeriodFilter, string> = {
        today: "Hoje",
        week: "Esta Semana",
        month: "Este Mês",
        year: "Este Ano",
        all: "Todo Período"
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        Dashboard de Vendas
                    </h1>
                    <p className="text-muted-foreground">Acompanhe o desempenho das suas vendas</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="today">Hoje</SelectItem>
                            <SelectItem value="week">Esta Semana</SelectItem>
                            <SelectItem value="month">Este Mês</SelectItem>
                            <SelectItem value="year">Este Ano</SelectItem>
                            <SelectItem value="all">Todo Período</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" size="icon" onClick={() => refetch()}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Métricas Principais */}
            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Card key={i}><CardContent className="p-6"><div className="animate-pulse h-16 bg-muted rounded" /></CardContent></Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Faturamento</p>
                                    <p className="text-2xl font-bold text-green-500">{formatCurrency(metrics?.totalRevenue || 0)}</p>
                                    <p className="text-xs text-muted-foreground">{periodLabels[period]}</p>
                                </div>
                                <div className="p-3 rounded-full bg-green-500/20">
                                    <DollarSign className="w-6 h-6 text-green-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total de Vendas</p>
                                    <p className="text-2xl font-bold">{metrics?.totalSales || 0}</p>
                                    <p className="text-xs text-muted-foreground">{metrics?.paidOrders} pedidos pagos</p>
                                </div>
                                <div className="p-3 rounded-full bg-blue-500/10">
                                    <ShoppingCart className="w-6 h-6 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Ticket Médio</p>
                                    <p className="text-2xl font-bold">{formatCurrency(metrics?.avgTicket || 0)}</p>
                                    <p className="text-xs text-muted-foreground">por venda</p>
                                </div>
                                <div className="p-3 rounded-full bg-purple-500/10">
                                    <CreditCard className="w-6 h-6 text-purple-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Conversão</p>
                                    <p className="text-2xl font-bold">{metrics?.conversionRate || 0}%</p>
                                    <p className="text-xs text-muted-foreground">{metrics?.pendingOrders} pendentes</p>
                                </div>
                                <div className="p-3 rounded-full bg-orange-500/10">
                                    <TrendingUp className="w-6 h-6 text-orange-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Gráfico de Vendas */}
            <Card className="glass-card border-white/10">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Desempenho de Vendas (Mock Visual)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={metrics?.chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: "#94a3b8", fontSize: 12 }}
                                    tickFormatter={(value) => `R$ ${value}`}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: "hsl(var(--card))",
                                        border: "1px solid hsl(var(--border))",
                                        borderRadius: "12px",
                                        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                                    }}
                                    itemStyle={{ color: "hsl(var(--foreground))" }}
                                    cursor={{ fill: "hsl(var(--primary) / 0.05)" }}
                                />
                                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                                    {metrics?.chartData.map((entry: any, index: number) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={index % 2 === 0 ? "hsl(var(--primary))" : "hsl(var(--primary) / 0.4)"}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Segunda Linha */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Produtos */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="w-5 h-5" />
                            Top Produtos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topProducts && topProducts.length > 0 ? (
                            <div className="space-y-4">
                                {topProducts.map((product, index) => (
                                    <div key={product.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center">
                                                {index + 1}
                                            </Badge>
                                            <div>
                                                <p className="font-medium">{product.name}</p>
                                                <p className="text-xs text-muted-foreground">{product.qty} vendas</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-green-500">{formatCurrency(product.total)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Nenhuma venda no período</p>
                        )}
                    </CardContent>
                </Card>

                {/* Vendas por Método */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CreditCard className="w-5 h-5" />
                            Vendas por Método
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {metrics?.byMethod && Object.keys(metrics.byMethod).length > 0 ? (
                            <div className="space-y-4">
                                {Object.entries(metrics.byMethod).map(([method, amount]) => (
                                    <div key={method} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="secondary">{method.toUpperCase()}</Badge>
                                        </div>
                                        <span className="font-bold">{formatCurrency(amount)}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-muted-foreground py-8">Nenhuma venda no período</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Últimas Vendas */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ArrowUpRight className="w-5 h-5 text-green-500" />
                        Últimas Vendas
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {recentSales && recentSales.length > 0 ? (
                        <div className="space-y-3">
                            {recentSales.map((sale: any) => (
                                <div key={sale.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-full bg-green-500/10">
                                            <DollarSign className="w-4 h-4 text-green-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {sale.order?.profile?.name || sale.order?.profile?.email || "Cliente"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {sale.order?.order_items?.map((i: any) => i.product?.name).join(", ") || "Produto"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-green-500">{formatCurrency(sale.amount)}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(sale.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Nenhuma venda registrada</p>
                    )}
                </CardContent>
            </Card>

            {/* Resumo de Clientes */}
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                            <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{metrics?.totalCustomers || 0}</p>
                            <p className="text-sm text-muted-foreground">Clientes cadastrados</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
