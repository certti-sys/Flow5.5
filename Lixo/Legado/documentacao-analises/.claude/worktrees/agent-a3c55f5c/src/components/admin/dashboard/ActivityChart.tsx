import { Card } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity } from "lucide-react";

interface ActivityChartProps {
  data: Array<{ date: string; completed: number }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden h-full bg-white/[0.01]">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            Atividade Semanal
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Aulas concluídas nos últimos 7 dias</p>
        </div>
      </div>
      
      <div className="h-[280px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="6 6" stroke="#ffffff05" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 800 }}
              axisLine={false}
              tickLine={false}
              dy={15}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 800 }}
              axisLine={false}
              tickLine={false}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '20px',
                padding: '12px 16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
              }}
              itemStyle={{ color: 'hsl(var(--primary))', fontWeight: 900, fontSize: '14px' }}
              labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, marginBottom: '4px', letterSpacing: '1px' }}
              cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="completed"
              stroke="hsl(var(--primary))"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorCompleted)"
              name="Concluídas"
              animationDuration={2500}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
