import { useState, useEffect } from 'react';
import { dispatchStorageSync, useStorageSync } from './useStorageSync';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Função para ler do localStorage com merge de valores
  const readValue = (): T => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Fazer merge com initialValue para garantir que novas propriedades existam
        if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)) {
          return { ...initialValue, ...parsed };
        }
        return parsed;
      }
      return initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Re-sincronizar ao montar o componente para garantir valor atualizado
  useEffect(() => {
    setStoredValue(readValue());
  }, [key]);

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      
      // Disparar evento customizado para sincronização na mesma aba
      dispatchStorageSync(key);
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  // Escutar mudanças tanto do storage nativo quanto do evento customizado
  useStorageSync(key, () => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        // Fazer merge com initialValue para garantir que novas propriedades existam
        if (typeof initialValue === 'object' && initialValue !== null && !Array.isArray(initialValue)) {
          setStoredValue({ ...initialValue, ...parsed } as T);
        } else {
          setStoredValue(parsed);
        }
      }
    } catch (error) {
      console.error(`Error syncing localStorage key "${key}":`, error);
    }
  });

  return [storedValue, setValue];
}
