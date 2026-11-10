import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { motion } from "framer-motion";
import { AdminHeader } from "@/components/admin/AdminHeader";

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

      let paymentsQuery = supabase
        .from("payments")
        .select("amount, payment_method_type, created_at")
        .eq("status", "paid");

      if (periodStart) {
        paymentsQuery = paymentsQuery.gte("created_at", periodStart);
      }

      const { data: payments } = await paymentsQuery;

      const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
      const totalSales = payments?.length || 0;
      const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

      const byMethod: Record<string, number> = {};
      payments?.forEach(p => {
        const method = p.payment_method_type || "unknown";
        byMethod[method] = (byMethod[method] || 0) + (p.amount || 0);
      });

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

      const { count: totalCustomers } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true });

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

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } }
  };

  const itemAnim = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

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
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      {/* Header */}
      <motion.div variants={itemAnim} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-white flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-amber-500" />
            Dashboard de Vendas
          </h1>
          <p className="text-muted-foreground mt-1">Acompanhe o desempenho das suas vendas</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] px-4 text-white">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl rounded-[12px]">
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
              <SelectItem value="all">Todo Período</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} className="glass-card border-white/10 hover:bg-white/5 h-[44px] w-[44px] rounded-[12px] flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>

      {/* Métricas Principais */}
      <motion.div variants={itemAnim}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[160px] bg-gradient-to-tr from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-50 transition-opacity duration-1000" />
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-400 font-bold uppercase tracking-widest mb-1">Faturamento</p>
                  <p className="text-2xl font-black text-white leading-tight">{formatCurrency(metrics?.totalRevenue || 0)}</p>
                  <p className="text-xs text-emerald-200/60 mt-1">{periodLabels[period]}</p>
                </div>
                <div className="p-3 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <DollarSign className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[160px] bg-white/[0.01] border-white/5">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">Total de Vendas</p>
                  <p className="text-2xl font-black text-white leading-tight">{metrics?.totalSales || 0}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{metrics?.paidOrders} pedidos pagos</p>
                </div>
                <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                  <ShoppingCart className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[160px] bg-white/[0.01] border-white/5">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">Ticket Médio</p>
                  <p className="text-2xl font-black text-white leading-tight">{formatCurrency(metrics?.avgTicket || 0)}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">por venda</p>
                </div>
                <div className="p-3 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <CreditCard className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden relative group h-[160px] bg-white/[0.01] border-white/5">
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground/60 font-bold uppercase tracking-widest mb-1">Conversão</p>
                  <p className="text-2xl font-black text-white leading-tight">{metrics?.conversionRate || 0}%</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">{metrics?.pendingOrders} pendentes</p>
                </div>
                <div className="p-3 rounded-full bg-orange-500/10 border border-orange-500/20">
                  <TrendingUp className="w-6 h-6 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Gráfico de Vendas */}
      <motion.div variants={itemAnim} className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-white text-lg">Desempenho de Vendas</h2>
            </div>
          </div>
          <div className="h-[320px] w-full">
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
        </div>
      </motion.div>

      {/* Segunda Linha */}
      <motion.div variants={itemAnim}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Produtos */}
          <div className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-white text-lg">Top Produtos</h2>
              </div>
            </div>
            <div className="p-4">
              {topProducts && topProducts.length > 0 ? (
                <div className="space-y-4">
                  {topProducts.map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary border-primary/20">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-bold text-white text-sm leading-tight">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.qty} vendas</p>
                        </div>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(product.total)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda no período</p>
              )}
            </div>
          </div>

          {/* Vendas por Método */}
          <div className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-white text-lg">Vendas por Método</h2>
              </div>
            </div>
            <div className="p-4">
              {metrics?.byMethod && Object.keys(metrics.byMethod).length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(metrics.byMethod).map(([method, amount]) => (
                    <div key={method} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase font-bold px-2 py-1">
                          {method.toUpperCase()}
                        </Badge>
                      </div>
                      <span className="font-bold text-white">{formatCurrency(amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">Nenhuma venda no período</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Últimas Vendas */}
      <motion.div variants={itemAnim} className="glass-card rounded-[20px] border-white/10 overflow-hidden shadow-2xl bg-white/[0.01]">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-emerald-500" />
              <h2 className="font-bold text-white text-lg">Últimas Vendas</h2>
            </div>
          </div>
          <div className="space-y-3">
            {recentSales && recentSales.length > 0 ? (
              recentSales.map((sale: any) => (
                <div key={sale.id} className="flex items-center justify-between p-4 rounded-xl bg-white/[0.01] border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-full bg-emerald-500/10">
                      <DollarSign className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm leading-tight group-hover:text-primary transition-colors">
                        {sale.order?.profile?.name || sale.order?.profile?.email || "Cliente"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sale.order?.order_items?.map((i: any) => i.product?.name).join(", ") || "Produto"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-white text-emerald-500">{formatCurrency(sale.amount)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(sale.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center rounded-2xl border border-dashed border-white/10 bg-white/[0.01]">
                <ShoppingCart className="w-8 h-8 text-white/10 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Nenhuma venda registrada</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Resumo de Clientes */}
      <motion.div variants={itemAnim} className="glass-card p-6 rounded-[20px] border-white/10 overflow-hidden bg-white/[0.01]">
        <div className="flex items-center justify-between gap-4">
          <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-[12px] font-bold text-muted-foreground/60 uppercase tracking-widest">Clientes Cadastrados</p>
            <p className="text-2xl font-black text-white">{metrics?.totalCustomers || 0}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="w-4 h-4 opacity-50" />
            <span>{metrics?.totalCustomers || 0} alunos ativos na plataforma</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}