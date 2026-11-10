import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { CourseCardVertical } from "@/components/student/CourseCardVertical";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { BannerSkeleton } from "@/components/ui/image-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useCourses } from "@/hooks/useSupabaseCourses";
import { useModules } from "@/hooks/useSupabaseModules";
import { useStudentAccess } from "@/hooks/useSupabaseStudentAccess";
import { useStudentProgress } from "@/hooks/useSupabaseStudentProgress";
import { useLessons } from "@/hooks/useSupabaseLessons";
import { useSupabaseBannerPrincipal } from "@/hooks/useSupabaseBannerPrincipal";
import { useSupabaseCardsSettings } from "@/hooks/useSupabaseCardsSettings";
import { useSupabaseBannersSecundarios } from "@/hooks/useSupabaseBannersSecundarios";
import { useShelves } from "@/hooks/useShelves";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Constantes para infinite scroll
const INITIAL_LOAD = 18; // 6 cards × 3 linhas
const LOAD_MORE = 12;    // 6 cards × 2 linhas por vez

// Componente de scroll horizontal para prateleiras
function ShelfScrollContainer({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    handleScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleScroll);
    }
    return () => {
      if (ref) {
        ref.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
      }
    };
  }, [children]);

  return (
    <div className="relative group">
      {/* Botão esquerdo */}
      {showLeftArrow && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <ChevronLeft className="h-6 w-6 text-foreground" />
        </button>
      )}
      
      {/* Container com scroll */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide px-4 sm:px-6 lg:px-8 xl:px-10 pb-2 stagger-fade-in"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
      
      {/* Botão direito */}
      {showRightArrow && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <ChevronRight className="h-6 w-6 text-foreground" />
        </button>
      )}
    </div>
  );
}

