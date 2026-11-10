import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { HeroBanner } from "@/components/HeroBanner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Play, User } from "lucide-react";
import { useDragToScroll } from "@/hooks/useDragToScroll";
import { CarouselIndicators } from "@/components/CarouselIndicators";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DynamicCarousel } from "@/components/DynamicCarousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCourseAccess } from "@/hooks/useCourseAccess";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { motion } from "framer-motion";

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

    // Calculate completed lessons for this course by lesson_id (user_progress has no course_id)
    const lessonIds = new Set<string>(
      course.modules?.flatMap((module: any) =>
        (module.lessons || []).map((lesson: any) => lesson.id)
      ) || []
    );

    const completedLessons = userProgress.filter(
      (p: any) => p.lesson_id && lessonIds.has(p.lesson_id)
    ).length;

    const progress = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    // Use accessMap value, fallback to true if still loading (prevents flash)
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

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full px-4 md:px-6 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12 space-y-8"
      >
        <AdminHeader
          title="Meu Dashboard"
          description="Continue de onde parou e descubra novos cursos para acelerar seu aprendizado."
          showSearch={false}
          actionButton={
            <Link to="/perfil">
              <Button
                variant="outline"
                className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-6 rounded-[12px] font-semibold text-[13px] tracking-tight"
              >
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </Button>
            </Link>
          }
        />

        {/* Continue Watching Section */}
        {coursesInProgress.length > 0 && (
          <div className="glass-card rounded-[24px] border-white/10 p-5 md:p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg md:text-xl font-bold tracking-tight flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary fill-current" />
                  Continue de onde parou
                </h2>
                <p className="text-[13px] text-muted-foreground mt-1">
                  Retome seus cursos em andamento.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "icon"}
                  onClick={() => scrollContinueCarousel("left")}
                  className="glass-card border-white/10 hover:bg-white/10 rounded-[12px] z-20"
                  aria-label="Navegar para esquerda"
                >
                  <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
                <Button
                  variant="outline"
                  size={isMobile ? "sm" : "icon"}
                  onClick={() => scrollContinueCarousel("right")}
                  className="glass-card border-white/10 hover:bg-white/10 rounded-[12px] z-20"
                  aria-label="Navegar para direita"
                >
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </div>
            </div>

            <div
              ref={continueCarouselRef}
              id="continue-carousel"
              className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory pb-2 cursor-grab active:cursor-grabbing"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {coursesInProgress.slice(0, 5).map((course) => (
                <Link
                  key={course.id}
                  to={`/curso/${course.id}`}
                  className="group flex-shrink-0 w-[300px] sm:w-[340px] md:w-[360px] snap-start snap-always"
                >
                  <div className="glass-card rounded-[20px] border-white/10 p-4 flex items-center gap-4 hover:border-primary/30 hover:shadow-glow transition-all duration-300">
                    {/* Thumbnail */}
                    <div className="relative w-24 h-16 shrink-0 rounded-[12px] overflow-hidden border border-white/10">
                      <img
                        src={course.thumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[14px] text-white/90 leading-tight truncate group-hover:text-primary transition-colors">
                        {course.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={course.progress} className="h-1.5 flex-1 bg-white/20" />
                        <span className="text-[11px] text-primary font-bold shrink-0">{course.progress}%</span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-1.5">
                        {course.completedLessons}/{course.totalLessons} aulas
                      </p>
                    </div>

                    {/* Action Icon - always visible */}
                    <div className="shrink-0 w-9 h-9 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </Link>
              ))}
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
          <DynamicCarousel key={carousel.id} carousel={carousel} className="mb-0" />
        ))}

        {/* Footer */}
        <footer className="border-t border-white/10 pt-8 mt-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-white/50">
            <p className="text-white/60">
              © {new Date().getFullYear()} EduStream. Todos os direitos reservados.
            </p>
            <div className="flex gap-6">
              <button className="hover:text-white transition-colors cursor-pointer">
                Termos de Uso
              </button>
              <button className="hover:text-white transition-colors cursor-pointer">
                Política de Privacidade
              </button>
              <button className="hover:text-white transition-colors cursor-pointer">
                Suporte
              </button>
            </div>
          </div>
        </footer>
      </motion.div>
    </div>
  );
};

export default Dashboard;
