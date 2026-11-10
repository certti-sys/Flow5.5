import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Student {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  status: 'ativo' | 'inativo' | 'bloqueado';
  createdAt: string;
  lastAccessAt: string | null;
  coursesAccess: string[];
  totalProgress: number;
}

export function useStudents() {
  const queryClient = useQueryClient();

  // Buscar alunos do Supabase
  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      // Buscar perfis com role "student"
      const { data: profiles, error: profilesError } = await (supabase
        .from('profiles' as any)
        .select(`
          id,
          user_id,
          name,
          email,
          avatar_url,
          status,
          created_at,
          last_access_at
        `)
        .order('created_at', { ascending: false }) as any);

      if (profilesError) throw profilesError;

      // Buscar roles dos usuários
      const { data: roles, error: rolesError } = await (supabase
        .from('user_roles' as any)
        .select('user_id, role')
        .eq('role', 'student') as any);

      if (rolesError) throw rolesError;

      // Filtrar apenas estudantes
      const studentUserIds = new Set((roles || []).map((r: any) => r.user_id));
      const studentProfiles = (profiles || []).filter((p: any) => studentUserIds.has(p.user_id));

      if (studentProfiles.length === 0) {
        return [];
      }

      const profileUserIds = studentProfiles.map((p: any) => p.user_id);

      // Buscar acessos aos cursos
      const { data: courseAccess, error: accessError } = await (supabase
        .from('course_access' as any)
        .select('user_id, course_id, granted')
        .eq('granted', true)
        .in('user_id', profileUserIds) as any);

      if (accessError) throw accessError;

      // Buscar progresso das aulas
      const { data: progress, error: progressError } = await (supabase
        .from('lesson_progress' as any)
        .select('user_id, completed')
        .in('user_id', profileUserIds) as any);

      if (progressError) throw progressError;

      // Montar dados dos alunos
      return studentProfiles.map((profile: any) => {
        const userAccess = (courseAccess || []).filter((a: any) => a.user_id === profile.user_id);
        const userProgress = (progress || []).filter((p: any) => p.user_id === profile.user_id);
        
        const totalLessons = userProgress.length;
        const completedLessons = userProgress.filter((p: any) => p.completed).length;
        const totalProgress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

        return {
          id: profile.user_id || profile.id,
          name: profile.name || '',
          email: profile.email || '',
          avatar: profile.avatar_url || null,
          status: (profile.status || 'ativo') as 'ativo' | 'inativo' | 'bloqueado',
          createdAt: profile.created_at || new Date().toISOString(),
          lastAccessAt: profile.last_access_at || null,
          coursesAccess: userAccess.map((a: any) => a.course_id),
          totalProgress
        } as Student;
      });
    }
  });

  // Criar aluno
  const criarAlunoMutation = useMutation({
    mutationFn: async (data: Omit<Student, 'id' | 'createdAt' | 'lastAccessAt' | 'totalProgress'>) => {
      // Nota: Criação de aluno requer signup via Supabase Auth
      toast.error('Criação de aluno deve ser feita via sistema de autenticação');
      throw new Error('Use Supabase Auth signup');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    }
  });

  // Editar aluno
  const editarAlunoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Student> }) => {
      const updateData: any = {};
      if (data.name) updateData.name = data.name;
      if (data.status) updateData.status = data.status;
      if (data.avatar !== undefined) updateData.avatar_url = data.avatar;

      const { error } = await (supabase
        .from('profiles' as any)
        .update(updateData)
        .eq('user_id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Aluno atualizado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao atualizar aluno');
    }
  });

  // Excluir aluno
  const excluirAlunoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('profiles' as any)
        .delete()
        .eq('user_id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Aluno excluído com sucesso');
    },
    onError: () => {
      toast.error('Erro ao excluir aluno');
    }
  });

  // Bloquear/Desbloquear aluno
  const toggleBloqueioMutation = useMutation({
    mutationFn: async (id: string) => {
      const student = students.find(s => s.id === id);
      const newStatus = student?.status === 'bloqueado' ? 'ativo' : 'bloqueado';

      const { error } = await (supabase
        .from('profiles' as any)
        .update({ status: newStatus })
        .eq('user_id', id) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Status do aluno atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    }
  });

  // Conceder acesso a curso
  const concederAcessoMutation = useMutation({
    mutationFn: async ({ alunoId, cursoId, expiresAt }: { alunoId: string; cursoId: string; expiresAt?: string | null }) => {
      const { error } = await (supabase
        .from('course_access' as any)
        .upsert({
          user_id: alunoId,
          course_id: cursoId,
          granted: true,
          granted_at: new Date().toISOString(),
          expires_at: expiresAt || null
        }, {
          onConflict: 'user_id,course_id'
        }) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Acesso concedido com sucesso');
    },
    onError: () => {
      toast.error('Erro ao conceder acesso');
    }
  });

  // Revogar acesso a curso
  const revogarAcessoMutation = useMutation({
    mutationFn: async ({ alunoId, cursoId }: { alunoId: string; cursoId: string }) => {
      const { error } = await (supabase
        .from('course_access' as any)
        .update({ granted: false })
        .eq('user_id', alunoId)
        .eq('course_id', cursoId) as any);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Acesso revogado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao revogar acesso');
    }
  });

  // Funções wrapper para manter interface
  const criarAluno = useCallback((data: Omit<Student, 'id' | 'createdAt' | 'lastAccessAt' | 'totalProgress'>) => {
    criarAlunoMutation.mutate(data);
    return null;
  }, [criarAlunoMutation]);

  const editarAluno = useCallback((id: string, data: Partial<Student>) => {
    editarAlunoMutation.mutate({ id, data });
  }, [editarAlunoMutation]);

  const excluirAluno = useCallback((id: string) => {
    excluirAlunoMutation.mutate(id);
  }, [excluirAlunoMutation]);

  const toggleBloqueio = useCallback((id: string) => {
    toggleBloqueioMutation.mutate(id);
  }, [toggleBloqueioMutation, students]);

  const concederAcesso = useCallback((alunoId: string, cursoId: string, expiresAt?: string | null) => {
    concederAcessoMutation.mutate({ alunoId, cursoId, expiresAt });
  }, [concederAcessoMutation]);

  const revogarAcesso = useCallback((alunoId: string, cursoId: string) => {
    revogarAcessoMutation.mutate({ alunoId, cursoId });
  }, [revogarAcessoMutation]);

  // Filtrar alunos
  const filtrarAlunos = useCallback((busca: string, status: string, cursoId?: string) => {
    return students.filter(student => {
      const matchBusca = !busca || 
        student.name.toLowerCase().includes(busca.toLowerCase()) ||
        student.email.toLowerCase().includes(busca.toLowerCase());
      
      const matchStatus = status === 'todos' || student.status === status;
      
      const matchCurso = !cursoId || cursoId === 'todos' || 
        student.coursesAccess.includes(cursoId);
      
      return matchBusca && matchStatus && matchCurso;
    });
  }, [students]);

  // Obter aluno por ID
  const obterAluno = useCallback((id: string) => {
    return students.find(student => student.id === id);
  }, [students]);

  // Estatísticas
  const estatisticas = useMemo(() => ({
    total: students.length,
    ativos: students.filter(s => s.status === 'ativo').length,
    inativos: students.filter(s => s.status === 'inativo').length,
    bloqueados: students.filter(s => s.status === 'bloqueado').length,
    progressoMedio: students.length > 0 
      ? Math.round(students.reduce((acc, s) => acc + s.totalProgress, 0) / students.length)
      : 0
  }), [students]);

  return {
    students,
    isLoading,
    criarAluno,
    editarAluno,
    excluirAluno,
    toggleBloqueio,
    concederAcesso,
    revogarAcesso,
    filtrarAlunos,
    obterAluno,
    estatisticas
  };
}
