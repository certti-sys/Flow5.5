import { useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Send, Bell, BellRing, BellDot } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Notifications() {
  const { notifications, createNotification, deleteNotification, isCreating } = useNotifications();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "error">("info");
  const [link, setLink] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createNotification(
      {
        title,
        message,
        type,
        link: link || undefined,
      },
      {
        onSuccess: () => {
          setTitle("");
          setMessage("");
          setType("info");
          setLink("");
        },
      }
    );
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500/10 border-green-500/20 text-green-400";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20 text-amber-400";
      case "error":
        return "bg-red-500/10 border-red-500/20 text-red-400";
      default:
        return "bg-blue-500/10 border-blue-500/20 text-blue-400";
    }
  };
  
  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case "success":
        return "border-green-500/50 bg-green-500/20 text-green-500";
      case "warning":
        return "border-amber-500/50 bg-amber-500/20 text-amber-500";
      case "error":
        return "border-red-500/50 bg-red-500/20 text-red-500";
      default:
        return "border-blue-500/50 bg-blue-500/20 text-blue-500";
    }
  };

  const stats = {
    total: notifications?.length || 0,
    info: notifications?.filter(n => n.type === 'info').length || 0,
    outras: notifications?.filter(n => n.type !== 'info').length || 0,
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight text-white leading-[36px]">
            Notificações
          </h1>
          <p className="text-[14px] text-muted-foreground mt-1 leading-[22px]">
            Envie notificações globais ou direcionadas para os usuários da plataforma
          </p>
        </div>
      </motion.div>

      {/* Bento Grid Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-[16px]"
      >
        {[
          { label: "Total Enviadas", value: String(stats.total), icon: Bell, color: "text-primary" },
          { label: "Informativas", value: String(stats.info), icon: BellDot, color: "text-blue-500" },
          { label: "Outros Tipos", value: String(stats.outras), icon: BellRing, color: "text-amber-500" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.06 }}
          >
            <div className="glass-card p-[24px] relative overflow-hidden group border border-white/10 hover:border-white/20 transition-all duration-500 rounded-[16px]">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-primary/10 transition-all duration-500" />
              <div className="flex items-center gap-[8px] mb-[16px]">
                <div className={`p-[10px] rounded-[12px] bg-black/40 border border-white/10 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="text-[13px] font-medium text-muted-foreground">{stat.label}</span>
              </div>
              <h3 className="text-[24px] font-bold font-geist tracking-tighter leading-[28px]">{stat.value}</h3>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Formulário de Criação */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card border border-white/10 rounded-[16px] overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] rounded-[10px] bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center">
                <Send className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-white">Nova Notificação</h2>
                <p className="text-[12px] text-muted-foreground">Transmita mensagens para a base</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white/80 font-medium text-[13px]">Título da Mensagem</Label>
                <Input
                  id="title"
                  placeholder="Ex: Novo Curso Disponível"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message" className="text-white/80 font-medium text-[13px]">Conteúdo Detalhado</Label>
                <Textarea
                  id="message"
                  placeholder="Descreva a notificação em detalhes..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-white/20 rounded-[10px] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type" className="text-white/80 font-medium text-[13px]">Categoria</Label>
                  <Select value={type} onValueChange={(value: any) => setType(value)}>
                    <SelectTrigger id="type" className="bg-black/20 border-white/10 text-white h-[44px] rounded-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1C1C1F] border-white/10">
                      <SelectItem value="info">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/20 text-blue-400 font-bold uppercase text-[10px] tracking-wider py-0.5">
                            Info
                          </Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="success">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-green-500/10 border-green-500/20 text-green-400 font-bold uppercase text-[10px] tracking-wider py-0.5">
                            Sucesso
                          </Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="warning">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-amber-500/10 border-amber-500/20 text-amber-400 font-bold uppercase text-[10px] tracking-wider py-0.5">
                            Aviso
                          </Badge>
                        </span>
                      </SelectItem>
                      <SelectItem value="error">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-red-500/10 border-red-500/20 text-red-400 font-bold uppercase text-[10px] tracking-wider py-0.5">
                            Erro
                          </Badge>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link" className="text-white/80 font-medium text-[13px]">Link Relacionado</Label>
                  <Input
                    id="link"
                    placeholder="Ex: /cursos/novo"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    className="bg-black/20 border-white/10 text-white placeholder:text-white/20 h-[44px] rounded-[10px]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full gradient-primary shadow-glow h-[48px] rounded-[12px] font-semibold text-[14px]" 
                  disabled={isCreating}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isCreating ? "Enviando Notificação..." : "Disparar Notificação"}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Lista de Notificações */}
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ delay: 0.4 }}
           className="glass-card border border-white/10 rounded-[16px] overflow-hidden"
        >
          <div className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              <div className="w-[40px] h-[40px] rounded-[10px] bg-white/5 border border-white/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-white/60" />
              </div>
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-white">Histórico de Envios</h2>
                <p className="text-[12px] text-muted-foreground">Últimas notificações disparadas</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-3 max-h-[520px] overflow-y-auto scrollbar-none pr-2">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <Bell className="w-8 h-8 opacity-40 text-white" />
                  </div>
                  <p className="text-[14px]">Nenhuma notificação enviada ainda.</p>
                </div>
              ) : (
                <AnimatePresence>
                  {notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-[16px] rounded-[12px] border border-white/10 bg-black/20 hover:bg-white/5 transition-colors group relative"
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-2 shrink-0 border",
                          getNotificationTypeIcon(notification.type)
                        )} />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 gap-2">
                             <div className="flex items-center gap-2 truncate">
                                <h4 className="font-semibold text-white text-[14px] truncate">{notification.title}</h4>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0 uppercase tracking-wider font-bold shrink-0", 
                                    getNotificationTypeColor(notification.type)
                                  )}
                                >
                                  {notification.type}
                                </Badge>
                             </div>
                             <p className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
                                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                             </p>
                          </div>
                          
                          <p className="text-[13px] text-white/50 mb-2 leading-snug line-clamp-2">
                            {notification.message}
                          </p>
                          
                          {notification.link && (
                            <a href={notification.link} className="text-[12px] text-primary hover:underline truncate inline-block max-w-full">
                              {notification.link}
                            </a>
                          )}
                        </div>

                        {/* Delete Action */}
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute right-4 bottom-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-500/10 hover:text-red-500 rounded-md">
                                <Trash2 className="w-4 h-4 text-white/20 group-hover:text-white/40 hover:!text-red-500 transition-colors" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="bg-[#1C1C1F] border border-white/10 rounded-[16px]">
                              <AlertDialogHeader>
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                                    <Trash2 className="h-5 w-5 text-red-500" />
                                  </div>
                                  <div>
                                    <AlertDialogTitle className="tracking-tight text-white">Excluir Notificação</AlertDialogTitle>
                                    <AlertDialogDescription className="mt-1 text-white/50 text-[13px]">
                                      Tem certeza? Esta notificação sumirá para todos os usuários que ainda não a viram. Essa ação é irreversível.
                                    </AlertDialogDescription>
                                  </div>
                                </div>
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-4 pt-4 border-t border-white/5">
                                <AlertDialogCancel className="bg-white/5 hover:bg-white/10 text-white border-white/10 rounded-[10px]">Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteNotification(notification.id)}
                                  className="bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20 rounded-[10px]"
                                >
                                  Sim, excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
