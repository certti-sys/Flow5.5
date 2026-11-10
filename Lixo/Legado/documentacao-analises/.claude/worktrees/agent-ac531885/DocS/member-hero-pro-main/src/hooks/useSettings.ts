import { useLocalStorage } from './useLocalStorage';
import { useSupabaseSettings } from './useSupabaseSettings';
import { shouldUseDatabase } from '@/config/dataSource';

export interface PlatformSettings {
  // Identidade Visual
  platformName: string;
  logo: string | null;
  favicon: string | null;
  
  // Cores Personalizadas
  primaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
  
  // Configurações Gerais
  welcomeMessage: string;
  footerText: string;
  supportEmail: string;
  
  // Integrações
  googleAnalyticsId: string;
  facebookPixelId: string;
  
  // Avançado
  maintenanceMode: boolean;
  allowRegistration: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  // Identidade Visual
  platformName: 'MemberHero',
  logo: null,
  favicon: null,
  
  // Cores Personalizadas (Dark Premium + Gold)
  primaryColor: '#D4AF37',
  backgroundColor: '#000000',
  surfaceColor: '#0A0A0A',
  textColor: '#FFFFFF',
  
  // Configurações Gerais
  welcomeMessage: 'Bem-vindo à sua área de membros!',
  footerText: '© 2024 MemberHero. Todos os direitos reservados.',
  supportEmail: 'suporte@memberhero.com',
  
  // Integrações
  googleAnalyticsId: '',
  facebookPixelId: '',
  
  // Avançado
  maintenanceMode: false,
  allowRegistration: true,
};

// Hook original do localStorage (mantido como fallback)
function useLocalStorageSettings() {
  const [settings, setSettings] = useLocalStorage<PlatformSettings>(
    'memberhero_settings',
    DEFAULT_SETTINGS
  );

  const updateSettings = (partial: Partial<PlatformSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  const exportSettings = (): string => {
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (json: string): boolean => {
    try {
      const imported = JSON.parse(json) as PlatformSettings;
      setSettings({ ...DEFAULT_SETTINGS, ...imported });
      return true;
    } catch {
      return false;
    }
  };

  return {
    settings,
    isLoading: false,
    isUpdating: false,
    updateSettings,
    resetToDefaults,
    exportSettings,
    importSettings,
    DEFAULT_SETTINGS,
  };
}

// Hook híbrido que escolhe a fonte baseado na flag
export function useSettings() {
  const localStorage = useLocalStorageSettings();
  const supabase = useSupabaseSettings();

  // Se deve usar banco e dados estão disponíveis
  if (shouldUseDatabase() && !supabase.isLoading) {
    return {
      settings: supabase.settings || localStorage.settings,
      isLoading: supabase.isLoading,
      isUpdating: supabase.isUpdating,
      updateSettings: supabase.updateSettings,
      resetToDefaults: supabase.resetToDefaults,
      exportSettings: supabase.exportSettings,
      importSettings: supabase.importSettings,
      DEFAULT_SETTINGS,
    };
  }

  // Fallback para localStorage
  return localStorage;
}
