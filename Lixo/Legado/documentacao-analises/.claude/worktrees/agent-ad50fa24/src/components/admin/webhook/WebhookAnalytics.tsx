import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type PeriodType = "7d" | "30d" | "90d" | "12m";
type GranularityType = "day" | "week" | "month";

interface WebhookAnalyticsProps {
  platforms: any[];
  selectedPlatform: string | null;
  onSelectPlatform: (id: string | null) => void;
}

export function WebhookAnalytics({ platforms, selectedPlatform, onSelectPlatform }: WebhookAnalyticsProps) {
  const [period, setPeriod] = useState<PeriodType>("30d");
  const [granularity, setGranularity] = useState<GranularityType>("day");

  // Calculate date range based on period
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    
    switch (period) {
      case "7d":
        start = subDays(now, 7);
        break;
      case "30d":
        start = subDays(now, 30);
        break;
      case "90d":
        start = subDays(now, 90);
        break;
      case "12m":
        start = subMonths(now, 12);
        break;
      default:
        start = subDays(now, 30);
    }
    
    return { start, end: now };
  }, [period]);

  // Fetch transactions for the period
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['webhook-analytics', selectedPlatform, period],
    queryFn: async () => {
      let query = supabase
        .from('webhook_transactions')
        .select('*')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .order('created_at', { ascending: true });
      
      if (selectedPlatform) {
        query = query.eq('platform_id', selectedPlatform);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Process data for charts
  const chartData = useMemo(() => {
    if (!transactions?.length) return [];

    // Generate all intervals
    let intervals: Date[];
    switch (granularity) {
      case "day":
        intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
        break;
      case "week":
        intervals = eachWeekOfInterval({ start: dateRange.start, end: dateRange.end });
        break;
      case "month":
        intervals = eachMonthOfInterval({ start: dateRange.start, end: dateRange.end });
        break;
      default:
        intervals = eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
    }

    // Create data map
    const dataMap = new Map<string, { granted: number; revoked: number; errors: number; total: number }>();
    
    intervals.forEach(interval => {
      const key = formatIntervalKey(interval, granularity);
      dataMap.set(key, { granted: 0, revoked: 0, errors: 0, total: 0 });
    });

    // Process transactions
    transactions.forEach(tx => {
      const date = new Date(tx.created_at);
      let intervalDate: Date;
      
      switch (granularity) {
        case "day":
          intervalDate = startOfDay(date);
          break;
        case "week":
          intervalDate = startOfWeek(date, { locale: ptBR });
          break;
        case "month":
          intervalDate = startOfMonth(date);
          break;
        default:
          intervalDate = startOfDay(date);
      }
      
      const key = formatIntervalKey(intervalDate, granularity);
      const entry = dataMap.get(key);
      
      if (entry) {
        entry.total++;
        
        // Check processing result for action type
        const result = tx.processing_result as any;
        const actions = result?.autoProcess?.actions || [];
        
        const hasGrant = actions.some((a: string) => 
          a.toLowerCase().includes('concedido') || a.toLowerCase().includes('criado')
        );
        const hasRevoke = actions.some((a: string) => 
          a.toLowerCase().includes('removido') || a.toLowerCase().includes('revogado')
        );
        
        if (tx.status === 'error') {
          entry.errors++;
        } else if (hasRevoke) {
          entry.revoked++;
        } else if (hasGrant) {
          entry.granted++;
        }
      }
    });

    // Convert to array
    return Array.from(dataMap.entries()).map(([key, value]) => ({
      date: key,
      ...value
    }));
  }, [transactions, granularity, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!transactions?.length) {
      return { total: 0, granted: 0, revoked: 0, errors: 0, grantTrend: 0, revokeTrend: 0 };
    }

    let granted = 0;
    let revoked = 0;
    let errors = 0;

    transactions.forEach(tx => {
      const result = tx.processing_result as any;
      const actions = result?.autoProcess?.actions || [];
      
      const hasGrant = actions.some((a: string) => 
        a.toLowerCase().includes('concedido') || a.toLowerCase().includes('criado')
      );
      const hasRevoke = actions.some((a: string) => 
        a.toLowerCase().includes('removido') || a.toLowerCase().includes('revogado')
      );
      
      if (tx.status === 'error') {
        errors++;
      } else if (hasRevoke) {
        revoked++;
      } else if (hasGrant) {
        granted++;
      }
    });

    // Calculate trend (compare first half vs second half of period)
    const midpoint = Math.floor(transactions.length / 2);
    const firstHalf = transactions.slice(0, midpoint);
    const secondHalf = transactions.slice(midpoint);
    
    const firstHalfGrants = firstHalf.filter(tx => {
      const result = tx.processing_result as any;
      const actions = result?.autoProcess?.actions || [];
      return actions.some((a: string) => a.toLowerCase().includes('concedido'));
    }).length;
    
    const secondHalfGrants = secondHalf.filter(tx => {
      const result = tx.processing_result as any;
      const actions = result?.autoProcess?.actions || [];
      return actions.some((a: string) => a.toLowerCase().includes('concedido'));
    }).length;

    const grantTrend = firstHalfGrants > 0 
      ? Math.round(((secondHalfGrants - firstHalfGrants) / firstHalfGrants) * 100)
      : 0;

    return { total: transactions.length, granted, revoked, errors, grantTrend, revokeTrend: 0 };
  }, [transactions]);

  // Pie chart data
  const pieData = useMemo(() => {
    if (!stats.total) return [];
    return [
      { name: 'Acessos Concedidos', value: stats.granted, color: 'hsl(var(--chart-2))' },
      { name: 'Acessos Removidos', value: stats.revoked, color: 'hsl(var(--chart-1))' },
      { name: 'Erros', value: stats.errors, color: 'hsl(var(--chart-4))' },
      { name: 'Sem Ação', value: stats.total - stats.granted - stats.revoked - stats.errors, color: 'hsl(var(--muted))' },
    ].filter(d => d.value > 0);
  }, [stats]);

  const chartConfig = {
    granted: {
      label: "Acessos Concedidos",
      color: "hsl(var(--chart-2))",
    },
    revoked: {
      label: "Acessos Removidos",
      color: "hsl(var(--chart-1))",
    },
    errors: {
      label: "Erros",
      color: "hsl(var(--chart-4))",
    },
    total: {
      label: "Total",
      color: "hsl(var(--chart-3))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedPlatform || "all"} onValueChange={(v) => onSelectPlatform(v === "all" ? null : v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plataformas</SelectItem>
            {platforms.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="12m">Últimos 12 meses</SelectItem>
          </SelectContent>
        </Select>

        <Select value={granularity} onValueChange={(v) => setGranularity(v as GranularityType)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Granularidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por dia</SelectItem>
            <SelectItem value="week">Por semana</SelectItem>
            <SelectItem value="month">Por mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              no período selecionado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acessos Concedidos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.granted}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {stats.grantTrend > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">+{stats.grantTrend}%</span>
                </>
              ) : stats.grantTrend < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">{stats.grantTrend}%</span>
                </>
              ) : (
                <span>vs período anterior</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acessos Removidos</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.revoked}</div>
            <p className="text-xs text-muted-foreground">
              reembolsos/cancelamentos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.errors}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.errors / stats.total) * 100).toFixed(1)}% do total` : 'nenhum erro'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Area Chart - Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tendência de Transações</CardTitle>
            <CardDescription>
              Acessos concedidos vs removidos ao longo do tempo
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum dado disponível para o período selecionado
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGranted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorRevoked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="granted" 
                    stroke="hsl(var(--chart-2))" 
                    fillOpacity={1} 
                    fill="url(#colorGranted)" 
                    name="granted"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revoked" 
                    stroke="hsl(var(--chart-1))" 
                    fillOpacity={1} 
                    fill="url(#colorRevoked)" 
                    name="revoked"
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart - Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição</CardTitle>
            <CardDescription>
              Proporção de tipos de ação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Carregando...
              </div>
            ) : pieData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-sm">
                              <div className="text-sm font-medium">{payload[0].name}</div>
                              <div className="text-sm text-muted-foreground">
                                {payload[0].value} ({((Number(payload[0].value) / stats.total) * 100).toFixed(1)}%)
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {pieData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span>{entry.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart - Daily Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Volume por Período</CardTitle>
          <CardDescription>
            Comparação de volume de transações
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Carregando...
            </div>
          ) : chartData.length === 0 ? (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="granted" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} name="granted" />
                <Bar dataKey="revoked" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="revoked" />
                <Bar dataKey="errors" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="errors" />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper function to format interval key
function formatIntervalKey(date: Date, granularity: GranularityType): string {
  switch (granularity) {
    case "day":
      return format(date, "dd/MM", { locale: ptBR });
    case "week":
      return format(date, "'Sem' w", { locale: ptBR });
    case "month":
      return format(date, "MMM/yy", { locale: ptBR });
    default:
      return format(date, "dd/MM", { locale: ptBR });
  }
}
