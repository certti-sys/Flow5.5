import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

export function useSupabaseNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((n) => ({
        id: n.id,
        tipo: n.tipo as Notification['tipo'],
        titulo: n.titulo,
        mensagem: n.mensagem,
        cursoId: n.curso_id || undefined,
        moduloId: n.modulo_id || undefined,
        aulaId: n.aula_id || undefined,
        lida: n.lida || false,
        criadoEm: n.created_at || new Date().toISOString(),
      }));
    },
  });

  const criarMutation = useMutation({
    mutationFn: async (dados: Omit<Notification, 'id' | 'lida' | 'criadoEm'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          tipo: dados.tipo,
          titulo: dados.titulo,
          mensagem: dados.mensagem,
          curso_id: dados.cursoId,
          modulo_id: dados.moduloId,
          aula_id: dados.aulaId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const marcarComoLidaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const marcarTodasComoLidasMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('notifications')
        .update({ lida: true })
        .eq('user_id', user.id)
        .eq('lida', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const excluirMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const limparTodasMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast({
        title: 'Notificações limpas',
        description: 'Todas as notificações foram removidas.',
      });
    },
  });

  const contarNaoLidas = (): number => {
    return logs.filter((n) => !n.lida).length;
  };

  const obterNaoLidas = (): Notification[] => {
    return logs.filter((n) => !n.lida);
  };

  return {
    notificacoes: logs,
    isLoading,
    criarNotificacao: criarMutation.mutate,
    marcarComoLida: marcarComoLidaMutation.mutate,
    marcarTodasComoLidas: () => marcarTodasComoLidasMutation.mutate(),
    excluirNotificacao: excluirMutation.mutate,
    limparTodas: () => limparTodasMutation.mutate(),
    contarNaoLidas,
    obterNaoLidas,
    carregarNotificacoes: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  };
}

export function criarNotificacaoNovaAula(
  criarNotificacao: (dados: Omit<Notification, 'id' | 'lida' | 'criadoEm'>) => void,
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