export default function Showcase() {
  const navigate = useNavigate();
  const { cursos: courses, isLoading: loadingCourses } = useCourses();
  const { obterModulosPorCurso } = useModules();
  const { hasAccess } = useStudentAccess();
  const { getLessonProgress } = useStudentProgress();
  const { obterAulasPorCurso, obterAulasPorModulo } = useLessons();
  const { banner } = useSupabaseBannerPrincipal();
  const { settings } = useSupabaseCardsSettings();
  const { bannersAtivos } = useSupabaseBannersSecundarios();
  const { shelves, getActiveShelves } = useShelves();
  
  // Filtrar banners para vitrine
  const bannersVitrine = bannersAtivos.filter(b => b.exibir_vitrine);

  // Estados para infinite scroll (fallback sem prateleiras)
  const [visibleCount, setVisibleCount] = useState(INITIAL_LOAD);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Todos os cursos publicados
  const publishedCourses = courses.filter((c) => c.status === 'Publicado');

  // Prateleiras ativas ordenadas
  const activeShelves = useMemo(() => getActiveShelves(), [shelves]);

  // Cursos visíveis (limitado por visibleCount para infinite scroll - usado no fallback)
  const visibleCourses = publishedCourses.slice(0, visibleCount);
  const hasMore = visibleCount < publishedCourses.length;

  const getCourseProgress = (courseId: string) => {
    const lessons = obterAulasPorCurso(courseId);
    if (lessons.length === 0) return 0;

    const completedCount = lessons.filter((lesson) => {
      const progress = getLessonProgress(lesson.id);
      return progress?.completed;
    }).length;

    return (completedCount / lessons.length) * 100;
  };

  const obterPrimeiraAulaDoCurso = (courseId: string) => {
    // Pegar módulos do curso ordenados por ordem
    const modulosDoCurso = obterModulosPorCurso(courseId)
      .filter(m => m.status === 'Publicado')
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    // Pegar primeira aula publicada do primeiro módulo
    for (const modulo of modulosDoCurso) {
      const aulasDomModulo = obterAulasPorModulo(modulo.id)
        .filter(a => a.status === 'Publicado')
        .sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      
      if (aulasDomModulo.length > 0) {
        return aulasDomModulo[0];
      }
    }
    
    return null;
  };

  const handleCourseClick = (courseId: string) => {
    if (hasAccess(courseId)) {
      const primeiraAula = obterPrimeiraAulaDoCurso(courseId);
      if (primeiraAula) {
        navigate(`/student/lesson/${primeiraAula.id}`);
      } else {
        toast.info("Este curso ainda não possui aulas disponíveis");
      }
    } else {
      // Verificar se existe URL de checkout configurada
      const course = publishedCourses.find(c => c.id === courseId);
      if (course?.checkoutUrl) {
        window.open(course.checkoutUrl, '_blank');
      } else {
        toast.info("Curso não liberado");
      }
    }
  };

  // Filtrar banners por posição e local (vitrine)
  const getBannersByPosition = (position: 'antes' | 'entre' | 'depois') => {
    return bannersVitrine.filter(b => b.posicao === position);
  };

  // Componente para renderizar banner
  const renderBanner = (banner: any) => (
    <div 
      key={banner.id}
      className="w-full px-4 sm:px-6 lg:px-8 xl:px-10"
    >
      <div className="relative w-full rounded-xl overflow-hidden" style={{ aspectRatio: '3/1' }}>
        <img 
          src={banner.imagem_url || ''} 
          alt={banner.nome || 'Banner promocional'} 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );

  // Hook para detectar quando o elemento "sentinel" entra na tela
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setVisibleCount(prev => Math.min(prev + LOAD_MORE, publishedCourses.length));
        }
      },
      { rootMargin: '200px' } // Carrega antes de chegar ao fim
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [hasMore, publishedCourses.length]);

  // Skeleton loading state
  if (loadingCourses) {
    return (
      <div className="space-y-6 pb-20 sm:pb-8">
        {/* Banner skeleton */}
        <div className="w-full mx-0 sm:mx-4 lg:mx-8 xl:mx-10">
          <Skeleton className="w-full h-48 sm:h-64 lg:h-80 rounded-none sm:rounded-xl" />
        </div>
        
        {/* Título skeleton */}
        <div className="px-4 sm:px-6">
          <Skeleton className="h-7 w-48" />
        </div>
        
        {/* Cards skeleton */}
        <div className="flex gap-4 overflow-hidden px-4 sm:px-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[180px]">
              <Skeleton className="aspect-[3/4] rounded-xl" />
            </div>
          ))}
        </div>
        
        {/* Segunda prateleira skeleton */}
        <div className="px-4 sm:px-6">
          <Skeleton className="h-7 w-36" />
        </div>
        <div className="flex gap-4 overflow-hidden px-4 sm:px-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-[140px] sm:w-[180px]">
              <Skeleton className="aspect-[3/4] rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-10 pb-20 sm:pb-8 lg:pb-12">
        {/* Banner Hero */}
        {banner.exibir && banner.imagemUrl && (() => {
          const getAspectRatio = () => {
            return banner.aspectRatio || '21/9';
          };

          return (
            <div 
              className="relative w-full rounded-none sm:rounded-xl lg:rounded-2xl overflow-hidden mt-0 mx-0 sm:mx-4 lg:mx-8 xl:mx-10"
              style={{ aspectRatio: getAspectRatio() }}
            >
              <OptimizedImage
                src={banner.imagemUrl}
                alt="Banner Principal"
                className={cn(
                  "absolute inset-0 w-full h-full object-top",
                  banner.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                )}
                sizes="100vw"
                priority={true}
                fallback={<BannerSkeleton />}
              />
              <div 
                className="absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent"
                style={{ opacity: (settings.opacidadeGradienteVitrine ?? 80) / 100 }}
              />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background/70 via-background/40 to-transparent" />
            </div>
          );
        })()}

        {/* Banners Secundários - ANTES das prateleiras */}
        {getBannersByPosition('antes').map(renderBanner)}

        {/* Renderizar prateleiras ativas */}
        {activeShelves.length > 0 ? (
          <div className="space-y-8 pt-10">
            {activeShelves.map((shelf, shelfIndex) => {
              // Filtrar cursos baseado no tipo de prateleira
              const shelfCourses = (() => {
                switch (shelf.tipo) {
                  case 'manual':
                    return publishedCourses.filter(c => shelf.cursosIds?.includes(c.id));
                  case 'categoria':
                    return publishedCourses.filter(c => c.categoria_id === shelf.categoriaId);
                  case 'automatica':
                  default:
                    return publishedCourses;
                }
              })();
              
              // Não renderizar prateleira vazia
              if (shelfCourses.length === 0) return null;
              
              return (
                <div key={shelf.id} className="space-y-4">
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gradient-gold px-4 sm:px-6 lg:px-8 xl:px-10">
                  {shelf.titulo}
                </h2>
                  
                  {/* Scroll horizontal para prateleiras */}
                  <ShelfScrollContainer>
                    {shelfCourses.map((course) => {
                      const courseHasAccess = hasAccess(course.id);
                      const progress = getCourseProgress(course.id);

                      return (
                        <div key={course.id} className="flex-shrink-0 w-[140px] sm:w-[180px] md:w-[200px] lg:w-[220px]">
                          <CourseCardVertical
                            course={course}
                            isLocked={!courseHasAccess}
                            progress={progress}
                            showTitle={settings.exibirTitulo ?? true}
                            showDescription={settings.exibirDescricao ?? true}
                            showCategory={settings.exibirCategoria ?? true}
                            showProgress={settings.mostrarProgresso ?? true}
                            showLock={settings.mostrarCadeado ?? true}
                            hoverEffect={settings.efeitoHover ?? true}
                            showBorder={settings.mostrarBorda ?? true}
                            gradientOpacity={settings.opacidadeGradienteCard ?? 60}
                            onCourseClick={() => handleCourseClick(course.id)}
                          />
                        </div>
                      );
                    })}
                  </ShelfScrollContainer>
                  
                  {/* Banners ENTRE - aparecem após a primeira prateleira */}
                  {shelfIndex === 0 && getBannersByPosition('entre').map(renderBanner)}
                </div>
              );
            })}
          </div>
        ) : (
          /* Fallback: Grid de Cursos com Infinite Scroll (quando não há prateleiras) */
          publishedCourses.length > 0 && (
            <div className="space-y-6 pt-10">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gradient-gold px-4 sm:px-6 lg:px-8 xl:px-10">
              Todos os Cursos
            </h2>
              
              {/* Primeira parte dos cursos (até 6 cards) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 xl:px-10">
                {visibleCourses.slice(0, Math.min(6, visibleCourses.length)).map((course) => {
                  const courseHasAccess = hasAccess(course.id);
                  const progress = getCourseProgress(course.id);

                  return (
                    <CourseCardVertical
                      key={course.id}
                      course={course}
                      isLocked={!courseHasAccess}
                      progress={progress}
                      showTitle={settings.exibirTitulo ?? true}
                      showDescription={settings.exibirDescricao ?? true}
                      showCategory={settings.exibirCategoria ?? true}
                      showProgress={settings.mostrarProgresso ?? true}
                      showLock={settings.mostrarCadeado ?? true}
                      hoverEffect={settings.efeitoHover ?? true}
                      showBorder={settings.mostrarBorda ?? true}
                      gradientOpacity={settings.opacidadeGradienteCard ?? 60}
                      onCourseClick={() => handleCourseClick(course.id)}
                    />
                  );
                })}
              </div>

              {/* Banners ENTRE - aparecem após os primeiros 6 cursos */}
              {visibleCourses.length > 6 && getBannersByPosition('entre').map(renderBanner)}

              {/* Resto dos cursos (após o 6º) */}
              {visibleCourses.length > 6 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 lg:gap-6 px-4 sm:px-6 lg:px-8 xl:px-10">
                  {visibleCourses.slice(6).map((course) => {
                    const courseHasAccess = hasAccess(course.id);
                    const progress = getCourseProgress(course.id);

                    return (
                      <CourseCardVertical
                        key={course.id}
                        course={course}
                        isLocked={!courseHasAccess}
                        progress={progress}
                        showTitle={settings.exibirTitulo ?? true}
                        showDescription={settings.exibirDescricao ?? true}
                        showCategory={settings.exibirCategoria ?? true}
                        showProgress={settings.mostrarProgresso ?? true}
                        showLock={settings.mostrarCadeado ?? true}
                        hoverEffect={settings.efeitoHover ?? true}
                        showBorder={settings.mostrarBorda ?? true}
                        gradientOpacity={settings.opacidadeGradienteCard ?? 60}
                        onCourseClick={() => handleCourseClick(course.id)}
                      />
                    );
                  })}
                </div>
              )}

              {/* Elemento sentinel para infinite scroll */}
              {hasMore && (
                <div ref={loadMoreRef} className="flex justify-center py-8">
                  <div className="flex items-center gap-2 text-white/50">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Carregando mais cursos...</span>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Banners Secundários - DEPOIS das prateleiras */}
        {getBannersByPosition('depois').map(renderBanner)}

        {/* Estado vazio - sem cursos */}
        {publishedCourses.length === 0 && (
          <div className="text-center py-20 px-4">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-gold/10 flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
              <h3 className="text-xl font-bold text-white">Nenhum curso disponível</h3>
              <p className="text-white/60">
                Não há cursos publicados ainda.
              </p>
            </div>
          </div>
        )}

      </div>
  );
}
