import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CourseAccessMap {
  [courseId: string]: boolean;
}

/**
 * Cache de acesso por usuário.
 *
 * Antes era uma chave só (`courseAccessMap`) com `true` e `false`, compartilhada
 * entre contas do mesmo navegador. Guardar `false` era o pior detalhe: uma falha
 * momentânea na checagem (token vencido, 403 de CSRF, 429, rede) marcava todos os
 * cursos como bloqueados e o navegador repetia isso até uma resposta boa. Agora
 * o cache só lembra do que foi concedido e é separado por usuário.
 */
const LEGACY_CACHE_KEY = 'courseAccessMap';

const cacheKey = (userId: string) => `courseAccessMap:${userId}`;

const readCache = (userId: string | null): CourseAccessMap => {
  if (!userId) return {};
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const map: CourseAccessMap = {};
    Object.entries(parsed).forEach(([courseId, value]) => {
      if (value === true) map[courseId] = true;
    });
    return map;
  } catch {
    return {};
  }
};

const writeCache = (userId: string, map: CourseAccessMap) => {
  try {
    const granted: CourseAccessMap = {};
    Object.entries(map).forEach(([courseId, value]) => {
      if (value === true) granted[courseId] = true;
    });
    localStorage.setItem(cacheKey(userId), JSON.stringify(granted));
  } catch {
    // localStorage indisponível: segue sem cache
  }
};

const dropLegacyCache = () => {
  try {
    localStorage.removeItem(LEGACY_CACHE_KEY);
  } catch {
    // localStorage indisponível
  }
};

/**
 * Consulta a edge function de acesso. Um token vencido no meio da sessão dava
 * 401 e virava "sem acesso"; aqui renovamos a sessão e tentamos uma vez mais.
 */
const requestAccessMap = async (courseIds: string[]): Promise<CourseAccessMap> => {
  const invoke = () =>
    supabase.functions.invoke('check-course-access', { body: { courseIds } });

  let { data, error } = await invoke();

  if (error || !data?.accessMap) {
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) throw refreshError;
    ({ data, error } = await invoke());
  }

  if (error) throw error;
  if (!data?.accessMap) throw new Error('check-course-access sem accessMap');
  return data.accessMap as CourseAccessMap;
};

export const useCourseAccess = (courseIds: string[]) => {
  const { user } = useAuth();

  // Começa com o que já foi concedido (evita flash de card bloqueado)
  const [accessMap, setAccessMap] = useState<CourseAccessMap>(() => readCache(user?.id ?? null));
  const [loading, setLoading] = useState(true);
  // failed = não deu para verificar. Nunca significa "sem acesso".
  const [failed, setFailed] = useState(false);

  const idsKey = courseIds.join(',');

  useEffect(() => {
    let cancelled = false;
    dropLegacyCache();

    const list = idsKey ? idsKey.split(',') : [];

    const checkAccess = async () => {
      if (list.length === 0) {
        if (!cancelled) {
          setAccessMap({});
          setLoading(false);
        }
        return;
      }

      // Sessão ainda carregando: não decide nada (antes marcava tudo bloqueado)
      if (!user) return;

      setLoading(true);
      setFailed(false);

      try {
        const map = await requestAccessMap(list);
        if (cancelled) return;
        setAccessMap(map);
        writeCache(user.id, map);
      } catch (err) {
        if (cancelled) return;
        // Falha não é negação: mantém o mapa anterior e não grava nada
        console.error('Error checking course access:', err);
        setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [idsKey, user?.id]);

  return { accessMap, loading, failed };
};
