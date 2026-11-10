/**
 * Provider de Sincronização em Background
 * 
 * Este componente deve ser adicionado no nível do App para habilitar
 * a sincronização automática do localStorage para o Supabase.
 * 
 * NÃO altera nenhuma lógica existente - apenas observa e sincroniza.
 */

import { useEffect, useRef } from 'react';
import { useSyncToSupabase } from '@/hooks/useSyncToSupabase';

interface BackgroundSyncProviderProps {
  children: React.ReactNode;
  enabled?: boolean;
  showLogs?: boolean;
}

export function BackgroundSyncProvider({
  children,
  enabled = true,
  showLogs = false,
}: BackgroundSyncProviderProps) {
  const hasInitialized = useRef(false);

  const { syncAll, isEnabled } = useSyncToSupabase({
    enabled,
    debounceMs: 2000,
    onSyncComplete: (key) => {
      if (showLogs) {
        console.log(`[BackgroundSync] Synced: ${key}`);
      }
    },
    onSyncError: (key, error) => {
      if (showLogs) {
        console.warn(`[BackgroundSync] Error syncing ${key}:`, error.message);
      }
    },
  });

  // Sincronização inicial ao montar (opcional)
  useEffect(() => {
    if (!isEnabled || hasInitialized.current) return;
    hasInitialized.current = true;

    // Atrasa a sincronização inicial para não competir com a renderização
    const timer = setTimeout(() => {
      if (showLogs) {
        console.log('[BackgroundSync] Starting initial sync...');
      }
      syncAll();
    }, 5000);

    return () => clearTimeout(timer);
  }, [isEnabled, syncAll, showLogs]);

  return <>{children}</>;
}

export default BackgroundSyncProvider;
