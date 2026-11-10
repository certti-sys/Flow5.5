import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  link?: string;
  created_by?: string;
  created_at: string;
}

export interface NotificationRead {
  id: string;
  notification_id: string;
  user_id: string;
  read_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all notifications
  const { data: notifications = [], isLoading: isLoadingNotifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user,
  });

  // Fetch user's read notifications
  const { data: readNotifications = [], isLoading: isLoadingReads } = useQuery({
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
  });

  // Calculate unread notifications
  const unreadCount = notifications.filter(
    (notification) =>
      !readNotifications.some((read) => read.notification_id === notification.id)
  ).length;

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("notification_reads")
        .insert({
          notification_id: notificationId,
          user_id: user.id,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationReads", user?.id] });
    },
  });

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      // Get unread notification IDs
      const unreadIds = notifications.filter(
        (n) => !readNotifications.some((r) => r.notification_id === n.id)
      ).map((n) => n.id);

      if (unreadIds.length === 0) return;

      // Insert read records for all unread notifications
      const { error } = await supabase
        .from("notification_reads")
        .insert(
          unreadIds.map((notificationId) => ({
            notification_id: notificationId,
            user_id: user.id,
          }))
        );

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationReads", user?.id] });
    },
  });

  // Create notification (admin only)
  const createNotificationMutation = useMutation({
    mutationFn: async (notification: {
      title: string;
      message: string;
      type: "info" | "warning" | "success" | "error";
      link?: string;
    }) => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase.from("notifications").insert({
        ...notification,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Notificação enviada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao enviar notificação: " + error.message);
    },
  });

  // Delete notification (admin only)
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

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
    unreadCount,
    isLoading: isLoadingNotifications || isLoadingReads,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    createNotification: createNotificationMutation.mutate,
    deleteNotification: deleteNotificationMutation.mutate,
    isCreating: createNotificationMutation.isPending,
    isDeleting: deleteNotificationMutation.isPending,
  };
};
