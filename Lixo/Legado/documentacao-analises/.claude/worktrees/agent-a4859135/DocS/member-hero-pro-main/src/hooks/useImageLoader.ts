import { useState, useEffect, useCallback } from "react";

interface UseImageLoaderOptions {
  src: string;
  priority?: boolean;
}

interface UseImageLoaderReturn {
  isLoading: boolean;
  isLoaded: boolean;
  hasError: boolean;
  load: () => void;
}

// Cache de imagens já carregadas
const imageCache = new Set<string>();

export function useImageLoader({
  src,
  priority = false,
}: UseImageLoaderOptions): UseImageLoaderReturn {
  const [isLoading, setIsLoading] = useState(!imageCache.has(src));
  const [isLoaded, setIsLoaded] = useState(imageCache.has(src));
  const [hasError, setHasError] = useState(false);

  const load = useCallback(() => {
    // Se já está em cache, não precisa carregar
    if (imageCache.has(src)) {
      setIsLoaded(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const img = new Image();

    img.onload = () => {
      setIsLoading(false);
      setIsLoaded(true);
      imageCache.add(src);
    };

    img.onerror = () => {
      setIsLoading(false);
      setHasError(true);
    };

    img.src = src;
  }, [src]);

  useEffect(() => {
    if (priority) {
      load();
    }
  }, [priority, load]);

  return {
    isLoading,
    isLoaded,
    hasError,
    load,
  };
}

// Função para preload de imagens críticas
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      resolve();
      return;
    }

    const img = new Image();
    img.onload = () => {
      imageCache.add(src);
      resolve();
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Função para preload de múltiplas imagens
export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}
