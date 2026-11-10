import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  Eye, 
  Calendar, 
  BookOpen, 
  Reply, 
  CornerDownRight, 
  Filter,
  CheckCircle2,
  Clock,
  UserCircle,
  Mail
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
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
    name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  lessons: {
    title: string;
    modules: {
      title: string;
      courses: {
        id: string;
        title: string;
      } | null;
    } | null;
  } | null;
}

const Comments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all, root, replies, unanswered
  const [orderBy, setOrderBy] = useState("recent");
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Fetch all comments with related data
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

  // Fetch courses for filter
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

  // Reply to comment mutation
  const replyMutation = useMutation({
    mutationFn: async ({ parentId, lessonId, content }: { parentId: string; lessonId: string; content: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("comments")
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminComments"] });
      toast.success("Resposta enviada com sucesso!");
      setReplyingTo(null);
      setReplyContent("");
      setSelectedComment(null);
    },
    onError: () => {
      toast.error("Erro ao enviar resposta");
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminComments"] });
      toast.success("Comentário excluído com sucesso!");
      setCommentToDelete(null);
      setSelectedComment(null);
    },
    onError: () => {
      toast.error("Erro ao excluir comentário");
    },
  });

  // Check if a comment has replies
  const hasReplies = (commentId: string) => {
    return comments.some((c) => c.parent_id === commentId);
  };

  // Get reply count for a comment
  const getReplyCount = (commentId: string) => {
    return comments.filter((c) => c.parent_id === commentId).length;
  };

  // Check if a root comment is unanswered
  const isUnanswered = (comment: Comment) => {
    return !comment.parent_id && !hasReplies(comment.id);
  };

  // Filter and sort comments
  const filteredComments = comments.filter((comment) => {
    // Search filter
    const matchesSearch =
      searchTerm === "" ||
      (comment?.content?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (comment?.profiles?.name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
      (comment?.profiles?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase());

    // Course filter
    const matchesCourse =
      courseFilter === "all" ||
      comment?.lessons?.modules?.courses?.id === courseFilter;

    // Period filter
    let matchesPeriod = true;
    if (periodFilter !== "all") {
      const commentDate = new Date(comment.created_at);
      const daysAgo = parseInt(periodFilter);
      matchesPeriod = isAfter(commentDate, subDays(new Date(), daysAgo));
    }

    // Type filter
    let matchesType = true;
    if (typeFilter === "root") {
      matchesType = !comment.parent_id;
    } else if (typeFilter === "replies") {
      matchesType = !!comment.parent_id;
    } else if (typeFilter === "unanswered") {
      matchesType = isUnanswered(comment);
    }

    return matchesSearch && matchesCourse && matchesPeriod && matchesType;
  });

  // Sort comments
  const sortedComments = [...filteredComments].sort((a, b) => {
    if (orderBy === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
  });

  // Calculate statistics
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const commentsToday = (comments || []).filter(
    (c) => c?.created_at && new Date(c.created_at) >= today
  ).length;

  const uniqueLessons = new Set((comments || []).map((c) => c?.lesson_id).filter(Boolean)).size;
  const avgPerLesson = uniqueLessons > 0 ? (comments.length / uniqueLessons).toFixed(1) : "0";

  const unansweredCount = (comments || []).filter(c => c && isUnanswered(c)).length;

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const handleReply = () => {
    if (replyingTo && replyContent.trim()) {
      replyMutation.mutate({
        parentId: replyingTo.id,
        lessonId: replyingTo.lesson_id,
        content: replyContent,
      });
    }
  };

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-[32px] pb-20"
    >
      {/* Header aligned to DS (28px) */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-[36px]">
            Moderação de Comentários
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
            Gerencie e responda aos comentários dos alunos para manter sua comunidade engajada.
          </p>
        </div>
      </motion.div>

      {/* Statistics - Luxury Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div variants={item} className="glass-card p-5 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] hover:border-primary/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Total Geral</span>
            <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-white tracking-tight">{comments.length}</div>
        </motion.div>
        
        <motion.div variants={item} className="glass-card p-5 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] hover:border-green-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Hoje</span>
            <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
              <Calendar className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-white tracking-tight">{commentsToday}</div>
        </motion.div>

        <motion.div variants={item} className="glass-card p-5 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] hover:border-blue-500/30 transition-all duration-300">
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Média / Aula</span>
            <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <BookOpen className="h-4 w-4 text-blue-500" />
            </div>
          </div>
          <div className="text-[28px] font-bold text-white tracking-tight">{avgPerLesson}</div>
        </motion.div>

        <motion.div variants={item} className={`glass-card p-5 rounded-[16px] border-white/10 shadow-2xl group flex flex-col justify-between h-[120px] transition-all duration-300 ${unansweredCount > 0 ? "hover:border-orange-500/50" : "hover:border-white/20"}`}>
          <div className="flex justify-between items-start">
            <span className="text-[13px] font-bold text-muted-foreground uppercase tracking-widest">Aguardando</span>
            <div className={`p-2 rounded-lg transition-colors ${unansweredCount > 0 ? "bg-orange-500/20" : "bg-white/5"}`}>
              <Clock className={`h-4 w-4 ${unansweredCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            </div>
          </div>
          <div className={`text-[28px] font-bold tracking-tight ${unansweredCount > 0 ? "text-orange-500" : "text-white"}`}>
            {unansweredCount}
          </div>
        </motion.div>
      </div>

      {/* Filters - Glass Bar */}
      <motion.div variants={item} className="flex flex-col xl:flex-row gap-4 p-4 glass-card rounded-[16px] border-white/5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Buscar por texto ou autor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-[44px] glass-card border-white/10 focus:border-primary/50 rounded-[12px] placeholder:text-muted-foreground/30"
          />
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold">
              <Filter className="h-3.5 w-3.5 mr-2 opacity-50" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="root">Comentários</SelectItem>
              <SelectItem value="replies">Respostas</SelectItem>
              <SelectItem value="unanswered">Sem Resposta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold">
              <SelectValue placeholder="Todos os cursos" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl max-h-[300px]">
              <SelectItem value="all">Todos os cursos</SelectItem>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl">
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={orderBy} onValueChange={setOrderBy}>
            <SelectTrigger className="glass-card border-white/10 h-[44px] rounded-[12px] text-[13px] font-bold">
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent className="glass-card border-white/10 bg-black/90 backdrop-blur-xl">
              <SelectItem value="recent">Mais recentes</SelectItem>
              <SelectItem value="oldest">Mais antigos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Comments Table - Glass Hub */}
      <motion.div variants={item} className="glass-card rounded-[16px] border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-muted-foreground">
                <th className="px-6 py-5 text-left text-[13px] font-bold uppercase tracking-wider">Autor</th>
                <th className="px-6 py-5 text-left text-[13px] font-bold uppercase tracking-wider hidden md:table-cell">Comentário</th>
                <th className="px-6 py-5 text-left text-[13px] font-bold uppercase tracking-wider hidden lg:table-cell">Origem</th>
                <th className="px-6 py-5 text-center text-[13px] font-bold uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-5 text-left text-[13px] font-bold uppercase tracking-wider">Data</th>
                <th className="px-6 py-5 text-right text-[13px] font-bold uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <AnimatePresence>
                {isLoading ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={6} className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                    </td>
                  </motion.tr>
                ) : sortedComments.length === 0 ? (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-10" />
                      <p className="text-[14px]">Nenhum comentário encontrado</p>
                    </td>
                  </motion.tr>
                ) : (
                  sortedComments.map((comment) => (
                    <motion.tr 
                      key={comment.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/[0.03] transition-colors group/row"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 rounded-[12px] border border-white/10 shadow-lg group-hover/row:scale-105 transition-transform duration-300">
                            <AvatarImage src={comment.profiles?.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/20 text-primary font-bold">
                              {comment.profiles?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-bold text-[14px] text-white leading-tight underline-offset-4 group-hover/row:text-primary transition-all">
                              {comment.profiles?.name || "Usuário"}
                            </p>
                            <p className="text-[12px] text-muted-foreground mt-1 truncate">
                              {comment.profiles?.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 hidden md:table-cell max-w-[280px]">
                        <p className="text-[14px] text-muted-foreground truncate italic group-hover/row:text-white/60 transition-colors">
                          "{truncateText(comment.content, 50)}"
                        </p>
                      </td>
                      <td className="px-6 py-5 hidden lg:table-cell">
                        <div className="space-y-1.5">
                          <p className="text-[13px] font-bold text-white/80 line-clamp-1">
                            {comment.lessons?.title || "Aula não encontrada"}
                          </p>
                          <span className="text-[10px] uppercase font-bold tracking-widest text-primary/70">
                            {comment.lessons?.modules?.courses?.title || "Curso"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        {comment.parent_id ? (
                          <span className="inline-flex items-center px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md">
                            <CornerDownRight className="w-3 h-3 mr-1" />
                            Resposta
                          </span>
                        ) : isUnanswered(comment) ? (
                          <span className="inline-flex items-center px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md animate-pulse">
                            Pendente
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-bold uppercase tracking-wider rounded-md">
                            {getReplyCount(comment.id)} Resposta(s)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground whitespace-nowrap">
                          <Calendar className="w-3 h-3 opacity-40" />
                          {format(new Date(comment.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-40 group-hover/row:opacity-100 transition-opacity">
                          {!comment.parent_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setReplyingTo(comment);
                                setSelectedComment(comment);
                              }}
                              className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all"
                              title="Responder"
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedComment(comment)}
                            className="w-9 h-9 rounded-xl hover:bg-white/10 transition-all"
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCommentToDelete(comment)}
                            className="w-9 h-9 rounded-xl hover:bg-destructive/10 text-destructive transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Result stats */}
      {!isLoading && (
        <motion.p variants={item} className="text-sm text-muted-foreground/50 text-center font-medium">
          Exibindo {sortedComments.length} de {comments.length} comentários encontrados
        </motion.p>
      )}

      <Dialog open={!!selectedComment} onOpenChange={() => setSelectedComment(null)}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
          <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left space-y-1">
                <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                  Detalhes do Comentário
                </DialogTitle>
                <DialogDescription className="text-[14px] text-muted-foreground m-0">
                  Visualize o conteúdo e o histórico de discussão
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-styled">
            {selectedComment && (
              <div className="space-y-6">
                {/* Author Card */}
                <div className="flex items-center gap-4 p-4 glass-card border-white/10 rounded-[16px] bg-white/[0.02]">
                  <Avatar className="h-12 w-12 rounded-[14px] border border-white/10">
                    <AvatarImage src={selectedComment?.profiles?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {selectedComment?.profiles?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white">{selectedComment?.profiles?.name || "Usuário"}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 opacity-50" />
                      <span className="truncate">{selectedComment?.profiles?.email || "Privado"}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40 block mb-1">DATA</span>
                    <span className="text-[13px] font-medium text-white/60">
                      {selectedComment?.created_at ? format(new Date(selectedComment.created_at), "dd/MM/yy HH:mm", { locale: ptBR }) : ""}
                    </span>
                  </div>
                </div>

                {/* Content Box */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-primary/60">CONTEÚDO</span>
                    <Badge variant="outline" className="glass-card border-white/10 text-[10px] text-white/40">
                      <BookOpen className="w-3 h-3 mr-1.5" />
                      {selectedComment?.lessons?.title}
                    </Badge>
                  </div>
                  <div className="p-5 glass-card border-white/10 rounded-[16px] bg-white/[0.01]">
                    <p className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap italic opacity-90">
                      "{selectedComment?.content}"
                    </p>
                  </div>
                </div>

                {/* Thread / Replies */}
                {!selectedComment.parent_id && (
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3">
                      <Reply className="h-4 w-4 text-primary" />
                      <span className="text-[13px] font-bold uppercase tracking-widest text-white/40">
                        Discussão ({getReplyCount(selectedComment.id)})
                      </span>
                    </div>
                    
                    {hasReplies(selectedComment.id) ? (
                      <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                        {comments
                          .filter((c) => c.parent_id === selectedComment.id)
                          .map((reply) => (
                            <div key={reply.id} className="p-3 glass-card border-white/5 rounded-[12px] bg-white/[0.02]">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-[13px] font-bold text-primary">{reply?.profiles?.name}</span>
                                <span className="text-[10px] text-muted-foreground/50">
                                  {reply?.created_at ? format(new Date(reply.created_at), "dd/MM HH:mm", { locale: ptBR }) : ""}
                                </span>
                              </div>
                              <p className="text-[13px] text-white/70">{reply?.content}</p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 glass-card border-dashed border-white/10 rounded-[16px]">
                        <p className="text-sm text-muted-foreground/30 font-medium">Nenhuma resposta enviada ainda.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
            {!selectedComment?.parent_id && (
              <Button
                variant="outline"
                className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
                onClick={() => setReplyingTo(selectedComment)}
              >
                <Reply className="h-4 w-4 mr-2" />
                Responder
              </Button>
            )}
            <Button
              variant="destructive"
              className="h-[44px] px-6 rounded-[12px] font-bold bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                setCommentToDelete(selectedComment);
                setSelectedComment(null);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
            <Button
              variant="outline"
              className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
              onClick={() => setSelectedComment(null)}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!replyingTo} onOpenChange={() => {
        setReplyingTo(null);
        setReplyContent("");
      }}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
          <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
                <Reply className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left space-y-1">
                <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                  Responder Comentário
                </DialogTitle>
                <DialogDescription className="text-[14px] text-muted-foreground m-0">
                  Sua resposta será visível para todos os alunos
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-styled">

            <div className="space-y-6">
              <div className="p-4 glass-card border-white/10 rounded-[16px] bg-white/[0.02]">
                 <div className="flex items-center gap-2 mb-2">
                    <UserCircle className="w-4 h-4 text-primary opacity-50" />
                    <span className="text-[13px] font-bold text-white/60">{replyingTo?.profiles?.name}</span>
                 </div>
                 <p className="text-[14px] italic text-muted-foreground">"{replyingTo?.content}"</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <Textarea
                    placeholder="Escreva sua resposta de suporte..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[140px] glass-card border-white/10 focus:border-primary/50 bg-black/40 rounded-[16px] p-4 text-[14px] placeholder:text-muted-foreground/30 resize-none outline-none"
                    disabled={replyMutation.isPending}
                  />
                  <div className="absolute bottom-3 right-3 text-[10px] uppercase font-bold tracking-widest text-muted-foreground/20">
                    Sua resposta será pública
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
            <Button
              variant="outline"
              className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
              onClick={() => {
                setReplyingTo(null);
                setReplyContent("");
              }}
              disabled={replyMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReply}
              className="h-[44px] px-6 rounded-[12px] font-bold bg-primary hover:bg-primary/90 text-white shadow-glow transition-all active:scale-95"
              disabled={replyMutation.isPending || !replyContent.trim()}
            >
              {replyMutation.isPending ? "Processando..." : "Enviar Resposta"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[20px] max-w-[440px] p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
          <div className="p-8">
            <div className="flex flex-col items-center text-center space-y-5">
              <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                <Trash2 className="h-8 w-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-[22px] font-bold text-white tracking-tight">Excluir Comentário</AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir permanentemente este comentário? Esta ação não pode ser desfeita.
                  {!commentToDelete?.parent_id && hasReplies(commentToDelete?.id || "") && (
                    <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 font-bold rounded-[16px] text-[12px] flex items-center gap-3">
                      <span className="text-[20px]">⚠️</span>
                      <span className="text-left">As respostas vinculadas também serão removidas permanentemente.</span>
                    </div>
                  )}
                </AlertDialogDescription>
              </div>
            </div>
          </div>
          <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-center gap-3">
            <AlertDialogCancel className="h-[44px] px-8 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white hover:text-white bg-transparent font-bold mt-0 flex-1">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && deleteCommentMutation.mutate(commentToDelete.id)}
              className="h-[44px] px-8 bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold flex-1"
            >
              {deleteCommentMutation.isPending ? "Excluindo..." : "Excluir Agora"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Comments;
