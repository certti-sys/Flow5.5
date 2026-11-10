import { useState } from "react";
import { Bell, Check, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupabaseNotifications, Notification } from "@/hooks/useSupabaseNotifications";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const {
    notificacoes,
    contarNaoLidas,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
  } = useSupabaseNotifications();

  const naoLidas = contarNaoLidas();

  const handleNotificationClick = (notificacao: Notification) => {
    marcarComoLida(notificacao.id);
    
    if (notificacao.aulaId) {
      navigate(`/student/lesson/${notificacao.aulaId}`);
      setOpen(false);
    } else if (notificacao.cursoId) {
      navigate(`/student/course/${notificacao.cursoId}`);
      setOpen(false);
    }
  };

  const formatarData = (dataString: string) => {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffHoras = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHoras < 1) return "Agora mesmo";
    if (diffHoras < 24) return `${diffHoras}h atrás`;
    if (diffDias === 1) return "Ontem";
    if (diffDias < 7) return `${diffDias} dias atrás`;
    return data.toLocaleDateString("pt-BR");
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10 rounded-xl hover:bg-white/5"
        >
          <Bell className="h-5 w-5" />
          {naoLidas > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-80 p-0 bg-card border-border/50"
      >
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <h3 className="font-semibold text-foreground">Notificações</h3>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
            onClick={() => marcarTodasComoLidas()}
            className="text-xs text-muted-foreground hover:text-foreground"
            >
              <Check className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        <ScrollArea className="h-[300px]">
          {notificacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notificacoes.slice(0, 10).map((notificacao) => (
                <div
                  key={notificacao.id}
                  className={cn(
                    "p-3 hover:bg-white/5 transition-colors cursor-pointer relative group",
                    !notificacao.lida && "bg-primary/5"
                  )}
                >
                  <div
                    onClick={() => handleNotificationClick(notificacao)}
                    className="flex gap-3"
                  >
                    <span className="text-lg">{getTipoIcon(notificacao.tipo)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm line-clamp-1",
                          !notificacao.lida ? "font-medium text-foreground" : "text-muted-foreground"
                        )}>
                          {notificacao.titulo}
                        </p>
                        {!notificacao.lida && (
                          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {notificacao.mensagem}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatarData(notificacao.criadoEm)}
                      </p>
                    </div>
                  </div>
                  <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {(notificacao.aulaId || notificacao.cursoId) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleNotificationClick(notificacao)}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive hover:text-destructive"
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
        </ScrollArea>

        {notificacoes.length > 10 && (
          <div className="p-2 border-t border-border/50">
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => {
                navigate("/student/notifications");
                setOpen(false);
              }}
            >
              Ver todas as notificações
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
