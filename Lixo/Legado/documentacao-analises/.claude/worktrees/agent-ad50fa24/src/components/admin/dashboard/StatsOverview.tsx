import { BookOpen, Users, CheckCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: "up" | "down" | "neutral";
  change?: string;
  suffix?: string;
  color: "primary" | "emerald" | "amber" | "blue";
}

function StatItem({ icon, label, value, trend, change, suffix, color }: StatItemProps) {
  return (
    <div className="glass-card p-6 rounded-[24px] border-white/5 bg-white/[0.01] relative overflow-hidden group">
      {/* Dynamic Background Glow */}
      <div className={cn(
        "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-3xl opacity-10 group-hover:opacity-20 transition-all duration-500",
        color === "primary" ? "bg-primary" : 
        color === "emerald" ? "bg-emerald-500" : 
        color === "amber" ? "bg-amber-500" : "bg-blue-500"
      )} />
      
      <div className="relative z-10 space-y-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center border border-white/5 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:shadow-glow-sm",
            color === "primary" ? "bg-primary/10 text-primary border-primary/20" : 
            color === "emerald" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
            color === "amber" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : 
            "bg-blue-500/10 text-blue-500 border-blue-500/20"
          )}>
            {icon}
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">{label}</span>
        </div>
        
        <div className="flex items-end justify-between">
          <h3 className="text-3xl font-black text-white tracking-tighter leading-none">
            {value}{suffix}
          </h3>
          {change && (
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider",
              trend === "up" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : 
              trend === "down" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
              "bg-white/5 text-muted-foreground/60 border-white/10"
            )}>
              {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} {change}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatsOverviewProps {
  totalCourses: number;
  totalStudents: number;
  completedToday: number;
  completionRate: number;
}

export function StatsOverview({ totalCourses, totalStudents, completedToday, completionRate }: StatsOverviewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatItem
        icon={<BookOpen className="w-5 h-5" />}
        label="Acervo de Cursos"
        value={totalCourses}
        change="Ativos"
        trend="neutral"
        color="primary"
      />
      <StatItem
        icon={<Users className="w-5 h-5" />}
        label="Comunidade"
        value={totalStudents}
        change="Alunos"
        trend="neutral"
        color="blue"
      />
      <StatItem
        icon={<CheckCircle className="w-5 h-5" />}
        label="Aulas Hoje"
        value={completedToday}
        change="Concluídas"
        trend="up"
        color="emerald"
      />
      <StatItem
        icon={<TrendingUp className="w-5 h-5" />}
        label="Engajamento"
        value={completionRate}
        suffix="%"
        change="Geral"
        trend="up"
        color="amber"
      />
    </div>
  );
}
