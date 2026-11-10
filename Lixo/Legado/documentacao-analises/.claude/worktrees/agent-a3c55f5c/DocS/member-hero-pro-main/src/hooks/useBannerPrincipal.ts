import { useLocalStorage } from './useLocalStorage';
import { useSupabaseBannerPrincipal } from './useSupabaseBannerPrincipal';
import { shouldUseDatabase } from '@/config/dataSource';

export interface BannerPrincipal {
  imagemUrl: string | null;
  imagemBase64?: string;
  exibir: boolean;
  aspectRatio: string;
  objectFit: 'cover' | 'contain';
  larguraOriginal?: number;
  alturaOriginal?: number;
}

const BANNER_KEY = 'mh_banner_principal';

const DEFAULT_BANNER: BannerPrincipal = {
  imagemUrl: null,
  exibir: true,
  aspectRatio: '21/9',
  objectFit: 'cover',
};

// Hook original do localStorage (mantido como fallback)
function useLocalStorageBannerPrincipal() {
  const [banner, setBanner] = useLocalStorage<BannerPrincipal>(
    BANNER_KEY,
    DEFAULT_BANNER
  );

  const uploadBanner = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        
        const img = new Image();
        img.onload = () => {
          const largura = img.width;
          const altura = img.height;
          
          setBanner({
            ...banner,
            imagemUrl: base64,
            imagemBase64: base64,
            larguraOriginal: largura,
            alturaOriginal: altura,
            aspectRatio: '21/9',
            objectFit: banner.objectFit || 'cover',
          });
          resolve(base64);
        };
        img.onerror = reject;
        img.src = base64;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeBanner = () => {
    setBanner({
      ...banner,
      imagemUrl: null,
      imagemBase64: undefined,
    });
  };

  const toggleExibir = () => {
    setBanner({
      ...banner,
      exibir: !banner.exibir,
    });
  };

  const updateBanner = (updates: Partial<BannerPrincipal>) => {
    setBanner({
      ...banner,
      ...updates,
    });
  };

  return {
    banner,
    isLoading: false,
    isSaving: false,
    uploadBanner,
    removeBanner,
    toggleExibir,
    updateBanner,
  };
}

// Hook híbrido que escolhe a fonte baseado na flag
export function useBannerPrincipal() {
  const localStorage = useLocalStorageBannerPrincipal();
  const supabase = useSupabaseBannerPrincipal();

  // Se deve usar banco e dados estão disponíveis
  if (shouldUseDatabase() && !supabase.isLoading) {
    return {
      banner: supabase.banner || localStorage.banner,
      isLoading: supabase.isLoading,
      isSaving: supabase.isSaving,
      uploadBanner: supabase.uploadBanner,
      removeBanner: supabase.removeBanner,
      toggleExibir: supabase.toggleExibir,
      updateBanner: supabase.updateBanner,
    };
  }

  // Fallback para localStorage
  return localStorage;
}
