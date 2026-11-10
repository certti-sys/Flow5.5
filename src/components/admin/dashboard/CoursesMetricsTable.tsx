import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { LayoutList, Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

interface CourseMetric {
  id: string;
  title: string;
  modules: number;
  lessons: number;
  students: number;
  progress: number;
}

interface CoursesMetricsTableProps {
  courses: CourseMetric[];
}

export function CoursesMetricsTable({ courses }: CoursesMetricsTableProps) {
  return (
    <Card className="glass-card border-white/5 rounded-[32px] overflow-hidden bg-white/[0.01]">
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="space-y-1">
            <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
                <LayoutList className="w-5 h-5 text-primary" />
              </div>
              Performance por Conteúdo
            </h3>
            <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Ranking de engajamento e entrega</p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
              <Search className="w-3.5 h-3.5 text-muted-foreground/60" />
            </div>
          </div>
        </div>
      </div>

      <div className="px-8 pb-8">
        {courses.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Curso</TableHead>
                  <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center">Estrutura</TableHead>
                  <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-center">Audiência</TableHead>
                  <TableHead className="h-12 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-right">Aproveitamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course, idx) => (
                  <TableRow 
                    key={course.id} 
                    className="border-white/5 hover:bg-white/[0.03] transition-all group cursor-pointer"
                  >
                    <TableCell className="py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center text-[10px] font-black text-white/40 group-hover:text-primary group-hover:border-primary/20 transition-all">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-1">{course.title}</p>
                          <p className="text-[10px] text-muted-foreground/60 font-medium">ID: {course.id.substring(0, 8)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white">{course.lessons}</span>
                        <span className="text-[10px] text-muted-foreground/40 font-black uppercase">Aulas</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 text-center">
                       <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                          <span className="text-xs font-black text-blue-500">{course.students}</span>
                       </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="flex items-center justify-end gap-4 min-w-[140px]">
                        <div className="flex flex-col items-end gap-1.5 flex-1">
                          <Progress value={course.progress} className="h-1 w-full bg-white/5 border-none" />
                          <span className="text-[11px] font-black text-white">{course.progress}%</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
            <LayoutList className="w-8 h-8 text-muted-foreground/20" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Nenhum dado consolidado</p>
          </div>
        )}
      </div>
    </Card>
  );
}
