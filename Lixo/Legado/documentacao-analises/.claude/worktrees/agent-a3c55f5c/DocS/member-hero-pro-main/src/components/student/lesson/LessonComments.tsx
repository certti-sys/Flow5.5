import { useState } from "react";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupabaseLessonComments } from "@/hooks/useSupabaseLessonComments";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LessonCommentsProps {
  lessonId: string;
}

export function LessonComments({ lessonId }: LessonCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const { user } = useAuth();
  const { comments, isLoading, createComment, deleteComment, isCreating } =
    useSupabaseLessonComments(lessonId);

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    createComment(newComment);
    setNewComment("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleSubmit();
    }
  };

  return (
    <div className="space-y-6 py-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-xl font-semibold text-foreground">
          Comentários e Dúvidas
        </h3>
        <span className="text-sm text-muted-foreground">
          ({comments.length})
        </span>
      </div>

      {/* Formulário de novo comentário */}
      <div className="glass-card p-4 rounded-lg border border-border/40 space-y-3">
        <Textarea
          placeholder="Compartilhe suas dúvidas ou comentários sobre esta aula... (Ctrl + Enter para enviar)"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={handleKeyPress}
          className="min-h-[100px] bg-background/50 border-border/50 resize-none"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!newComment.trim() || isCreating}
            className="btn-premium"
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            {isCreating ? "Enviando..." : "Enviar Comentário"}
          </Button>
        </div>
      </div>

      {/* Lista de comentários */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-muted-foreground mt-4">Carregando comentários...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 glass-card rounded-lg border border-border/40">
            <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Seja o primeiro a comentar nesta aula!
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="glass-card p-4 rounded-lg border border-border/40 hover:border-primary/40 transition-all duration-300"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={comment.profiles?.avatar_url || ""} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {comment.profiles?.name?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {comment.profiles?.name || "Usuário"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {user?.id === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteComment(comment.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                    {comment.content}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
