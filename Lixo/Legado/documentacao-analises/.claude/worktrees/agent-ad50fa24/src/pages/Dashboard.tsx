import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HeroBanner } from "@/components/HeroBanner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Play } from "lucide-react";
import { useDragToScroll } from "@/hooks/useDragToScroll";
import { CarouselIndicators } from "@/components/CarouselIndicators";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DynamicCarousel } from "@/components/DynamicCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCourseAccess } from "@/hooks/useCourseAccess";

const Dashboard = () => {
  const continueCarouselRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [continueActiveIndex, setContinueActiveIndex] = useState(0);

  useDragToScroll(continueCarouselRef);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch active carousels
  const { data: carousels = [], isLoading: carouselsLoading } = useQuery({
    queryKey: ["activeCarousels"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("carousels")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // Fetch courses for continue watching
  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          modules (
            id,
            lessons (id)
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ["userProgress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_progress")
        .select("*")
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
    // Calculate total lessons from modules
    const totalLessons = course.modules?.reduce(
      (acc: number, module: any) => acc + (module.lessons?.length || 0),
      0
    ) || 0;

    // Calculate completed lessons for this course using the direct course_id
    const completedLessons = userProgress.filter(
      (p: any) => p.course_id === course.id
    ).length;

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Use accessMap value, fallback to true if still loading (prevents flash)
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

  // Filter courses in progress and with access
  const coursesInProgress = coursesWithProgress.filter(
    course => course.progress > 0 && course.progress < 100 && course.hasAccess
  );

  useEffect(() => {
    const handleContinueScroll = () => {
      const container = continueCarouselRef.current;
      if (!container) return;

      const scrollLeft = container.scrollLeft;
      const itemWidth = 440;
      const index = Math.round(scrollLeft / itemWidth);
      setContinueActiveIndex(index);
    };

    const continueContainer = continueCarouselRef.current;
    continueContainer?.addEventListener("scroll", handleContinueScroll);

    return () => {
      continueContainer?.removeEventListener("scroll", handleContinueScroll);
    };
  }, []);

  const scrollContinueCarousel = (direction: "left" | "right") => {
    const carousel = continueCarouselRef.current;
    if (carousel) {
      const cardWidth = isMobile ? 300 : 420;
      const gap = 12;
      const scrollAmount = cardWidth + gap;
      carousel.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  if (carouselsLoading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">

      {/* Hero Banner */}
      <HeroBanner />

      <div className="px-4 md:px-6 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12 space-y-10 max-w-full">
        {/* Continue Watching Section */}
        {coursesInProgress.length > 0 && (
          <div className="mb-10 animate-fade-in">
            <h2 className="text-xl md:text-2xl font-bold mb-4">Continue de onde parou</h2>

            <div className="relative group">
              <Button
                variant="outline"
                size={isMobile ? "sm" : "icon"}
                onClick={() => scrollContinueCarousel("left")}
                className="flex absolute left-2 md:left-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 hover:scale-110 transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 md:-translate-x-2"
                aria-label="Navegar para esquerda"
              >
                <ChevronLeft className="h-4 w-4 md:h-6 md:w-6" />
              </Button>

              <div
                ref={continueCarouselRef}
                id="continue-carousel"
                className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2 cursor-grab active:cursor-grabbing px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', scrollPadding: '0 4px' }}
              >
                {coursesInProgress.slice(0, 5).map((course) => (
                  <Link
                    key={course.id}
                    to={`/curso/${course.id}`}
                    className="group flex-shrink-0 w-[280px] sm:w-[320px] md:w-[360px] snap-start snap-always"
                  >
                    <div className="glass-card flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] hover:border-primary/30 hover:bg-primary/5 transition-all h-full">
                      {/* Thumbnail */}
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden shrink-0 bg-muted">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs sm:text-sm truncate group-hover:text-primary transition-colors leading-tight">
                          {course.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Progress value={course.progress} className="h-1 flex-1" />
                          <span className="text-[10px] sm:text-xs text-primary font-bold shrink-0">{course.progress}%</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {course.completedLessons}/{course.totalLessons} aulas
                        </p>
                      </div>

                      {/* Action Icon */}
                      <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Play className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <Button
                variant="outline"
                size={isMobile ? "sm" : "icon"}
                onClick={() => scrollContinueCarousel("right")}
                className="flex absolute right-2 md:right-0 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 hover:scale-110 transition-all duration-200 md:opacity-0 md:group-hover:opacity-100 md:translate-x-2"
                aria-label="Navegar para direita"
              >
                <ChevronRight className="h-4 w-4 md:h-6 md:w-6" />
              </Button>
            </div>

            <CarouselIndicators
              totalItems={coursesInProgress.slice(0, 5).length}
              activeIndex={continueActiveIndex}
              itemsPerView={isMobile ? 1 : 2}
            />
          </div>
        )}

        {/* Dynamic Carousels */}
        {carousels.map((carousel) => (
          <DynamicCarousel key={carousel.id} carousel={carousel} />
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>© 2024 EduStream. Todos os direitos reservados.</p>
            <div className="flex gap-6">
              <button className="hover:text-foreground transition-colors cursor-pointer">
                Termos de Uso
              </button>
              <button className="hover:text-foreground transition-colors cursor-pointer">
                Política de Privacidade
              </button>
              <button className="hover:text-foreground transition-colors cursor-pointer">
                Suporte
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
