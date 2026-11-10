import { useState } from "react";
import { MetricCard } from "@/components/admin/MetricCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Target,
  Download,
  Search,
  Eye,
} from "lucide-react";
import { salesMetrics, revenueOverTime, salesBySource, transactions } from "@/data/mockData";
import { useIsMobile } from "@/hooks/use-mobile";

const ITEMS_PER_PAGE = 10;

const STATUS_COLORS = {
  Pago: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
  Pendente: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  Cancelado: "bg-red-500/20 text-red-500 border-red-500/30",
  Reembolsado: "bg-orange-500/20 text-orange-500 border-orange-500/30",
};

const PIE_COLORS = ["#D4AF37", "#F5D46E", "#B8941E", "#8B7315", "#C9A62E"];

export default function Sales() {
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.student.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.course.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Vendas</h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe suas vendas e receitas
            </p>
          </div>
          <Button className="gap-2 min-h-[44px] w-full sm:w-auto">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Receita Total"
            value={salesMetrics.totalRevenue}
            change={salesMetrics.revenueChange}
            changeLabel="vs mês anterior"
            icon={DollarSign}
          />
          <MetricCard
            title="Vendas do Mês"
            value={salesMetrics.monthlySales}
            change={salesMetrics.salesChange}
            changeLabel="vs mês anterior"
            icon={ShoppingCart}
          />
          <MetricCard
            title="Ticket Médio"
            value={salesMetrics.averageTicket}
            change={salesMetrics.ticketChange}
            changeLabel="vs mês anterior"
            icon={TrendingUp}
          />
          <MetricCard
            title="Taxa de Conversão"
            value={salesMetrics.conversionRate}
            change={salesMetrics.conversionChange}
            changeLabel="vs mês anterior"
            icon={Target}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Area Chart */}
          <div className="lg:col-span-2 glass-card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Receita ao Longo do Tempo
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueOverTime}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="month"
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0A0A0A",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#FFFFFF",
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, "Receita"]}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#D4AF37"
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sales by Source Pie Chart */}
          <div className="glass-card p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Vendas por Plataforma
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesBySource}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {salesBySource.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0A0A0A",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    color: "#FFFFFF",
                  }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, "Vendas"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Transações Recentes
            </h3>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por aluno, curso ou ID..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 min-h-[44px]"
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-[180px] min-h-[44px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border/50">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
                <SelectItem value="Cancelado">Cancelado</SelectItem>
                <SelectItem value="Reembolsado">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mobile Cards / Desktop Table */}
          {isMobile ? (
            <div className="space-y-3">
              {paginatedTransactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma transação encontrada
                </div>
              ) : (
                paginatedTransactions.map((transaction) => (
                  <div 
                    key={transaction.id} 
                    className="glass-card p-4 rounded-xl border border-border/50 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{transaction.student}</p>
                        <p className="text-sm text-muted-foreground truncate">{transaction.course}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[transaction.status as keyof typeof STATUS_COLORS]}
                      >
                        {transaction.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{transaction.amount}</span>
                      <span className="text-sm text-muted-foreground">{transaction.date}</span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{transaction.id}</span>
                        <span className="mx-2">•</span>
                        <span>{transaction.method}</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-11 w-11">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Aluno</TableHead>
                    <TableHead>Curso</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhuma transação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.id}
                        </TableCell>
                        <TableCell>{transaction.student}</TableCell>
                        <TableCell>{transaction.course}</TableCell>
                        <TableCell className="font-semibold text-primary">
                          {transaction.amount}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[transaction.status as keyof typeof STATUS_COLORS]}
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{transaction.method}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {transaction.date}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <p className="text-sm text-muted-foreground text-center sm:text-left">
                Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{" "}
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredTransactions.length)} de{" "}
                {filteredTransactions.length} transações
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="min-h-[44px] min-w-[44px]"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="min-h-[44px] min-w-[44px]"
                >
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
  );
}