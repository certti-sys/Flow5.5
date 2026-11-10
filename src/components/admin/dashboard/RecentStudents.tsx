import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, BookOpen, Clock, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RecentStudent {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  lastActivity: string | null;
  completedLessons: number;
}

interface RecentStudentsProps {
  students: RecentStudent[];
}

export function RecentStudents({ students }: RecentStudentsProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden group bg-white/[0.01]">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <Users className="w-5 h-5 text-primary" />
            </div>
            Novos Integrantes
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Alunos recém-chegados à plataforma</p>
        </div>
        <button className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 hover:text-primary transition-all group/btn">
          <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>

      {students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center gap-4 p-4 rounded-[24px] bg-white/[0.02] border border-transparent hover:border-white/5 hover:bg-white/[0.04] transition-all duration-300 group/item cursor-pointer"
            >
              <Avatar className="h-12 w-12 rounded-2xl border border-white/5 ring-4 ring-transparent group-hover/item:ring-primary/10 transition-all">
                <AvatarImage src={student.avatar_url || undefined} className="object-cover" />
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-black rounded-2xl">
                  {getInitials(student.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate group-hover/item:text-primary transition-colors mb-0.5">
                  {student.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60 font-medium">
                  <span className="truncate">{student.email}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-black text-emerald-500 uppercase tracking-wider mb-1">
                  <BookOpen className="w-3 h-3" />
                  <span>{student.completedLessons}</span>
                </div>
                {student.lastActivity && (
                  <div className="flex items-center justify-end gap-1 text-[9px] text-muted-foreground/40 uppercase font-black tracking-tighter">
                    <Clock className="w-2.5 h-2.5 opacity-50" />
                    <span>
                      {formatDistanceToNow(new Date(student.lastActivity), {
                        addSuffix: true,
                        locale: ptBR
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
          <Users className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Silêncio no campus</p>
        </div>
      )}
    </Card>
  );
}
