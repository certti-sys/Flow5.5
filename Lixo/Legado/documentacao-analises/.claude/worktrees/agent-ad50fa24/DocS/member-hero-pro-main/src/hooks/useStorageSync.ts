import { useEffect } from 'react';

// Nome do evento customizado para sincronização
export const STORAGE_SYNC_EVENT = 'storage-sync';

// Função para disparar evento de sincronização
export const dispatchStorageSync = (key: string) => {
  window.dispatchEvent(new CustomEvent(STORAGE_SYNC_EVENT, { detail: { key } }));
};

// Hook para escutar mudanças no storage (mesmo na mesma aba)
export function useStorageSync(key: string, callback: () => void) {
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.key === key) {
        callback();
      }
    };

    window.addEventListener(STORAGE_SYNC_EVENT, handleSync);
    
    // Também escuta o evento storage nativo (outras abas)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        callback();
      }
    };
    
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(STORAGE_SYNC_EVENT, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [key, callback]);
}
