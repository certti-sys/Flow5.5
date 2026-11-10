import { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  tipo: 'nova_aula' | 'novo_modulo' | 'curso_atualizado' | 'acesso_liberado';
  titulo: string;
  mensagem: string;
  cursoId?: string;
  moduloId?: string;
  aulaId?: string;
  lida: boolean;
  criadoEm: string;
}

const STORAGE_KEY = 'memberhero_notificacoes';

export function useNotifications() {
  const [notificacoes, setNotificacoes] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const carregarNotificacoes = () => {
    try {
      const dados = localStorage.getItem(STORAGE_KEY);
      if (dados) {
        setNotificacoes(JSON.parse(dados));
      }
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const salvarNotificacoes = (novasNotificacoes: Notification[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novasNotificacoes));
      setNotificacoes(novasNotificacoes);
    } catch (error) {
      console.error('Erro ao salvar notificações:', error);
    }
  };

  const criarNotificacao = (dados: Omit<Notification, 'id' | 'lida' | 'criadoEm'>): Notification => {
    const novaNotificacao: Notification = {
      ...dados,
      id: crypto.randomUUID(),
      lida: false,
      criadoEm: new Date().toISOString(),
    };
    
    const novasNotificacoes = [novaNotificacao, ...notificacoes];
    salvarNotificacoes(novasNotificacoes);
    return novaNotificacao;
  };

  const marcarComoLida = (id: string): boolean => {
    const index = notificacoes.findIndex(n => n.id === id);
    if (index === -1) return false;

    const novasNotificacoes = [...notificacoes];
    novasNotificacoes[index] = { ...novasNotificacoes[index], lida: true };
    salvarNotificacoes(novasNotificacoes);
    return true;
  };

  const marcarTodasComoLidas = (): void => {
    const novasNotificacoes = notificacoes.map(n => ({ ...n, lida: true }));
    salvarNotificacoes(novasNotificacoes);
  };

  const excluirNotificacao = (id: string): boolean => {
    const novasNotificacoes = notificacoes.filter(n => n.id !== id);
    if (novasNotificacoes.length === notificacoes.length) return false;
    salvarNotificacoes(novasNotificacoes);
    return true;
  };

  const limparTodas = (): void => {
    salvarNotificacoes([]);
  };

  const contarNaoLidas = (): number => {
    return notificacoes.filter(n => !n.lida).length;
  };

  const obterNaoLidas = (): Notification[] => {
    return notificacoes.filter(n => !n.lida);
  };

  useEffect(() => {
    carregarNotificacoes();
  }, []);

  return {
    notificacoes,
    isLoading,
    criarNotificacao,
    marcarComoLida,
    marcarTodasComoLidas,
    excluirNotificacao,
    limparTodas,
    contarNaoLidas,
    obterNaoLidas,
    carregarNotificacoes,
  };
}

// Função helper para criar notificação de nova aula
export function criarNotificacaoNovaAula(
  criarNotificacao: (dados: Omit<Notification, 'id' | 'lida' | 'criadoEm'>) => Notification,
  aula: { nome: string; cursoId: string; moduloId: string; id: string },
  cursoNome: string
) {
  return criarNotificacao({
    tipo: 'nova_aula',
    titulo: 'Nova aula disponível!',
    mensagem: `A aula "${aula.nome}" foi adicionada ao curso "${cursoNome}".`,
    cursoId: aula.cursoId,
    moduloId: aula.moduloId,
    aulaId: aula.id,
  });
}
