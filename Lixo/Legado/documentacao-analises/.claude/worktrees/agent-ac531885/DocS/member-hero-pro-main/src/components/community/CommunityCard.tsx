import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CommunityItem {
  id: string;
  titulo: string;
  descricao?: string;
  imagem: string | null;
  tipo: string;
}

interface CommunityCardProps {
  item: CommunityItem;
  isLocked: boolean;
  onItemClick: () => void;
  onBuyClick: () => void;
}

export function CommunityCard({ item, isLocked, onItemClick, onBuyClick }: CommunityCardProps) {
  return (
    <div 
      className={cn(
        "relative group cursor-pointer transition-all duration-300 hover:scale-105",
        "aspect-[2/3] w-[280px] flex-shrink-0"
      )}
      onClick={isLocked ? undefined : onItemClick}
    >
      {/* Card Container */}
      <div className="relative w-full h-full rounded-xl overflow-hidden glass-card border border-border/50">
        {/* Image */}
        <div className="absolute inset-0">
          {item.imagem ? (
            <img 
              src={item.imagem} 
              alt={item.titulo}
              className={cn(
                "w-full h-full object-cover",
                isLocked && "blur-sm"
              )}
            />
          ) : (
            <div className={cn(
              "w-full h-full bg-gradient-to-br from-primary/20 to-primary/5",
              isLocked && "blur-sm"
            )} />
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute inset-0 backdrop-blur-[2px] bg-black/40 flex flex-col items-center justify-center gap-4 p-6">
            <div className="w-16 h-16 rounded-full glass-card border border-border/50 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Conteúdo não liberado
            </p>
            <Button 
              onClick={(e) => {
                e.stopPropagation();
                onBuyClick();
              }}
              className="bg-primary hover:bg-primary/90 text-background font-semibold"
            >
              Adquirir Acesso
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="text-lg font-bold text-white mb-1 line-clamp-2">
            {item.titulo}
          </h3>
          {item.descricao && (
            <p className="text-sm text-white/70 line-clamp-2">
              {item.descricao}
            </p>
          )}
        </div>

        {/* Hover Effect */}
        {!isLocked && (
          <div className="absolute inset-0 border-2 border-primary/0 group-hover:border-primary/50 rounded-xl transition-all duration-300" />
        )}
      </div>
    </div>
  );
}
