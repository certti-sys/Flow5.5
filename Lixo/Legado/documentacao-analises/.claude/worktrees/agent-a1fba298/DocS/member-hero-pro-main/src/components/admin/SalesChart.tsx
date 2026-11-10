import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { salesData } from "@/data/mockData";

export function SalesChart() {
  const [period, setPeriod] = useState("30");

  return (
    <div className="glass-card p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Visão Geral de Vendas</h3>
          <p className="text-sm text-muted-foreground">Desempenho de receita mensal</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[140px] bg-background/50 border-border/50">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 dias</SelectItem>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={salesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="day"
              stroke="rgba(255,255,255,0.4)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(17, 17, 17, 0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              }}
              labelStyle={{ color: "rgba(255,255,255,0.7)" }}
              itemStyle={{ color: "#D4AF37" }}
              formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, "Vendas"]}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="#D4AF37"
              strokeWidth={3}
              dot={false}
              activeDot={{
                r: 6,
                fill: "#D4AF37",
                stroke: "#000",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
