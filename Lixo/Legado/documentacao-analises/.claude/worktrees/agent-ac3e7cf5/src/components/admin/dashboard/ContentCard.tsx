import { Card } from "@/components/ui/card";
import { BookOpen, Layers, Clock, Library } from "lucide-react";

interface ContentCardProps {
  avgLessonsPerCourse: number;
  avgModulesPerCourse: number;
  totalModules: number;
  totalLessons: number;
}

export function ContentCard({ avgLessonsPerCourse, avgModulesPerCourse, totalModules, totalLessons }: ContentCardProps) {
  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden bg-white/[0.01] h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <Library className="w-5 h-5 text-primary" />
            </div>
            Inventory
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Acervo de conteúdo digital</p>
        </div>
      </div>

      <div className="space-y-6 flex-1">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group cursor-pointer">
          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-white transition-colors">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-primary/20 group-hover:text-primary transition-all">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Média Aulas/Curso</span>
          </div>
          <span className="text-sm font-black text-white px-3 py-1 rounded-lg bg-black/40 border border-white/5">
            {avgLessonsPerCourse}
          </span>
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group cursor-pointer">
          <div className="flex items-center gap-3 text-muted-foreground group-hover:text-white transition-colors">
            <div className="p-2 rounded-xl bg-white/5 border border-white/5 group-hover:border-primary/20 group-hover:text-primary transition-all">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-widest opacity-60">Média Módulos/Curso</span>
          </div>
          <span className="text-sm font-black text-white px-3 py-1 rounded-lg bg-black/40 border border-white/5">
            {avgModulesPerCourse}
          </span>
        </div>

        <div className="pt-6 mt-2 border-t border-white/5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-black tracking-[2px] text-muted-foreground/40">Total Módulos</span>
              <p className="text-xl font-black text-primary tracking-tighter">{totalModules}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-[10px] uppercase font-black tracking-[2px] text-muted-foreground/40">Total Aulas</span>
              <p className="text-xl font-black text-primary tracking-tighter">{totalLessons}</p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
