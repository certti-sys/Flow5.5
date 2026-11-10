import { useRef, useState, useEffect } from "react"; // Updated for tablet support
import { CourseCard } from "@/components/CourseCard";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useDragToScroll } from "@/hooks/useDragToScroll";
import { CarouselIndicators } from "@/components/CarouselIndicators";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useCourseAccess } from "@/hooks/useCourseAccess";

interface DynamicCarouselProps {
  carousel: {
    id: string;
    title: string;
    type: string;
    category: string | null;
    cards_per_view_desktop: number;
    cards_per_view_tablet?: number;
    cards_per_view_mobile: number;
  };
}

export const DynamicCarousel = ({ carousel }: DynamicCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { user } = useAuth();
  const deviceType = useDeviceType();

  useDragToScroll(carouselRef);

  const itemsPerView = deviceType === "mobile"
    ? carousel.cards_per_view_mobile
    : deviceType === "tablet"
      ? (carousel.cards_per_view_tablet ?? 3)
      : carousel.cards_per_view_desktop;

  // Fetch courses based on carousel type
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["carouselCourses", carousel.id, carousel.type, carousel.category],
    queryFn: async () => {
      if (carousel.type === "manual") {
        // Fetch manually selected courses
        const { data, error } = await supabase
          .from("carousel_courses")
          .select(`
            order_index,
            courses (
              *,
              modules (
                id,
                lessons (id)
              )
            )
          `)
          .eq("carousel_id", carousel.id)
          .order("order_index", { ascending: true });

        if (error) throw error;
        return data.map((item: any) => item.courses).filter(Boolean);
      } else {
        // Fetch courses by category (automatic)
        let query = supabase
          .from("courses")
          .select(`
            *,
            modules (
              id,
              lessons (id)
            )
          `)
          .order("created_at", { ascending: false });

        if (carousel.category) {
          query = query.eq("category", carousel.category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      }
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ["userProgress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select(`
          *,
          lessons (
            *,
            modules (
              *,
              courses (*)
            )
          )
        `)
        .eq("user_id", user.id)
        .eq("completed", true);

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Extract course IDs for access checking
  const courseIds = courses.map((c: any) => c.id).filter(Boolean);

  // Check access for all courses
  const { accessMap, loading: accessLoading } = useCourseAccess(courseIds);

  // Calculate progress for each course
  const coursesWithProgress = courses.filter(Boolean).map((course: any) => {
    const totalLessons = course.modules?.reduce(
      (acc: number, module: any) => acc + (module.lessons?.length || 0),
      0
    ) || 0;

    const completedLessons = userProgress.filter(
      (p: any) => p.lessons?.modules?.courses?.id === course.id
    ).length;

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Use accessMap value, fallback to true if still loading (prevents flash of locked cards)
    // The cache initialization in useCourseAccess should provide correct values
    const hasAccess = accessMap[course.id] ?? (accessLoading ? true : false);

    return {
      ...course,
      progress,
      completedLessons,
      totalLessons,
      hasAccess,
    };
  });

  useEffect(() => {
    const handleScroll = () => {
      const container = carouselRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const itemWidth = 320;
      const index = Math.round(scrollLeft / itemWidth);
      setActiveIndex(index);
    };

    const container = carouselRef.current;
    container?.addEventListener("scroll", handleScroll);

    return () => {
      container?.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollCarousel = (direction: "left" | "right") => {
    const container = carouselRef.current;
    if (container) {
      const containerWidth = container.offsetWidth;
      const scrollAmount = containerWidth; // Rola exatamente uma "página" de cards
      container.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  // Show skeleton while courses or access data is loading
  if (isLoading) {
    return (
      <div className="mb-10 animate-fade-in">
        <h2 className="text-xl md:text-2xl font-bold mb-4">{carousel.title}</h2>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="w-[280px] h-[420px] rounded-xl bg-muted animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (coursesWithProgress.length === 0) {
    return null;
  }

  return (
    <div className="mb-10 animate-fade-in">
      <h2 className="text-xl md:text-2xl font-bold mb-4">{carousel.title}</h2>

      <div className="relative">
        <Button
          onClick={() => scrollCarousel("left")}
          variant="outline"
          size={deviceType === "mobile" ? "sm" : "icon"}
          className="absolute left-2 md:left-0 top-1/2 -translate-y-1/2 z-10 glass-card border-white/10 hover:bg-white/10 flex"
          aria-label="Navegar para esquerda"
        >
          <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
        </Button>

        <div
          ref={carouselRef}
          className="overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-4 cursor-grab active:cursor-grabbing px-1"
          style={{
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: deviceType === "mobile"
              ? `calc((100% - ${(itemsPerView - 1) * 8}px) / ${itemsPerView})`
              : `calc((100% - ${(itemsPerView - 1) * 12}px) / ${itemsPerView})`,
            gap: deviceType === "mobile" ? '8px' : '12px',
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            scrollPadding: "0 4px"
          }}
        >
          {coursesWithProgress.map((course) => (
            <CourseCard key={course.id} course={course} layout="carousel" hasAccess={course.hasAccess} />
          ))}
        </div>

        <Button
          onClick={() => scrollCarousel("right")}
          variant="outline"
          size={deviceType === "mobile" ? "sm" : "icon"}
          className="absolute right-2 md:right-0 top-1/2 -translate-y-1/2 z-10 glass-card border-white/10 hover:bg-white/10 flex"
          aria-label="Navegar para direita"
        >
          <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
        </Button>
      </div>

      <CarouselIndicators
        totalItems={coursesWithProgress.length}
        activeIndex={activeIndex}
        itemsPerView={itemsPerView}
      />
    </div>
  );
};
