import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationSettings {
  id: string;
  user_id: string;
  email_alerts: boolean;
  alert_email: string;
  alert_on_error: boolean;
  alert_on_multiple_failures: boolean;
  failure_threshold: number;
  platforms_to_monitor: string[];
}

export function useNotificationSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await (supabase
        .from('admin_notifications_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .single() as any);

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existe configuração, retornar valores padrão
      if (!data) {
        return {
          id: '',
          user_id: user.id,
          email_alerts: true,
          alert_email: user.email || '',
          alert_on_error: true,
          alert_on_multiple_failures: true,
          failure_threshold: 3,
          platforms_to_monitor: ['hotmart', 'kiwify', 'monetizze', 'eduzz', 'bripe'],
        } as NotificationSettings;
      }

      return data as NotificationSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<NotificationSettings>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se já existe uma configuração
      const { data: existing } = await (supabase
        .from('admin_notifications_settings' as any)
        .select('id')
        .eq('user_id', user.id)
        .single() as any);

      if (existing) {
        // Atualizar
        const { data, error } = await (supabase
          .from('admin_notifications_settings' as any)
          .update(updates)
          .eq('user_id', user.id)
          .select()
          .single() as any);

        if (error) throw error;
        return data;
      } else {
        // Criar novo
        const { data, error } = await (supabase
          .from('admin_notifications_settings' as any)
          .insert({
            user_id: user.id,
            alert_email: updates.alert_email || user.email || '',
            ...updates,
          })
          .select()
          .single() as any);

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
  };
}
