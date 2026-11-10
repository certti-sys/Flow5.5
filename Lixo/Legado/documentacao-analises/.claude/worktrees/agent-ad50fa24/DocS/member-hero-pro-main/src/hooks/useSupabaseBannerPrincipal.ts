import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { uploadFile } from '@/utils/uploadToStorage';
import { useEffect } from 'react';

export interface BannerPrincipal {
  imagemUrl: string | null;
  exibir: boolean;
  aspectRatio: string;
  objectFit: 'cover' | 'contain';
  larguraOriginal?: number;
  alturaOriginal?: number;
}

const DEFAULT_BANNER: BannerPrincipal = {
  imagemUrl: null,
  exibir: true,
  aspectRatio: '21/9',
  objectFit: 'cover',
};

export function useSupabaseBannerPrincipal() {
  const queryClient = useQueryClient();

  const { data: banner = DEFAULT_BANNER, isLoading } = useQuery({
    queryKey: ['banner-principal'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('showcase_settings')
        .select('value')
        .eq('key', 'banner_principal')
        .single();
      
      if (error || !data) return DEFAULT_BANNER;
      
      const parsedValue = typeof data.value === 'object' && data.value !== null 
        ? data.value as Record<string, unknown>
        : {};
      
      return { ...DEFAULT_BANNER, ...parsedValue } as BannerPrincipal;
    },
    staleTime: 1000 * 60, // 1 minuto
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('banner-principal-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'showcase_settings', filter: 'key=eq.banner_principal' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['banner-principal'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<BannerPrincipal>) => {
      const newBanner = { ...banner, ...updates };
      const { error } = await supabase
        .from('showcase_settings')
        .upsert({ 
          key: 'banner_principal', 
          value: newBanner, 
          updated_at: new Date().toISOString() 
        }, { 
          onConflict: 'key' 
        });
      
      if (error) throw error;
      return newBanner;
    },
    onSuccess: (newBanner) => {
      queryClient.setQueryData(['banner-principal'], newBanner);
    },
  });

  const uploadBanner = async (file: File): Promise<string> => {
    // Upload para o storage do Supabase
    const imageUrl = await uploadFile(file, 'banners');
    
    // Detectar dimensões da imagem
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = async () => {
        const largura = img.width;
        const altura = img.height;
        
        // Atualizar com a nova imagem e dimensões (mas não salva ainda)
        await updateMutation.mutateAsync({
          imagemUrl: imageUrl,
          larguraOriginal: largura,
          alturaOriginal: altura,
          aspectRatio: '21/9',
          objectFit: banner.objectFit || 'cover',
        });
        
        resolve(imageUrl);
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  const removeBanner = async () => {
    await updateMutation.mutateAsync({
      imagemUrl: null,
      larguraOriginal: undefined,
      alturaOriginal: undefined,
    });
  };

  const toggleExibir = async () => {
    await updateMutation.mutateAsync({
      exibir: !banner.exibir,
    });
  };

  const updateBanner = async (updates: Partial<BannerPrincipal>) => {
    await updateMutation.mutateAsync(updates);
  };

  return {
    banner,
    isLoading,
    uploadBanner,
    removeBanner,
    toggleExibir,
    updateBanner,
    isSaving: updateMutation.isPending,
  };
}
