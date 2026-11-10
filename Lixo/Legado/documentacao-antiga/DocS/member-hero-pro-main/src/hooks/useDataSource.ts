import { useState, useEffect, useCallback } from 'react';
import { shouldUseDatabase, readFromLocalStorage } from '@/config/dataSource';

/**
 * Hook híbrido para leitura de dados com fallback automático
 * 
 * Se USE_DATABASE = true e validação passou:
 *   1. Tenta ler do Supabase
 *   2. Se falhar, usa localStorage silenciosamente
 * 
 * Se USE_DATABASE = false:
 *   1. Lê apenas do localStorage
 * 
 * IMPORTANTE: Nunca quebra o fluxo do usuário
 */
export function useDataWithFallback<T>(
  supabaseQueryFn: () => Promise<T>,
  localStorageKey: string,
  defaultValue: T
): {
  data: T;
  isLoading: boolean;
  source: 'database' | 'localStorage';
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [source, setSource] = useState<'database' | 'localStorage'>('localStorage');
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    // Se não deve usar banco, lê direto do localStorage
    if (!shouldUseDatabase()) {
      try {
        const localData = readFromLocalStorage<T>(localStorageKey, defaultValue);
        setData(localData);
        setSource('localStorage');
      } catch (err) {
        console.warn('[useDataSource] Erro ao ler localStorage:', err);
        setData(defaultValue);
      }
      setIsLoading(false);
      return;
    }

    // Tenta ler do banco com fallback para localStorage
    try {
      const dbData = await supabaseQueryFn();
      setData(dbData);
      setSource('database');
    } catch (err) {
      // FALLBACK SILENCIOSO - não quebra fluxo do usuário
      console.warn('[useDataSource] Fallback para localStorage:', err);
      
      try {
        const localData = readFromLocalStorage<T>(localStorageKey, defaultValue);
        setData(localData);
        setSource('localStorage');
        setError(err instanceof Error ? err : new Error('Erro ao buscar dados'));
      } catch (localErr) {
        console.warn('[useDataSource] Erro ao ler localStorage:', localErr);
        setData(defaultValue);
        setSource('localStorage');
      }
    }

    setIsLoading(false);
  }, [supabaseQueryFn, localStorageKey, defaultValue]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    source,
    error,
    refetch: fetchData,
  };
}

/**
 * Wrapper para adicionar fallback silencioso em queries existentes do React Query
 */
export async function withLocalStorageFallback<T>(
  queryFn: () => Promise<T>,
  localStorageKey: string,
  defaultValue: T
): Promise<T> {
  // Se não deve usar banco, retorna localStorage
  if (!shouldUseDatabase()) {
    return readFromLocalStorage<T>(localStorageKey, defaultValue);
  }

  try {
    return await queryFn();
  } catch (error) {
    // FALLBACK SILENCIOSO
    console.warn(`[withLocalStorageFallback] Fallback para ${localStorageKey}:`, error);
    return readFromLocalStorage<T>(localStorageKey, defaultValue);
  }
}
