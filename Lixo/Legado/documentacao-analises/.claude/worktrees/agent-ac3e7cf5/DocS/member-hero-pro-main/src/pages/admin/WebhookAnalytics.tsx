import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWebhookAnalytics } from '@/hooks/useWebhookAnalytics';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Activity, TrendingUp, DollarSign, Zap, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
export default function WebhookAnalytics() {
  const [periodDays, setPeriodDays] = useState(30);
  const {
    isLoading,
    totalWebhooks,
    successRate,
    totalSales,
    avgResponseTime,
    getWebhooksByPeriod,
    salesByPlatform,
    salesByCourse,
    conversionTrend,
    recentErrors
  } = useWebhookAnalytics();
  const periodData = getWebhooksByPeriod(periodDays);
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">Carregando analytics...</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Analytics de Webhooks</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance, vendas e integrações
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Recebidos
              </CardTitle>
              <Activity className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalWebhooks}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Webhooks processados
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Sucesso
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{successRate}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                Webhooks bem-sucedidos
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Vendas Processadas
              </CardTitle>
              <DollarSign className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{totalSales}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Acessos liberados
              </p>
            </CardContent>
          </Card>

          <Card className="glass-panel">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Médio
              </CardTitle>
              <Zap className="h-4 w-4 text-gold" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{avgResponseTime}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Tempo de resposta
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Period Chart */}
        <Card className="glass-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Webhooks por Período</CardTitle>
                <CardDescription>Histórico de webhooks recebidos</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant={periodDays === 7 ? 'default' : 'outline'} size="sm" onClick={() => setPeriodDays(7)}>
                  7 dias
                </Button>
                <Button variant={periodDays === 30 ? 'default' : 'outline'} size="sm" onClick={() => setPeriodDays(30)}>
                  30 dias
                </Button>
                <Button variant={periodDays === 90 ? 'default' : 'outline'} size="sm" onClick={() => setPeriodDays(90)}>
                  90 dias
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                <YAxis stroke="rgba(255,255,255,0.5)" />
                <Tooltip contentStyle={{
                backgroundColor: 'rgba(10,10,10,0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }} />
                <Legend />
                <Line type="monotone" dataKey="success" name="Sucesso" stroke="#D4AF37" strokeWidth={2} dot={{
                fill: '#D4AF37'
              }} />
                <Line type="monotone" dataKey="error" name="Erro" stroke="#ef4444" strokeWidth={2} dot={{
                fill: '#ef4444'
              }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Platform and Course Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales by Platform */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Vendas por Plataforma</CardTitle>
              <CardDescription>Distribuição por origem</CardDescription>
            </CardHeader>
            <CardContent>
              {salesByPlatform.length > 0 ? <>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie data={salesByPlatform} dataKey="sales" nameKey="platform" cx="50%" cy="50%" outerRadius={80} label={({
                    platform,
                    percentage
                  }) => `${platform}: ${percentage}%`}>
                        {salesByPlatform.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{
                    backgroundColor: 'rgba(10,10,10,0.95)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px'
                  }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 space-y-2">
                    {salesByPlatform.map(platform => <div key={platform.platform} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{
                      backgroundColor: platform.color
                    }} />
                          <span className="text-foreground">{platform.platform}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {platform.sales} vendas ({platform.percentage}%)
                        </span>
                      </div>)}
                  </div>
                </> : <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma venda registrada
                </div>}
            </CardContent>
          </Card>

          {/* Sales by Course */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Performance por Curso</CardTitle>
              <CardDescription>Top 5 cursos com mais vendas</CardDescription>
            </CardHeader>
            <CardContent>
              {salesByCourse.length > 0 ? <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesByCourse} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis type="number" stroke="rgba(255,255,255,0.5)" />
                    <YAxis dataKey="courseName" type="category" stroke="rgba(255,255,255,0.5)" width={100} />
                    <Tooltip contentStyle={{
                  backgroundColor: 'rgba(10,10,10,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }} />
                    <Bar dataKey="sales" name="Vendas" fill="#D4AF37" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer> : <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhuma venda registrada
                </div>}
            </CardContent>
          </Card>
        </div>

        {/* Conversion and Errors */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Trend */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Taxa de Conversão</CardTitle>
              <CardDescription>Últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={conversionTrend}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="rgba(255,255,255,0.5)" />
                  <YAxis stroke="rgba(255,255,255,0.5)" domain={[0, 100]} />
                  <Tooltip contentStyle={{
                  backgroundColor: 'rgba(10,10,10,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px'
                }} formatter={value => `${value}%`} />
                  <Area type="monotone" dataKey="rate" name="Taxa" stroke="#D4AF37" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Recent Errors */}
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Erros Recentes
              </CardTitle>
              <CardDescription>Últimas 5 falhas registradas</CardDescription>
            </CardHeader>
            <CardContent>
              {recentErrors.length > 0 ? <div className="space-y-3">
                  {recentErrors.map(error => <div key={error.id} className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-sm font-medium text-foreground">
                          {error.platform}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(error.createdAt), 'dd/MM HH:mm', {
                      locale: ptBR
                    })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{error.message}</p>
                      {error.buyerEmail && <p className="text-xs text-muted-foreground">{error.buyerEmail}</p>}
                    </div>)}
                </div> : <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Nenhum erro registrado
                </div>}
            </CardContent>
          </Card>
        </div>
    </div>
  );
}