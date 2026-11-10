import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

interface HorizontalShelfProps {
  title: string;
  children: React.ReactNode;
}

export function HorizontalShelf({ title, children }: HorizontalShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 600;
      const newScrollLeft =
        direction === "left"
          ? scrollRef.current.scrollLeft - scrollAmount
          : scrollRef.current.scrollLeft + scrollAmount;

      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: "smooth",
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  return (
    <div className="relative group">
      {/* Section Title */}
      <h2 className="text-white text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 px-4 lg:px-8">
        {title}
      </h2>

      {/* Scroll Container */}
      <div className="relative px-4 lg:px-8">
        {/* Left Arrow */}
        {showLeftArrow && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-r from-black/90 to-transparent flex items-center justify-start pl-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-black/80 border border-white/20 flex items-center justify-center hover:bg-black hover:border-premium-gold/50 transition-all">
              <ChevronLeft className="w-6 h-6 text-white" />
            </div>
          </button>
        )}

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory"
        >
          {children}
        </div>

        {/* Right Arrow */}
        {showRightArrow && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-12 h-full bg-gradient-to-l from-black/90 to-transparent flex items-center justify-end pr-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <div className="w-10 h-10 rounded-full bg-black/80 border border-white/20 flex items-center justify-center hover:bg-black hover:border-premium-gold/50 transition-all">
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
