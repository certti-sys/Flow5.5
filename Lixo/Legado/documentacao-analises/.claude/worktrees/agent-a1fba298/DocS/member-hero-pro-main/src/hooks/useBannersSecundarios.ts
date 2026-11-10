import { useLocalStorage } from './useLocalStorage';

export interface BannerSecundario {
  id: string;
  nome?: string;
  imagemUrl: string | null;
  imagemBase64?: string;
  posicao: 'antes' | 'entre' | 'depois';
  tipo: 'estatico' | 'carrossel';
  ativo: boolean;
  ordem: number;
  agendamento: {
    habilitado: boolean;
    dataInicio?: string;
    horaInicio?: string;
    dataFim?: string;
    horaFim?: string;
  };
}

const BANNERS_KEY = 'mh_banners_secundarios';

export function useBannersSecundarios() {
  const [banners, setBanners] = useLocalStorage<BannerSecundario[]>(
    BANNERS_KEY,
    []
  );

  const isBannerAtivo = (banner: BannerSecundario): boolean => {
    if (!banner.ativo) return false;
    if (!banner.agendamento?.habilitado) return true;

    const agora = new Date();

    if (banner.agendamento.dataInicio) {
      const inicio = new Date(
        `${banner.agendamento.dataInicio}T${banner.agendamento.horaInicio || '00:00'}`
      );
      if (agora < inicio) return false;
    }

    if (banner.agendamento.dataFim) {
      const fim = new Date(
        `${banner.agendamento.dataFim}T${banner.agendamento.horaFim || '23:59'}`
      );
      if (agora > fim) return false;
    }

    return true;
  };

  const getBannerStatus = (banner: BannerSecundario): {
    status: 'ativo' | 'agendado' | 'expirado' | 'desativado';
    label: string;
    emoji: string;
  } => {
    if (!banner.ativo) {
      return { status: 'desativado', label: 'Desativado', emoji: '⚫' };
    }

    if (!banner.agendamento?.habilitado) {
      return { status: 'ativo', label: 'Ativo', emoji: '🟢' };
    }

    const agora = new Date();

    if (banner.agendamento.dataInicio) {
      const inicio = new Date(
        `${banner.agendamento.dataInicio}T${banner.agendamento.horaInicio || '00:00'}`
      );
      if (agora < inicio) {
        const dataFormatada = new Date(banner.agendamento.dataInicio).toLocaleDateString('pt-BR');
        return { status: 'agendado', label: `Inicia ${dataFormatada}`, emoji: '🟡' };
      }
    }

    if (banner.agendamento.dataFim) {
      const fim = new Date(
        `${banner.agendamento.dataFim}T${banner.agendamento.horaFim || '23:59'}`
      );
      if (agora > fim) {
        const dataFormatada = new Date(banner.agendamento.dataFim).toLocaleDateString('pt-BR');
        return { status: 'expirado', label: `Terminou ${dataFormatada}`, emoji: '🔴' };
      }
    }

    if (banner.agendamento.dataInicio && banner.agendamento.dataFim) {
      const inicio = new Date(banner.agendamento.dataInicio).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const fim = new Date(banner.agendamento.dataFim).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { status: 'ativo', label: `${inicio} - ${fim}`, emoji: '🟢' };
    }

    return { status: 'ativo', label: 'Ativo', emoji: '🟢' };
  };

  const addBanner = (banner: Omit<BannerSecundario, 'id' | 'ordem'>) => {
    const newBanner: BannerSecundario = {
      ...banner,
      id: crypto.randomUUID(),
      ordem: banners.length + 1,
      agendamento: banner.agendamento || { habilitado: false },
    };
    setBanners([...banners, newBanner]);
    return newBanner;
  };

  const updateBanner = (id: string, updates: Partial<BannerSecundario>) => {
    setBanners(
      banners.map((banner) =>
        banner.id === id ? { ...banner, ...updates } : banner
      )
    );
  };

  const deleteBanner = (id: string) => {
    const filtered = banners.filter((banner) => banner.id !== id);
    const reordered = filtered.map((banner, index) => ({
      ...banner,
      ordem: index + 1,
    }));
    setBanners(reordered);
  };

  const reorderBanners = (newOrder: BannerSecundario[]) => {
    const reordered = newOrder.map((banner, index) => ({
      ...banner,
      ordem: index + 1,
    }));
    setBanners(reordered);
  };

  const uploadBannerImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return {
    banners: banners.sort((a, b) => a.ordem - b.ordem),
    bannersAtivos: banners.filter(isBannerAtivo).sort((a, b) => a.ordem - b.ordem),
    addBanner,
    updateBanner,
    deleteBanner,
    reorderBanners,
    uploadBannerImage,
    isBannerAtivo,
    getBannerStatus,
  };
}
