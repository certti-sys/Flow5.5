import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { PieChartIcon, Users } from "lucide-react";

interface CourseData {
  name: string;
  value: number;
  color: string;
}

interface CourseDistributionChartProps {
  data: CourseData[];
}

const COLORS = [
  'hsl(var(--primary))',
  '#3b82f6', // blue-500
  '#a855f7', // purple-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#f43f5e', // rose-500
];

export function CourseDistributionChart({ data }: CourseDistributionChartProps) {
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: COLORS[index % COLORS.length]
  }));

  const totalStudents = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden h-full bg-white/[0.01]">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <PieChartIcon className="w-5 h-5 text-primary" />
            </div>
            Base de Alunos
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Por curso principal</p>
        </div>
        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-2">
          <Users className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-[10px] font-black text-white uppercase tracking-wider">
            {totalStudents} total
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-8">
        {/* Chart */}
        <div className="h-[200px] w-full relative">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataWithColors}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                  animationBegin={200}
                  animationDuration={1500}
                >
                  {dataWithColors.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      className="hover:opacity-80 transition-opacity cursor-pointer"
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    padding: '12px 16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
                  }}
                  itemStyle={{ color: '#fff', fontWeight: 900, fontSize: '13px' }}
                  labelStyle={{ display: 'none' }}
                  formatter={(value: number, name: string) => [`${value} alunos`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/20 text-xs font-black uppercase tracking-widest gap-2">
              <PieChartIcon className="w-8 h-8 opacity-10" />
              Sem Dados
            </div>
          )}
        </div>

        {/* Legend Custom */}
        <div className="w-full space-y-2">
          {dataWithColors.slice(0, 4).map((item, index) => (
            <div key={index} className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-lg group-hover:scale-125 transition-transform"
                style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}40` }}
              />
              <span className="text-[12px] text-muted-foreground font-bold flex-1 truncate" title={item.name}>
                {item.name}
              </span>
              <span className="text-[12px] font-black text-white">
                {Math.round((item.value / (totalStudents || 1)) * 100)}%
              </span>
            </div>
          ))}
          {data.length === 0 && (
            <p className="text-[10px] text-muted-foreground/40 text-center uppercase font-black tracking-[2px] py-4">
              Nenhuma métrica disponível
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
