import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import UniversalVideoPlayer from "@/components/UniversalVideoPlayer";
import { LessonSidebar } from "@/components/LessonSidebar";
import { LessonMaterials } from "@/components/LessonMaterials";
import {
  CheckCircle2,
  ChevronLeft,
  MessageSquare,
  Clock,
  ArrowLeft,
  Star,
  Download,
  Share2,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  Reply,
  CornerDownRight,
  FileText,
  User,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useHasAccessToCourse } from "@/hooks/useHasAccessToCourse";
import { useGamification, Achievement } from "@/hooks/useGamification";
import { AchievementUnlockedModal } from "@/components/gamification/AchievementUnlockedModal";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

interface CommentWithReplies {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  lesson_id: string;
  parent_id: string | null;
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
  isAuthorAdmin?: boolean;
  replies?: CommentWithReplies[];
}

const Lesson = () => {
  const { lessonId } = useParams();
  const { user, isAdmin, adminLoaded } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [newComment, setNewComment] = useState("");
  const { checkAchievements } = useGamification();
  const [unlockedAchievement, setUnlockedAchievement] = useState<Achievement | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  // Force scroll to top when lesson changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [lessonId]);

  // Fetch lesson with module and course data
  const { data: lessonData, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select(`
          *,
          modules (
            *,
            courses (*)
          )
        `)
        .eq("id", lessonId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  // Fetch all modules for the course (for sidebar)
  const { data: modules = [] } = useQuery({
    queryKey: ["courseModules", lessonData?.modules?.courses?.id],
    queryFn: async () => {
      if (!lessonData?.modules?.courses?.id) return [];
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          lessons (*)
        `)
        .eq("course_id", lessonData.modules.courses.id)
        .order("order_index", { ascending: true })
        .order("order_index", { foreignTable: "lessons", ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!lessonData?.modules?.courses?.id,
  });

  // Fetch user progress for this lesson
  const { data: progress } = useQuery({
    queryKey: ["lessonProgress", lessonId, user?.id],
    queryFn: async () => {
      if (!user || !lessonId) return null;
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!lessonId,
  });

  // Fetch lesson materials
  const { data: lessonMaterials = [] } = useQuery({
    queryKey: ["lessonMaterials", lessonId],
    queryFn: async () => {
      if (!lessonId) return [];
      const { data, error } = await supabase
        .from("lesson_materials")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });

  const courseId = lessonData?.modules?.courses?.id;

  // Check if user has access to this course
  const { hasAccess, loading: loadingAccess } = useHasAccessToCourse(courseId || null);

  // Redirect to info page if no access
  useEffect(() => {
    // Verify data is synced with current URL params before redirecting
    const isDataSynced = lessonData?.id === lessonId;

    // Only redirect after lesson data has loaded, is synced, and access verification is complete
    if (isDataSynced && !isLoading && lessonData && !loadingAccess && !hasAccess && courseId) {
      navigate(`/curso/${courseId}/info`);
    }
  }, [hasAccess, loadingAccess, courseId, navigate, isLoading, lessonData, lessonId]);

  // Fetch comments with threading
  const { data: comments = [] } = useQuery({
    queryKey: ["comments", lessonId],
    queryFn: async () => {
      // Fetch comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (name, avatar_url)
        `)
        .eq("lesson_id", lessonId)
        .order("created_at", { ascending: true });

      if (commentsError) throw commentsError;

      // Fetch admin user IDs
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = new Set((adminRoles || []).map(r => r.user_id));

      // Organize comments into threads
      const commentsMap = new Map<string, CommentWithReplies>();
      const rootComments: CommentWithReplies[] = [];

      // First pass: create map of all comments with admin flag
      (commentsData || []).forEach((comment: any) => {
        commentsMap.set(comment.id, {
          ...comment,
          isAuthorAdmin: adminUserIds.has(comment.user_id),
          replies: []
        });
      });

      // Second pass: organize into threads
      (commentsData || []).forEach((comment: any) => {
        const commentWithReplies = commentsMap.get(comment.id)!;
        if (comment.parent_id && commentsMap.has(comment.parent_id)) {
          commentsMap.get(comment.parent_id)!.replies!.push(commentWithReplies);
        } else if (!comment.parent_id) {
          rootComments.push(commentWithReplies);
        }
      });

      // Sort replies chronologically (oldest first so they appear in order below parent)
      commentsMap.forEach((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          comment.replies.sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
      });

      // Sort root comments by date (newest first)
      return rootComments.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!lessonId,
  });

  // Toggle completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !lessonId || !courseId) return;

      const isCompleted = progress?.completed || false;

      if (!isCompleted) {
        // Se for marcar como concluído, usamos a Edge Function para o motor de XP rodar
        const { data, error } = await supabase.functions.invoke('lesson-progress', {
          body: {
            action: 'mark_completed',
            lessonId,
            courseId
          },
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        if (error) throw error;
        return data;
      } else {
        // Se for desmarcar, apenas atualizamos o banco diretamente
        const { error } = await supabase
          .from("user_progress")
          .upsert({
            user_id: user.id,
            lesson_id: lessonId,
            course_id: courseId,
            completed: false,
            completed_at: null,
          }, { onConflict: 'user_id,lesson_id' });
        
        if (error) throw error;
        return { data: { completed: false } };
      }
    },
    onSuccess: async (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["lessonProgress", lessonId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userProgress", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["userStats", user?.id], exact: false });

      const wasCompleted = progress?.completed || false;

      if (!wasCompleted) {
        // Mostrar bônus de XP se houver
        const xpEarned = data?.xpGained || 0;
        if (xpEarned > 0) {
          toast.success("Aula Concluída!", {
            description: `Você ganhou +${xpEarned} XP! Continue brilhando.`,
            icon: <Sparkles className="w-5 h-5 text-primary animate-pulse" />,
            duration: 6000,
          });
        } else {
          toast.success("Aula concluída!", {
            icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
          });
        }

        try {
          // Checagem de Conquistas (Badges)
          const result = await checkAchievements.mutateAsync();
          if (result?.newlyUnlocked && result.newlyUnlocked.length > 0) {
            setUnlockedAchievement(result.newlyUnlocked[0]);
            setXpGained(result.totalXpGained);
            setShowAchievementModal(true);
          }
        } catch (error) {
          console.error("Error checking achievements:", error);
        }
      } else {
        toast.success("Aula marcada como não concluída");
      }
    },
    onError: (error) => {
      console.error("Erro ao atualizar progresso:", error);
      toast.error("Erro ao atualizar progresso. Verifique sua conexão.");
    },
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string }) => {
      if (!user || !lessonId) return;

      const { error } = await supabase
        .from("comments")
        .insert({
          lesson_id: lessonId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", lessonId] });
      setNewComment("");
      setReplyingToId(null);
      setReplyContent("");
      toast.success("Comentário adicionado!");
    },
    onError: () => {
      toast.error("Erro ao adicionar comentário");
    },
  });

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from("comments")
        .update({ content: content.trim() })
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["comments", lessonId] });
      setEditingCommentId(null);
      setEditingContent("");
      toast.success("Comentário atualizado!");
    },
    onError: () => {
      toast.error("Erro ao atualizar comentário");
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
      queryClient.invalidateQueries({ queryKey: ["comments", lessonId] });
      setCommentToDelete(null);
      toast.success("Comentário excluído!");
    },
    onError: () => {
      toast.error("Erro ao excluir comentário");
    },
  });

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate({ content: newComment });
    }
  };

  const handleAddReply = (parentId: string) => {
    if (replyContent.trim()) {
      addCommentMutation.mutate({ content: replyContent, parentId });
    }
  };

  const handleStartEdit = (comment: any) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleSaveEdit = () => {
    if (editingCommentId && editingContent.trim()) {
      updateCommentMutation.mutate({ commentId: editingCommentId, content: editingContent });
    }
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditingContent("");
  };

  // Render a single comment with its replies
  const renderComment = (comment: CommentWithReplies, isReply: boolean = false) => {
    // Verificar se o usuário atual é o autor do comentário
    const isAuthor = user?.id === comment.user_id;

    // Só pode editar se é o autor do comentário
    const canEdit = isAuthor;

    // Só pode excluir se:
    // 1. É o autor do comentário (pode excluir seus próprios)
    // 2. É admin do sistema (pode excluir qualquer comentário)
    // IMPORTANTE: Só avaliar isAdmin quando adminLoaded for true
    const currentUserIsAdmin = adminLoaded === true && isAdmin === true;
    const canDelete = isAuthor || currentUserIsAdmin;

    // Mostrar nome real da pessoa (não nome fixo)
    const displayName = comment.profiles?.name || "Usuário";

    // Só mostra o menu de ações se o usuário realmente pode fazer algo
    const showActionsMenu = canEdit || canDelete;

    return (
      <div key={comment.id} className={`${isReply ? "ml-8 pl-4 border-l-2 border-primary/30" : ""}`}>
        <div className="flex gap-3">
          <Avatar className={`${isReply ? "w-8 h-8" : "w-10 h-10"} flex-shrink-0`}>
            <AvatarImage src={comment.profiles?.avatar_url || ""} />
            <AvatarFallback className={comment.isAuthorAdmin ? "bg-primary text-primary-foreground" : ""}>
              {comment.profiles?.name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className={`font-semibold ${isReply ? "text-xs" : "text-sm"} ${comment.isAuthorAdmin ? "text-primary" : ""}`}>
                  {displayName}
                </p>
                {comment.isAuthorAdmin && (
                  <Badge variant="default" className="text-xs py-0 h-5 bg-primary/20 text-primary border-0">
                    Admin
                  </Badge>
                )}
                {isReply && !comment.isAuthorAdmin && (
                  <Badge variant="secondary" className="text-xs py-0 h-5">
                    <CornerDownRight className="w-3 h-3 mr-1" />
                    Resposta
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(comment.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {/* Show actions dropdown - só mostra se o usuário pode editar ou excluir */}
              {showActionsMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canEdit && (
                      <DropdownMenuItem onClick={() => handleStartEdit(comment)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => setCommentToDelete(comment.id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            {/* Show edit mode or content */}
            {editingCommentId === comment.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                  className="bg-secondary/50 border-white/10 min-h-[80px]"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={updateCommentMutation.isPending || !editingContent.trim()}
                  >
                    {updateCommentMutation.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateCommentMutation.isPending}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className={`${isReply ? "text-xs" : "text-sm"} text-foreground/90`}>{comment.content}</p>
                {/* Reply button (only for root comments) */}
                {!isReply && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground h-7 px-2 mt-1"
                    onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                  >
                    <Reply className="w-3 h-3 mr-1" />
                    Responder
                  </Button>
                )}
              </>
            )}

            {/* Reply form */}
            {replyingToId === comment.id && (
              <div className="mt-3 space-y-2 p-3 bg-muted/30 rounded-lg">
                <Textarea
                  placeholder="Escreva sua resposta..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  className="bg-secondary/50 border-white/10 min-h-[80px]"
                  disabled={addCommentMutation.isPending}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddReply(comment.id)}
                    disabled={addCommentMutation.isPending || !replyContent.trim()}
                  >
                    {addCommentMutation.isPending ? "Enviando..." : "Responder"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingToId(null);
                      setReplyContent("");
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Render replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  // Count total comments including replies
  const countAllComments = (comments: CommentWithReplies[]): number => {
    return comments.reduce((acc, comment) => {
      return acc + 1 + (comment.replies?.length || 0);
    }, 0);
  };

  if (isLoading || loadingAccess) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!lessonData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Aula não encontrada</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Hero Header do Curso - versão compacta, full width */}
      {lessonData.modules?.courses && (
        <div className="relative overflow-hidden">
          {/* Background with gradient overlay */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: lessonData.modules.courses.thumbnail
                ? `url(${lessonData.modules.courses.thumbnail})`
                : undefined,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/95 to-background/80" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative container mx-auto px-4 py-3 md:py-4">
            {/* Back Button */}
            <Link to="/dashboard" className="inline-block mb-2">
              <Button variant="ghost" className="gap-2 hover:bg-white/10 text-muted-foreground hover:text-foreground h-9">
                <ChevronLeft className="w-4 h-4" />
                Voltar para Meus Cursos
              </Button>
            </Link>

            <div className="space-y-1.5 max-w-2xl">
              {/* Category Badge */}
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
                {lessonData.modules.courses.category}
              </Badge>

              {/* Title - smaller font */}
              <h2 className="text-[18px] md:text-[20px] font-bold leading-tight tracking-tight">
                {lessonData.modules.courses.title}
              </h2>

              {/* Description - smaller font */}
              {lessonData.modules.courses.description && (
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {lessonData.modules.courses.description}
                </p>
              )}

              {/* Meta Info - extra small font */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-0.5">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>{lessonData.modules.courses.instructor}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {modules.reduce((acc, mod) => acc + (mod.lessons?.length || 0), 0)} aulas
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{lessonData.modules.courses.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {/* Back Button - only show if no hero header */}
        {!lessonData.modules?.courses && (
          <Link to="/dashboard" className="inline-block mb-4">
            <Button variant="ghost" className="gap-2 hover:bg-white/5">
              <ChevronLeft className="w-4 h-4" />
              Voltar para Meus Cursos
            </Button>
          </Link>
        )}

        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Video + Materials + Comments Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player - Only show if lesson has video */}
            {lessonData.video_url && (
              <div className="overflow-hidden rounded-xl bg-black shadow-2xl ring-1 ring-white/[0.08]">
                <UniversalVideoPlayer
                  videoUrl={lessonData.video_url}
                  courseId={courseId}
                  lessonId={lessonId!}
                  onProgressUpdate={() => {
                    // Progress tracking handled internally
                  }}
                />
              </div>
            )}

            {/* Lesson Info */}
            <div className="glass-card rounded-xl p-5 md:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 md:gap-6">
                <div className="flex-1 space-y-2 md:space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase tracking-wider text-[10px] font-bold">
                      {lessonData.modules?.title}
                    </Badge>
                    {lessonData.duration && (
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <Clock className="w-3 h-3" />
                        {lessonData.duration}
                      </span>
                    )}
                  </div>
                  <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight text-foreground leading-tight">{lessonData.title}</h1>
                  {lessonData.description && (
                    <p className="text-[14px] text-muted-foreground leading-relaxed max-w-3xl">{lessonData.description}</p>
                  )}
                </div>
                <Button
                  onClick={() => toggleCompleteMutation.mutate()}
                  variant={progress?.completed ? "default" : "outline"}
                  disabled={toggleCompleteMutation.isPending}
                  className={`gap-2 h-11 md:h-12 px-6 rounded-xl font-bold transition-all duration-300 transform active:scale-95 shadow-lg group shrink-0 ${progress?.completed
                    ? "bg-green-500 hover:bg-green-600 text-white shadow-green-500/20 shadow-premium"
                    : "border-primary/50 hover:border-primary hover:bg-primary/10 text-primary shadow-primary/10"
                    }`}
                >
                  <CheckCircle2 className={`w-4 h-4 transition-transform group-hover:scale-110 ${progress?.completed ? "fill-white" : ""}`} />
                  <span>{progress?.completed ? "Concluída" : "Marcar Concluída"}</span>
                </Button>
              </div>
            </div>

            {/* Lesson Materials */}
            {lessonMaterials.length > 0 && (
              <LessonMaterials materials={lessonMaterials} />
            )}

            {/* Comments Section */}
            <Collapsible defaultOpen className="glass-card rounded-xl p-0 overflow-hidden">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-5 md:p-6 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-[18px] md:text-[20px] font-bold tracking-tight">Comunidade</h2>
                      <p className="text-[12px] text-muted-foreground">{countAllComments(comments)} interações</p>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="p-5 md:p-6 pt-0 space-y-8 animate-accordion-down">
                {/* Add Comment */}
                <div className="space-y-4">
                  <Textarea
                    placeholder="O que achou desta aula? Deixe suas dúvidas ou sugestões..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="bg-secondary/30 border-white/5 min-h-[120px] rounded-xl focus:ring-primary/20 focus:border-primary/30 resize-none transition-all"
                    disabled={addCommentMutation.isPending}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={addCommentMutation.isPending || !newComment.trim()}
                      className="gradient-primary text-white hover:opacity-90 px-8 py-6 rounded-xl font-bold transition-all shadow-xl shadow-primary/20"
                    >
                      {addCommentMutation.isPending ? "Enviando..." : "Publicar Comentário"}
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-8 pt-6 border-t border-white/5">
                  {comments.length === 0 ? (
                    <div className="text-center py-10 opacity-60">
                      <div className="w-16 h-16 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        Nenhum comentário ainda. Seja o primeiro a participar!
                      </p>
                    </div>
                  ) : (
                    comments.map((comment) => renderComment(comment))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Sidebar - hidden on mobile, show collapsible accordion instead */}
          <div className="hidden lg:block lg:col-span-1">
            <LessonSidebar
              modules={modules}
              courseId={courseId!}
            />
          </div>

          {/* Mobile: Interactive course content navigation */}
          <div className="lg:hidden">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="content" className="glass-card rounded-xl border-white/[0.08] overflow-hidden border-none px-0">
                <AccordionTrigger className="px-5 py-4 hover:no-underline font-bold text-lg bg-white/5">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <span>Conteúdo do Curso</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="p-0">
                  <LessonSidebar
                    modules={modules}
                    courseId={courseId!}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </main>

      {/* Achievement Modal */}
      {unlockedAchievement && (
        <AchievementUnlockedModal
          achievement={unlockedAchievement}
          xpGained={xpGained}
          open={showAchievementModal}
          onClose={() => setShowAchievementModal(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle className="tracking-tight">Confirmar exclusão</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  Tem certeza que deseja excluir este comentário? Esta ação não pode ser desfeita.
                  {!user?.id && " Respostas também serão excluídas."}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 pt-4 border-t border-white/5">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => commentToDelete && deleteCommentMutation.mutate(commentToDelete)}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {deleteCommentMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Lesson;
