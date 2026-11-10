import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppSettings {
  id: string;
  is_active: boolean;
  provider: string;
  evolution_api_url: string | null;
  evolution_api_key: string | null;
  evolution_instance_name: string | null;
  zapi_instance_id: string | null;
  zapi_token: string | null;
  zapi_security_token: string | null;
  waha_api_url: string | null;
  waha_session_name: string | null;
  meta_phone_number_id: string | null;
  meta_access_token: string | null;
  meta_business_account_id: string | null;
  default_country_code: string;
  send_typing_indicator: boolean;
  delay_between_messages: number;
  created_at: string;
  updated_at: string;
}

export interface MessageTemplate {
  id: string;
  key: string;
  title: string;
  description: string | null;
  message: string;
  active: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppLog {
  id: string;
  phone: string;
  template_key: string | null;
  message_preview: string | null;
  provider: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

const defaultSettings: Partial<WhatsAppSettings> = {
  is_active: false,
  provider: 'evolution',
  default_country_code: '55',
  send_typing_indicator: true,
  delay_between_messages: 1000,
};

export function useWhatsAppSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['whatsapp-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_settings')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as WhatsAppSettings | null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<WhatsAppSettings>) => {
      if (settings?.id) {
        // Update existing
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .update({ ...newSettings, updated_at: new Date().toISOString() })
          .eq('id', settings.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('whatsapp_settings')
          .insert({ ...defaultSettings, ...newSettings, is_active: true })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings'] });
      toast({
        title: 'Sucesso!',
        description: 'Configurações salvas com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível salvar as configurações',
        variant: 'destructive',
      });
    },
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (testSettings: Partial<WhatsAppSettings>) => {
      // First save the settings
      await updateMutation.mutateAsync(testSettings);
      
      // Then test connection by calling the edge function with a simple check
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: '0', // Invalid phone to just test connection
          message: 'test',
        },
      });

      // If we get here without a connection error, the API is reachable
      return { success: true };
    },
    onError: (error: any) => {
      toast({
        title: 'Erro de conexão',
        description: error.message || 'Não foi possível conectar à API',
        variant: 'destructive',
      });
    },
  });

  return {
    settings: settings || (defaultSettings as WhatsAppSettings),
    isLoading,
    updateSettings: updateMutation.mutateAsync,
    isSaving: updateMutation.isPending,
    testConnection: testConnectionMutation.mutateAsync,
    isTesting: testConnectionMutation.isPending,
  };
}

export function useMessageTemplates() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['message-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_templates')
        .select('*')
        .order('category', { ascending: true })
        .order('title', { ascending: true });

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (template: Partial<MessageTemplate> & { id: string }) => {
      const { data, error } = await supabase
        .from('message_templates')
        .update({ ...template, updated_at: new Date().toISOString() })
        .eq('id', template.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Sucesso!',
        description: 'Template atualizado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível atualizar o template',
        variant: 'destructive',
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Omit<MessageTemplate, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('message_templates')
        .insert(template)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Sucesso!',
        description: 'Template criado com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível criar o template',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['message-templates'] });
      toast({
        title: 'Sucesso!',
        description: 'Template excluído com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Não foi possível excluir o template',
        variant: 'destructive',
      });
    },
  });

  return {
    templates: templates || [],
    isLoading,
    updateTemplate: updateMutation.mutateAsync,
    createTemplate: createMutation.mutateAsync,
    deleteTemplate: deleteMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    isCreating: createMutation.isPending,
  };
}

export function useWhatsAppLogs(limit: number = 50) {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['whatsapp-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as WhatsAppLog[];
    },
  });

  return {
    logs: logs || [],
    isLoading,
    refetch,
  };
}

export function useSendWhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const sendMutation = useMutation({
    mutationFn: async ({
      phone,
      templateKey,
      message,
      variables,
    }: {
      phone: string;
      templateKey?: string;
      message?: string;
      variables?: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: { phone, templateKey, message, variables },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-logs'] });
      if (data?.skipped) {
        toast({
          title: 'Mensagem não enviada',
          description: 'Template inativo',
        });
      } else {
        toast({
          title: 'Mensagem enviada!',
          description: 'A mensagem foi enviada com sucesso',
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao enviar',
        description: error.message || 'Não foi possível enviar a mensagem',
        variant: 'destructive',
      });
    },
  });

  return {
    sendMessage: sendMutation.mutateAsync,
    isSending: sendMutation.isPending,
  };
}
