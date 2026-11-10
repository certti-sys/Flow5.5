import { Bell, CheckCircle, AlertTriangle, XCircle, Info, CheckCheck, Check, Trash2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications } from "@/hooks/useNotifications";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const NotificationBell = () => {
  const { 
    notifications, 
    readNotifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead,
    deleteNotification 
  } = useNotifications();
  const navigate = useNavigate();

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    const isRead = readNotifications.some((read) => read.notification_id === notification.id);
    if (!isRead) {
      markAsRead(notification.id);
    }

    // Navigate if link exists
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getNotificationIcon = (type: string, isRead: boolean) => {
    const baseClass = `w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-opacity ${
      isRead ? 'opacity-50' : ''
    }`;
    
    switch (type) {
      case "success":
        return (
          <div className={`${baseClass} bg-green-500/15`}>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
        );
      case "warning":
        return (
          <div className={`${baseClass} bg-yellow-500/15`}>
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
          </div>
        );
      case "error":
        return (
          <div className={`${baseClass} bg-red-500/15`}>
            <XCircle className="w-4 h-4 text-red-500" />
          </div>
        );
      default: // info
        return (
          <div className={`${baseClass} bg-blue-500/15`}>
            <Info className="w-4 h-4 text-blue-500" />
          </div>
        );
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 bg-primary rounded-full text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h4 className="font-semibold text-sm">Notificações</h4>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <>
                <button 
                  onClick={() => markAllAsRead()}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} {unreadCount === 1 ? "nova" : "novas"}
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Notification List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Nenhuma notificação ainda
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const isRead = readNotifications.some(
                  (read) => read.notification_id === notification.id
                );
                return (
                  <div
                    key={notification.id}
                    className={`relative group w-full text-left p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                      !isRead ? "bg-primary/5" : ""
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start gap-3 pr-16">
                      {/* Icon */}
                      {getNotificationIcon(notification.type, isRead)}
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${!isRead ? "text-foreground" : "text-muted-foreground"}`}>
                          {notification.title}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>

                    {/* Hover Actions */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                      {!isRead && (
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            markAsRead(notification.id); 
                          }}
                          className="p-1.5 rounded-md hover:bg-muted transition-colors"
                          title="Marcar como lida"
                        >
                          <Check className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          deleteNotification(notification.id); 
                        }}
                        className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
