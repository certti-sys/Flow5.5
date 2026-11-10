import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WebhookConfig {
  id: string;
  course_id: string;
  platform: string;
  secret_key: string;
  external_product_id: string | null;
  checkout_url: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_config_id: string | null;
  course_id: string | null;
  platform: string;
  event_type: string;
  buyer_email: string | null;
  buyer_name: string | null;
  transaction_id: string | null;
  status: string;
  message: string | null;
  payload: Record<string, any> | null;
  created_at: string;
}

export interface WebhookStats {
  total: number;
  active: number;
  totalSales: number;
  successRate: number;
}

const WEBHOOK_CONFIGS_KEY = 'webhook-configs';
const WEBHOOK_LOGS_KEY = 'webhook-logs';

export function useSupabaseWebhooks() {
  const queryClient = useQueryClient();

  // Fetch webhook configs
  const { data: webhookConfigs = [], isLoading: isLoadingConfigs } = useQuery({
    queryKey: [WEBHOOK_CONFIGS_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('webhook_configs' as any)
        .select('*')
        .order('created_at', { ascending: false }) as any);

      if (error) throw error;
      return (data || []) as WebhookConfig[];
    },
  });

  // Fetch webhook logs
  const { data: webhookLogs = [], isLoading: isLoadingLogs } = useQuery({
    queryKey: [WEBHOOK_LOGS_KEY],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('webhook_logs' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100) as any);

      if (error) throw error;
      return (data || []) as WebhookLog[];
    },
  });

  // Create webhook config
  const createWebhookConfigMutation = useMutation({
    mutationFn: async (config: Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at' | 'secret_key'>) => {
      const { data, error } = await (supabase
        .from('webhook_configs' as any)
        .insert(config)
        .select()
        .single() as any);

      if (error) throw error;
      return data as WebhookConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOK_CONFIGS_KEY] });
      toast.success('Webhook criado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar webhook: ' + error.message);
    },
  });

  // Update webhook config
  const updateWebhookConfigMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<WebhookConfig> }) => {
      const { data, error } = await (supabase
        .from('webhook_configs' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single() as any);

      if (error) throw error;
      return data as WebhookConfig;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOK_CONFIGS_KEY] });
      toast.success('Webhook atualizado com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar webhook: ' + error.message);
    },
  });

  // Delete webhook config
  const deleteWebhookConfigMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('webhook_configs' as any)
        .delete()
        .eq('id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOK_CONFIGS_KEY] });
      toast.success('Webhook excluído com sucesso');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir webhook: ' + error.message);
    },
  });

  // Clear all logs
  const clearLogsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase
        .from('webhook_logs' as any)
        .delete()
        .gte('created_at', '1970-01-01') as any); // Delete all logs

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WEBHOOK_LOGS_KEY] });
    },
  });

  // Helper functions
  const getWebhookConfigByCourse = (courseId: string): WebhookConfig | undefined => {
    return webhookConfigs.find(w => w.course_id === courseId);
  };

  const getWebhookStats = (): WebhookStats => {
    const total = webhookConfigs.length;
    const active = webhookConfigs.filter(w => w.active).length;
    const successLogs = webhookLogs.filter(l => l.status === 'success');
    const totalSales = successLogs.length;
    const successRate = webhookLogs.length > 0 
      ? Math.round((successLogs.length / webhookLogs.length) * 100) 
      : 0;

    return { total, active, totalSales, successRate };
  };

  const getLogsByCourse = (courseId: string): WebhookLog[] => {
    return webhookLogs.filter(l => l.course_id === courseId);
  };

  const getWebhookUrl = (secretKey?: string): string => {
    const baseUrl = 'https://lrexwvjqlkzegfkipbqt.supabase.co/functions/v1/process-webhook';
    return secretKey ? `${baseUrl}?key=${secretKey}` : baseUrl;
  };

  const createWebhookConfig = (config: Omit<WebhookConfig, 'id' | 'created_at' | 'updated_at' | 'secret_key'>) => {
    return createWebhookConfigMutation.mutateAsync(config);
  };

  const updateWebhookConfig = (id: string, updates: Partial<WebhookConfig>) => {
    return updateWebhookConfigMutation.mutateAsync({ id, updates });
  };

  const deleteWebhookConfig = (id: string) => {
    return deleteWebhookConfigMutation.mutateAsync(id);
  };

  const limparLogs = () => {
    return clearLogsMutation.mutateAsync();
  };

  return {
    webhookConfigs,
    webhookLogs,
    isLoading: isLoadingConfigs || isLoadingLogs,
    createWebhookConfig,
    updateWebhookConfig,
    deleteWebhookConfig,
    limparLogs,
    getWebhookConfigByCourse,
    getWebhookStats,
    getLogsByCourse,
    getWebhookUrl,
  };
}

export const platforms = [
  { value: 'hotmart', label: 'Hotmart', color: '#F26522' },
  { value: 'kiwify', label: 'Kiwify', color: '#00C1A4' },
  { value: 'cakto', label: 'Cakto', color: '#7C3AED' },
  { value: 'outro', label: 'Outra', color: '#6B7280' },
] as const;
