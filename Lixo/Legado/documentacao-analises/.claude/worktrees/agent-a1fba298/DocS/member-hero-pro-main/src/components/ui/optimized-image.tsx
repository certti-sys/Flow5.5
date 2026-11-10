import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ImageSkeleton } from "./image-skeleton";

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fallback?: React.ReactNode;
  aspectRatio?: "video" | "square" | "portrait" | "auto";
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  className,
  sizes = "100vw",
  priority = false,
  fallback,
  aspectRatio = "auto",
  blurDataURL,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer para lazy loading avançado
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: "50px", // Carrega 50px antes de entrar na viewport
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  // Aspect ratio classes
  const aspectRatioClass = {
    video: "aspect-video",
    square: "aspect-square",
    portrait: "aspect-[3/4]",
    auto: "",
  }[aspectRatio];

  // Renderizar skeleton enquanto carrega
  if (!isInView || (isLoading && !hasError)) {
    return (
      <div
        ref={imgRef}
        className={cn("relative overflow-hidden", aspectRatioClass, className)}
      >
        {blurDataURL && (
          <img
            src={blurDataURL}
            alt=""
            className="absolute inset-0 w-full h-full object-cover image-blur-up"
            aria-hidden="true"
          />
        )}
        {isLoading && <ImageSkeleton aspectRatio={aspectRatio} />}
        {isInView && (
          <img
            src={src}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              isLoading ? "opacity-0" : "opacity-100"
            )}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={priority ? "high" : "auto"}
            sizes={sizes}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    );
  }

  // Renderizar fallback em caso de erro
  if (hasError) {
    return (
      <div
        className={cn(
          "relative overflow-hidden bg-muted flex items-center justify-center",
          aspectRatioClass,
          className
        )}
      >
        {fallback || (
          <div className="text-muted-foreground text-center p-4">
            <svg
              className="w-12 h-12 mx-auto mb-2 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs">Imagem não disponível</p>
          </div>
        )}
      </div>
    );
  }

  // Renderizar imagem otimizada
  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      className={cn("w-full h-full object-cover", className)}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      sizes={sizes}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
