import { Lock, Play } from "lucide-react";
import { Module } from "@/hooks/useModules";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { CourseImageSkeleton } from "@/components/ui/image-skeleton";

interface ModuleCardProps {
  module: Module;
  index: number;
  isLocked: boolean;
  onClick: () => void;
  onBuyClick?: () => void;
}

export function ModuleCard({ module, index, isLocked, onClick, onBuyClick }: ModuleCardProps) {
  return (
    <div
      className={`module-card-glass group relative min-w-[220px] sm:min-w-[260px] md:min-w-[280px] aspect-[16/10] cursor-pointer ${
        isLocked ? "opacity-60" : ""
      }`}
      onClick={isLocked ? onBuyClick : onClick}
    >
      {/* Thumbnail */}
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        {module.imagem ? (
          <OptimizedImage
            src={module.imagem}
            alt={module.nome}
            className={`w-full h-full object-cover ${isLocked ? "blur-sm" : ""}`}
            sizes="(max-width: 640px) 220px, (max-width: 768px) 260px, 280px"
            aspectRatio="video"
            fallback={<CourseImageSkeleton />}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br from-surface to-background ${isLocked ? "blur-sm" : ""}`} />
        )}
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 p-4 flex flex-col justify-end">
        <div className="space-y-1">
          <p className="text-xs text-premium-gold font-medium">
            Módulo {module.ordem || index + 1}
          </p>
          <h3 className="text-white font-semibold text-base line-clamp-2">
            {module.nome}
          </h3>
          {module.descricao && (
            <p className="text-white/70 text-xs line-clamp-2">
              {module.descricao}
            </p>
          )}
        </div>
      </div>

      {/* Lock overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl">
          <div className="text-center space-y-2">
            <Lock className="w-8 h-8 text-premium-gold mx-auto" />
            <p className="text-premium-gold text-sm font-medium">
              Clique para comprar
            </p>
          </div>
        </div>
      )}

      {/* Play icon on hover (only if unlocked) */}
      {!isLocked && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-premium-gold/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-black fill-black ml-1" />
          </div>
        </div>
      )}

      {/* Hover border glow */}
      {!isLocked && (
        <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-premium-gold/30 transition-colors" />
      )}
    </div>
  );
}
