// Re-export do hook Supabase
export * from './useSupabaseCommunity';
export { useSupabaseCommunity as useCommunity } from './useSupabaseCommunity';

// Interfaces mantidas para compatibilidade com componentes existentes
export interface CommunitySection {
  id: string;
  nome: string;
  tipo: 'avisos' | 'encontros' | 'materiais' | 'projetos' | 'feed' | 'trilhas' | 'replays' | 'desafios';
  ordem: number;
  ativo: boolean;
  limite: number;
}

export interface CommunityShelf {
  id: string;
  titulo: string;
  tipo: 'trilhas' | 'materiais' | 'replays' | 'desafios' | 'manual';
  ordem: number;
  ativo: boolean;
  itensIds: string[];
}
