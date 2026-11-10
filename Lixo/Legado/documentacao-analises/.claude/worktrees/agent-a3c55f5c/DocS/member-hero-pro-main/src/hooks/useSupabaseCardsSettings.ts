import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

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

export function useSupabaseCardsSettings() {
  const queryClient = useQueryClient();

  const { data: settings = DEFAULT_SETTINGS, isLoading } = useQuery({
    queryKey: ['showcase-cards-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('showcase_settings')
        .select('value')
        .eq('key', 'cards_settings')
        .single();
      
      if (error || !data) return DEFAULT_SETTINGS;
      
      // Safe parsing from JSONB
      const parsedValue = typeof data.value === 'object' && data.value !== null 
        ? data.value as Record<string, unknown>
        : {};
      
      return { ...DEFAULT_SETTINGS, ...parsedValue } as CardsSettings;
    },
    staleTime: 1000 * 60, // 1 minuto
  });

  // Real-time subscription para atualizações em tempo real
  useEffect(() => {
    const channel = supabase
      .channel('showcase-settings-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'showcase_settings' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['showcase-cards-settings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const mutation = useMutation({
    mutationFn: async (updates: Partial<CardsSettings>) => {
      const newSettings = { ...settings, ...updates };
      const { error } = await supabase
        .from('showcase_settings')
        .upsert({ 
          key: 'cards_settings',
          value: newSettings, 
          updated_at: new Date().toISOString() 
        }, { 
          onConflict: 'key' 
        });
      
      if (error) throw error;
      return newSettings;
    },
    onSuccess: (newSettings) => {
      queryClient.setQueryData(['showcase-cards-settings'], newSettings);
    },
  });

  const updateSettings = (updates: Partial<CardsSettings>) => {
    mutation.mutate(updates);
  };

  const resetSettings = () => {
    mutation.mutate(DEFAULT_SETTINGS);
  };

  return {
    settings,
    isLoading,
    updateSettings,
    resetSettings,
  };
}
