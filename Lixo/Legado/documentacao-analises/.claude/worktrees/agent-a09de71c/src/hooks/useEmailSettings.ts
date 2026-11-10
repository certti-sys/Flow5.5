import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface EmailSettings {
  id: string;
  provider: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_password: string | null;
  smtp_secure: boolean | null;
  brevo_api_key: string | null;
  from_email: string;
  from_name: string;
  welcome_subject: string | null;
  welcome_template: string | null;
  template_colors: Record<string, any> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmailLog {
  id: string;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  email_type: string;
  provider: string;
  status: string;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: string | null;
}

export function useEmailSettings() {
  const queryClient = useQueryClient();

  // Buscar configurações ativas
  const {
    data: settings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_settings")
        .select("*")
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return data as EmailSettings | null;
    },
  });

  // Atualizar ou criar configurações
  const updateMutation = useMutation({
    mutationFn: async (newSettings: Partial<EmailSettings>) => {
      if (settings?.id) {
        // Atualizar existente
        const { data, error } = await supabase
          .from("email_settings")
          .update({
            ...newSettings,
            updated_at: new Date().toISOString(),
          })
          .eq("id", settings.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Criar novo
        const { data, error } = await supabase
          .from("email_settings")
          .insert({
            ...newSettings,
            is_active: true,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: any) => {
      toast.error(`Erro ao salvar: ${error.message}`);
    },
  });

  // Testar conexão SMTP
  const testSMTPMutation = useMutation({
    mutationFn: async (testSettings: Partial<EmailSettings> & { testRecipient?: string }) => {
      // Primeiro salvar as configurações (sem testRecipient)
      const { testRecipient, ...settingsToSave } = testSettings;
      await updateMutation.mutateAsync(settingsToSave);

      // Depois enviar email de teste para o destinatário especificado
      const recipientEmail = testRecipient || testSettings.from_email;
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: recipientEmail,
          toName: "Teste",
          type: "custom",
          subject: "Teste de Configuração de Email",
          html: `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2>✅ Teste de Email Bem-Sucedido!</h2>
              <p>Se você está vendo esta mensagem, a configuração de email está funcionando corretamente.</p>
              <p><strong>Provedor:</strong> ${testSettings.provider}</p>
              <p><strong>Remetente:</strong> ${testSettings.from_name} &lt;${testSettings.from_email}&gt;</p>
              <p><strong>Data:</strong> ${new Date().toLocaleString("pt-BR")}</p>
            </div>
          `,
          variables: {},
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Email de teste enviado! Verifique a caixa de entrada do destinatário.");
    },
    onError: (error: any) => {
      toast.error(`Erro no teste: ${error.message}`);
    },
  });

  // Enviar email personalizado
  const sendEmailMutation = useMutation({
    mutationFn: async (emailData: {
      to: string;
      toName?: string;
      type: "welcome" | "notification" | "custom";
      subject?: string;
      html?: string;
      variables?: Record<string, string>;
    }) => {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: emailData,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs"] });
    },
  });

  return {
    settings,
    isLoading,
    error,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    testConnection: testSMTPMutation.mutate,
    isTesting: testSMTPMutation.isPending,
    sendEmail: sendEmailMutation.mutateAsync,
    isSending: sendEmailMutation.isPending,
  };
}

export function useEmailLogs(filters?: {
  status?: string;
  type?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["email-logs", filters],
    queryFn: async () => {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      if (filters?.type) {
        query = query.eq("email_type", filters.type);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      } else {
        query = query.limit(100);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as EmailLog[];
    },
  });
}
