import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PlatformSettings {
  platformName: string;
  logo: string | null;
  favicon: string | null;
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  welcomeMessage: string;
  footerText: string;
  supportEmail: string;
  googleAnalyticsId: string;
  facebookPixelId: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: 'MemberHero',
  logo: null,
  favicon: null,
  primaryColor: '#D4AF37',
  backgroundColor: '#000000',
  surfaceColor: '#0A0A0A',
  textColor: '#FFFFFF',
  welcomeMessage: 'Bem-vindo à sua área de membros!',
  footerText: '© 2024 MemberHero. Todos os direitos reservados.',
  supportEmail: 'suporte@memberhero.com',
  googleAnalyticsId: '',
  facebookPixelId: '',
  maintenanceMode: false,
  allowRegistration: true,
};

export function useSupabaseSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'platform_settings')
        .maybeSingle() as any);

      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;

      const value = (data as any).value as Record<string, any>;
      return { ...DEFAULT_SETTINGS, ...value } as PlatformSettings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<PlatformSettings>) => {
      const currentSettings = settings || DEFAULT_SETTINGS;
      const newSettings = { ...currentSettings, ...updates };

      const { error } = await (supabase
        .from('app_settings' as any)
        .upsert({
          key: 'platform_settings',
          value: newSettings,
        }, {
          onConflict: 'key',
        }) as any);

      if (error) throw error;
      return newSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
      });
    },
  });

  const resetToDefaults = () => {
    updateMutation.mutate(DEFAULT_SETTINGS);
  };

  const exportSettings = (): string => {
    const currentSettings = settings || DEFAULT_SETTINGS;
    return JSON.stringify(currentSettings, null, 2);
  };

  const importSettings = (json: string): boolean => {
    try {
      const imported = JSON.parse(json) as PlatformSettings;
      updateMutation.mutate({ ...DEFAULT_SETTINGS, ...imported });
      return true;
    } catch {
      toast({
        variant: 'destructive',
        title: 'Erro ao importar',
        description: 'JSON inválido',
      });
      return false;
    }
  };

  return {
    settings,
    isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    resetToDefaults,
    exportSettings,
    importSettings,
    DEFAULT_SETTINGS,
  };
}
