import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseNotifications, Notification } from "@/hooks/useSupabaseNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export default function Notifications() {
  const navigate = useNavigate();
  const {
    notificacoes,
    contarNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    limparTodas,
  } = useSupabaseNotifications();

  const naoLidas = contarNaoLidas();

  const handleNotificationClick = (notificacao: Notification) => {
    marcarComoLida(notificacao.id);
    
    if (notificacao.aulaId) {
      navigate(`/student/lesson/${notificacao.aulaId}`);
    } else if (notificacao.cursoId) {
      navigate(`/student/course/${notificacao.cursoId}`);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    return data.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTipoIcon = (tipo: Notification['tipo']) => {
    switch (tipo) {
      case 'nova_aula':
        return "🎬";
      case 'novo_modulo':
        return "📚";
      case 'curso_atualizado':
        return "✨";
      case 'acesso_liberado':
        return "🔓";
      default:
        return "📣";
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-3xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
            <p className="text-muted-foreground mt-1">
              {naoLidas > 0
                ? `Você tem ${naoLidas} notificação${naoLidas > 1 ? "ões" : ""} não lida${naoLidas > 1 ? "s" : ""}`
                : "Todas as notificações lidas"}
            </p>
          </div>
          <div className="flex gap-2">
            {naoLidas > 0 && (
              <Button
                variant="outline"
            onClick={() => marcarTodasComoLidas()}
            className="border-border/50 gap-2"
              >
                <Check className="h-4 w-4" />
                Marcar todas como lidas
              </Button>
            )}
            {notificacoes.length > 0 && (
              <Button
                variant="outline"
            onClick={() => limparTodas()}
            className="border-destructive/50 text-destructive hover:bg-destructive/10 gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Limpar todas
              </Button>
            )}
          </div>
        </div>

        {/* Lista de Notificações */}
        {notificacoes.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Bell className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
            <h2 className="text-xl font-medium text-foreground mb-2">
              Nenhuma notificação
            </h2>
            <p className="text-muted-foreground">
              Você receberá notificações quando novas aulas forem adicionadas aos seus cursos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                className={cn(
                  "glass-card rounded-xl p-4 transition-all hover:bg-white/5 cursor-pointer relative group",
                  !notificacao.lida && "border-primary/30 bg-primary/5"
                )}
              >
                <div
                  onClick={() => handleNotificationClick(notificacao)}
                  className="flex gap-4"
                >
                  <span className="text-2xl">{getTipoIcon(notificacao.tipo)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className={cn(
                          "font-medium",
                          !notificacao.lida ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {notificacao.titulo}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notificacao.mensagem}
                        </p>
                        <p className="text-xs text-muted-foreground/70 mt-2">
                          {formatarData(notificacao.criadoEm)}
                        </p>
                      </div>
                      {!notificacao.lida && (
                        <span className="h-3 w-3 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  {(notificacao.aulaId || notificacao.cursoId) && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-border/50"
                      onClick={() => handleNotificationClick(notificacao)}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Abrir
                    </Button>
                  )}
                  {!notificacao.lida && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 border-border/50"
                      onClick={(e) => {
                        e.stopPropagation();
                        marcarComoLida(notificacao.id);
                      }}
                    >
                      <Check className="h-3 w-3" />
                      Marcar lida
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-destructive/50 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      excluirNotificacao(notificacao.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
