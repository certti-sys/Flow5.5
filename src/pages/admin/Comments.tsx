import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  MessageSquare,
  Search,
  Filter,
  Clock,
  BookOpen,
  Reply,
  Eye,
  Trash2,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  lesson_id: string;
  parent_id: string | null;
  profiles: {
    name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  lessons: {
    title: string | null;
    modules: {
      title: string | null;
      courses: {
        id: string;
        title: string | null;
      } | null;
    } | null;
  } | null;
}

const Comments = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [orderBy, setOrderBy] = useState("recent");
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["adminComments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (name, email, avatar_url),
          lessons (
            title,
            modules (
              title,
              courses (id, title)
            )
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Comment[];
    },
  });

  const { data: courses = [] } = useQuery({
    queryKey: ["adminCoursesList"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  const filteredComments = comments.filter((comment) => {
    const matchesSearch =
      searchTerm === "" ||
      (comment?.content?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (comment?.profiles?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (comment?.profiles?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());
    const matchesCourse =
      courseFilter === "all" ||
      comment?.lessons?.modules?.courses?.id === courseFilter;
    let matchesPeriod = true;
    if (periodFilter !== "all") {
      const commentDate = new Date(comment.created_at);
      const daysAgo = parseInt(periodFilter);
      matchesPeriod = commentDate > new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    }
    let matchesType = true;
    if (typeFilter === "root") {
      matchesType = !comment.parent_id;
    } else if (typeFilter === "replies") {
      matchesType = !!comment.parent_id;
    } else if (typeFilter === "unanswered") {
      const hasReplies = comments.some((c) => c.parent_id === comment.id);
      matchesType = !comment.parent_id && !hasReplies;
    }
    return matchesSearch && matchesCourse && matchesPeriod && matchesType;
  });

  const sortedComments = [...filteredComments].sort((a, b) => {
    if (orderBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return new Date(a.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const commentsToday = (comments || []).filter(
    (c) => c?.created_at && new Date(c.created_at) >= today
  ).length;

  const uniqueLessons = new Set((comments || []).map((c) => c?.lesson_id).filter(Boolean)).size;
  const avgPerLesson = uniqueLessons > 0 ? (comments.length / uniqueLessons).toFixed(1) : "0";
  const unansweredCount = (comments || []).filter(c => c && !c.parent_id && !comments.some((cc) => cc.parent_id === c.id)).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="glass-card border-white/10 rounded-[24px] p-8 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-white/60 mt-3">Carregando comentários...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-[32px] pb-20"
    >
      <motion.div variants={item} className="flex flex-col md:flex-row justify-between gap-4">
        <div className="flex flex-col space-y-1">
          <h1 className="text-[28px] font-bold text-white tracking-tight">Comentários</h1>
          <p className="text-[14px] text-muted-foreground mt-1">
            Gerencie e responda aos comentários dos alunos para manter sua comunidade engajada.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" className="px-6 py-3 text-sm font-bold text-white" onClick={() => setSearchTerm("")}>
            Limpar Filtros
          </Button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="glass-card p-6 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] hover:border-primary/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-white/60 uppercase tracking-wider">Total</span>
            <div className="p-2 bg-primary/10 rounded-lg"><MessageSquare className="h-4 w-4 text-primary" /></div>
          </div>
          <div className="text-[28px] font-bold text-white tracking-tight">{comments.length}</div>
        </motion.div>
        <motion.div variants={item} className="glass-card p-6 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] hover:border-green-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-white/60 uppercase tracking-wider">Hoje</span>
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors"><Clock className="h-4 w-4 text-green-500" /></div>
          </div>
          <div className="text-[28px] font-bold text-white tracking-tight">{commentsToday}</div>
        </motion.div>
        <motion.div variants={item} className="glass-card p-6 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] hover:border-blue-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-white/60 uppercase tracking-wider">Média / Aula</span>
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors"><BookOpen className="h-4 w-4 text-blue-500" /></div>
          </div>
          <div className="text-[28px] font-bold text-white tracking-tight">{avgPerLesson}</div>
        </motion.div>
        <motion.div variants={item} className={`glass-card p-6 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] transition-all duration-300 ${unansweredCount > 0 ? "border-red-500/50" : "border-white/20"}`}>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-white/60 uppercase tracking-wider">Sem Resposta</span>
            <div className={`p-2 rounded-lg transition-colors ${unansweredCount > 0 ? "bg-red-500/10" : "bg-white/5"}`}><Clock className={`h-4 w-4 ${unansweredCount > 0 ? "text-red-500" : "text-muted-foreground"}`} /></div>
          </div>
          <div className={`text-[28px] font-bold text-white tracking-tight ${unansweredCount > 0 ? "text-red-500" : "text-white"}`}>{unansweredCount}</div>
        </motion.div>
      </div>

      <motion.div variants={item} className="glass-card p-6 rounded-[16px] border-white/10">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Buscar por texto ou autor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-[44px] glass-card border-white/10 focus:border-primary/50 rounded-[12px] text-white placeholder:text-white/40"
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative w-full">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold text-white">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl rounded-[12px]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="root">Comentários</SelectItem>
                  <SelectItem value="replies">Respostas</SelectItem>
                  <SelectItem value="unanswered">Sem Resposta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full">
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold text-white">
                  <SelectValue placeholder="Todos os cursos" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl rounded-[12px]">
                  <SelectItem value="all">Todos os cursos</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full">
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold text-white">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl rounded-[12px]">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full">
              <Select value={orderBy} onValueChange={setOrderBy}>
                <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold text-white">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl rounded-[12px]">
                  <SelectItem value="recent">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={item} className="glass-card rounded-[16px] border-white/10 overflow-hidden shadow-2xl">
        <div className="p-6">
          {sortedComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-10" />
              <p className="text-[14px] text-white/40">Nenhum comentário encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedComments.map((comment) => (
                <div key={comment.id} className="glass-card border-white/5 rounded-[16px] p-5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative">
                      <Avatar className="h-10 w-10 rounded-full border border-white/10 shadow-lg">
                        <AvatarImage src={comment.profiles?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs uppercase">
                          {comment.profiles?.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[14px] text-white leading-tight group-hover:text-primary transition-colors">
                        {comment.profiles?.name || "Usuário"}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-1 truncate">
                        {comment.profiles?.email}
                      </p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-[14px] text-white/90 italic leading-relaxed">
                      "{comment.content}"
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground/60">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 opacity-40" />
                      <span>{new Date(comment.created_at).toLocaleDateString("pt-BR")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 border border-white/5 text-[10px] font-bold uppercase tracking-widest rounded-full ${
                        comment.parent_id ? "bg-blue-500/10 text-blue-400" :
                        "bg-green-500/10 text-green-400"
                      }`}>
                        {comment.parent_id ? "Resposta" : "Pendente"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5 opacity-40 group-hover:opacity-100 transition-opacity">
                    {!comment.parent_id && (
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedComment(comment); setReplyOpen(true); }} className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all" title="Responder">
                        <Reply className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedComment(comment); }} className="w-9 h-9 rounded-xl hover:bg-white/10 transition-all" title="Ver Detalhes">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setSelectedComment(comment); setDeleteOpen(true); }} className="w-9 h-9 rounded-xl hover:bg-red-500/20 text-red-500 transition-all" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {!isLoading && (
        <motion.p variants={item} className="text-sm text-muted-foreground/50 text-center font-bold mt-4">
          Exibindo {sortedComments.length} de {comments.length} comentários encontrados
        </motion.p>
      )}

      {selectedComment && replyOpen && (
        <Dialog open={true} onOpenChange={(open) => { if (!open) setReplyOpen(false); }}>
          <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-2xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
            <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                  <Reply className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left space-y-1">
                  <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Responder Comentário</DialogTitle>
                  <DialogDescription className="text-[14px] text-muted-foreground">Sua resposta será visível para todos os alunos</DialogDescription>
                </div>
              </div>
            </DialogHeader>
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="p-4 glass-card border-white/10 rounded-[16px] bg-white/[0.02]">
                <div className="flex items-center gap-2 mb-2">
                  <UserCircle className="w-4 h-4 text-primary opacity-50" />
                  <span className="text-[13px] font-bold text-white/90">{selectedComment.profiles?.name}</span>
                </div>
                <p className="text-[14px] italic text-white/80">{selectedComment.content}</p>
              </div>
              <div className="space-y-4">
                <div className="relative">
                  <textarea
                    placeholder="Escreva sua resposta..."
                    value=""
                    onChange={() => {}}
                    className="min-h-[140px] glass-card border-white/10 focus:border-primary/50 bg-black/40 rounded-[16px] p-4 text-[14px] placeholder:text-white/40 resize-none outline-none block w-full"
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] uppercase font-bold text-white/20">
                    Sua resposta será pública
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
              <Button variant="outline" className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold" onClick={() => setReplyOpen(false)}>
                Cancelar
              </Button>
              <Button className="h-[44px] px-6 rounded-[12px] font-bold bg-primary hover:bg-primary/90 text-white shadow-glow transition-all active:scale-95" onClick={() => setReplyOpen(false)}>
                Enviar Resposta
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedComment && deleteOpen && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setDeleteOpen(false); }}>
          <AlertDialogContent className="glass-card border-white/10 rounded-[20px] max-w-[440px] p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
            <div className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                  <Trash2 className="h-7 w-7 text-red-500" />
                </div>
                <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">Excluir Comentário</AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] text-muted-foreground mt-2 leading-relaxed">
                  Tem certeza que deseja excluir permanentemente <strong className="text-white">{selectedComment.content?.substring(0, 50) || ""}...</strong>?
                </AlertDialogDescription>
              </div>
            </div>
            <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
              <AlertDialogCancel className="flex-1 h-[44px] glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold mt-0">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => setDeleteOpen(false)} className="flex-1 h-[44px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold">Excluir Agora</AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
};

export default Comments;