import { cn } from "@/lib/utils";

interface CarouselIndicatorsProps {
  totalItems: number;
  activeIndex: number;
  itemsPerView: number;
  className?: string;
}

export const CarouselIndicators = ({
  totalItems,
  activeIndex,
  itemsPerView,
  className,
}: CarouselIndicatorsProps) => {
  const totalPages = Math.ceil(totalItems / itemsPerView);
  
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex justify-center gap-2 sm:gap-2 mt-4 py-2", className)}>
      {Array.from({ length: totalPages }).map((_, index) => (
        <button
          key={index}
          className={cn(
            // Anima só largura/cor: `transition-all` também animava o layout
            // inteiro do indicador a cada página.
            "rounded-full transition-[width,background-color] duration-fast ease-smooth-out touch-manipulation",
            index === activeIndex
              ? "w-8 sm:w-8 h-2 sm:h-1.5 bg-primary"
              : "w-2 sm:w-1.5 h-2 sm:h-1.5 bg-muted-foreground/30"
          )}
          aria-label={`Ir para página ${index + 1}`}
        />
      ))}
    </div>
  );
};
