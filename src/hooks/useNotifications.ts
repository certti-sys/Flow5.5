import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type NotificationType = "info" | "warning" | "success" | "error";
export type NotificationAudience = "all" | "user" | "course" | "product";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  link?: string | null;
  audience: NotificationAudience;
  audience_id: string | null;
  publish_at: string;
  expires_at: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
}

export interface NewNotification {
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  audience: NotificationAudience;
  audience_id?: string | null;
  publish_at?: string;
  expires_at?: string | null;
  /** Além do sino, enfileira no WhatsApp dos destinatários com telefone. */
  send_whatsapp?: boolean;
}

/**
 * Notificações do usuário logado.
 *
 * Quem pode ver o quê é decidido na policy de RLS (`audience`), não aqui — o
 * cliente não filtra audiência, senão a regra viveria em dois lugares e o
 * primeiro `select` sem filtro vazaria aviso de outro curso.
 *
 * O sino não tem push nem websocket: um refetch por minuto é suficiente para
 * um aviso de manutenção e não custa uma conexão Realtime por aba aberta.
 */
export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: notifications = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("publish_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as Notification[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const { data: readNotifications = [] } = useQuery({
    queryKey: ["notificationReads", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("notification_reads")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as NotificationRead[];
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const readIds = new Set(readNotifications.map((r) => r.notification_id));
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error("User not authenticated");
      // `ignoreDuplicates`: clicar duas vezes não pode estourar o unique.
      const { error } = await supabase
        .from("notification_reads")
        .upsert(
          { notification_id: notificationId, user_id: user.id },
          { onConflict: "notification_id,user_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationReads", user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");
      const unreadIds = notifications.filter((n) => !readIds.has(n.id)).map((n) => n.id);
      if (unreadIds.length === 0) return;
      const { error } = await supabase
        .from("notification_reads")
        .upsert(
          unreadIds.map((id) => ({ notification_id: id, user_id: user.id })),
          { onConflict: "notification_id,user_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationReads", user?.id] });
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notification: NewNotification) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase.from("notifications").insert({
        ...notification,
        audience_id: notification.audience === "all" ? null : notification.audience_id,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      // WhatsApp sai pelo cron de minuto (`dispatch-notifications`): o admin não
      // espera o envio, e a fila sobrevive a rate limit do provider.
      toast.success("Notificação enviada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao enviar notificação: " + error.message);
    },
  });

  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase.from("notifications").delete().eq("id", notificationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação excluída com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao excluir notificação: " + error.message);
    },
  });

  return {
    notifications,
    readNotifications,
    readIds,
    unreadCount,
    isLoading,
    isError,
    refetch,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    createNotification: createNotificationMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isCreating: createNotificationMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
};
