import { useLocalStorage } from './useLocalStorage';
import { useSupabaseCardsSettings } from './useSupabaseCardsSettings';
import { shouldUseDatabase } from '@/config/dataSource';

export interface CardsSettings {
  exibirTitulo: boolean;
  exibirDescricao: boolean;
  exibirCategoria: boolean;
  mostrarProgresso: boolean;
  mostrarCadeado: boolean;
  efeitoHover: boolean;
  limiteGlobal: number;
  mostrarBorda: boolean;
  opacidadeGradienteCard: number;
  opacidadeGradienteVitrine: number;
}

const CARDS_SETTINGS_KEY = 'mh_cards_settings';

const DEFAULT_SETTINGS: CardsSettings = {
  exibirTitulo: true,
  exibirDescricao: true,
  exibirCategoria: true,
  mostrarProgresso: true,
  mostrarCadeado: true,
  efeitoHover: true,
  limiteGlobal: 20,
  mostrarBorda: true,
  opacidadeGradienteCard: 60,
  opacidadeGradienteVitrine: 80,
};

// Hook original do localStorage (mantido como fallback)
function useLocalStorageCardsSettings() {
  const [settings, setSettings] = useLocalStorage<CardsSettings>(
    CARDS_SETTINGS_KEY,
    DEFAULT_SETTINGS
  );

  const updateSettings = (updates: Partial<CardsSettings>) => {
    setSettings({
      ...settings,
      ...updates,
    });
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  return {
    settings,
    isLoading: false,
    updateSettings,
    resetSettings,
  };
}

// Hook híbrido que escolhe a fonte baseado na flag
export function useCardsSettings() {
  const localStorage = useLocalStorageCardsSettings();
  const supabase = useSupabaseCardsSettings();

  // Se deve usar banco e dados estão disponíveis
  if (shouldUseDatabase() && !supabase.isLoading) {
    return {
      settings: supabase.settings || localStorage.settings,
      isLoading: supabase.isLoading,
      updateSettings: supabase.updateSettings,
      resetSettings: supabase.resetSettings,
    };
  }

  // Fallback para localStorage
  return localStorage;
}
