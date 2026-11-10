import { Card } from "@/components/ui/card";
import { MessageSquare, ExternalLink, Clock, User, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

interface RecentComment {
  id: string;
  content: string;
  authorName: string;
  lessonTitle: string;
  courseTitle: string;
  createdAt: string;
}

interface RecentCommentsProps {
  comments: RecentComment[];
}

export function RecentComments({ comments }: RecentCommentsProps) {
  return (
    <Card className="glass-card p-8 border-white/5 rounded-[32px] overflow-hidden group bg-white/[0.01]">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-xl font-black tracking-tight text-white flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-glow-sm">
              <MessageSquare className="w-5 h-5 text-primary" />
            </div>
            Social & Feedback
          </h3>
          <p className="text-[11px] text-muted-foreground/40 uppercase font-black tracking-widest pl-11">Últimas interações dos alunos</p>
        </div>
        <Link
          to="/admin/comentarios"
          className="h-8 w-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center hover:bg-white/10 hover:text-primary transition-all group/btn"
        >
          <ArrowRight className="w-4 h-4 text-muted-foreground/60 group-hover/btn:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      {comments.length > 0 ? (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="p-5 rounded-[24px] bg-white/[0.02] border border-white/5 hover:border-primary/10 hover:bg-white/[0.04] transition-all duration-300 group/item cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center shrink-0 group-hover/item:border-primary/20 transition-all">
                  <User className="w-4 h-4 text-muted-foreground/40 group-hover/item:text-primary transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white group-hover/item:text-primary transition-colors">{comment.authorName}</span>
                    <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground/40 font-black uppercase tracking-tighter">
                      <Clock className="w-2.5 h-2.5 opacity-50" />
                      <span>
                        {formatDistanceToNow(new Date(comment.createdAt), {
                          addSuffix: true,
                          locale: ptBR
                        })}
                      </span>
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground leading-relaxed italic line-clamp-2 mb-4 group-hover/item:text-white transition-colors">
                    "{comment.content}"
                  </p>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 w-fit group-hover/item:border-primary/10 transition-all">
                    <span className="text-primary/60">{comment.courseTitle}</span>
                    <span className="opacity-20">/</span>
                    <span className="truncate max-w-[120px]">{comment.lessonTitle}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center text-center gap-4 bg-white/[0.01] rounded-3xl border border-dashed border-white/10">
          <MessageSquare className="w-8 h-8 text-muted-foreground/20" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Área de silêncio</p>
        </div>
      )}
    </Card>
  );
}
