import { useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { useSupabaseBannerPrincipal } from '@/hooks/useSupabaseBannerPrincipal';
import { useSupabaseCardsSettings } from '@/hooks/useSupabaseCardsSettings';
import { useShelves } from '@/hooks/useShelves';
import { useCourses } from '@/hooks/useCourses';
import { useStudentAccess } from '@/hooks/useStudentAccess';
import { useStudentProgress } from '@/hooks/useStudentProgress';
import { useLessons } from '@/hooks/useLessons';
import { useModules } from '@/hooks/useModules';
import { CourseCardVertical } from '@/components/student/CourseCardVertical';
import { ShowcasePreviewHeader } from './ShowcasePreviewHeader';
import { cn } from '@/lib/utils';

interface ShowcasePreviewProps {
  device: 'desktop' | 'tablet' | 'mobile';
  onDeviceChange: (device: 'desktop' | 'tablet' | 'mobile') => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onOpenNewTab: () => void;
}

const deviceWidths = {
  desktop: '100%',
  tablet: '768px',
  mobile: '375px',
};

const cardWidths = {
  desktop: 'w-[180px]',
  tablet: 'w-[160px]',
  mobile: 'w-[140px]',
};

export function ShowcasePreview({
  device,
  onDeviceChange,
  isExpanded,
  onToggleExpand,
  onOpenNewTab,
}: ShowcasePreviewProps) {
  const { banner, isLoading: isLoadingBanner } = useSupabaseBannerPrincipal();
  const { settings, isLoading: isLoadingSettings } = useSupabaseCardsSettings();
  const { shelves, getActiveShelves } = useShelves();
  const { cursos } = useCourses();
  const { access, hasAccess: checkAccess } = useStudentAccess();
  const { progress } = useStudentProgress();
  const { aulas } = useLessons();
  const { modulos } = useModules();

  // Same logic as Showcase.tsx
  const publishedCourses = useMemo(() => 
    cursos.filter(curso => curso.status === 'Publicado'),
    [cursos]
  );

  const activeShelves = useMemo(() => getActiveShelves(), [shelves]);

  // Get courses for a specific shelf
  const getCoursesForShelf = (shelf: typeof activeShelves[0]) => {
    if (shelf.tipo === 'manual' && shelf.cursosIds) {
      return publishedCourses.filter(c => shelf.cursosIds?.includes(c.id));
    } else if (shelf.tipo === 'categoria' && shelf.categoriaId) {
      return publishedCourses.filter(c => c.categoriaId === shelf.categoriaId);
    }
    // automatica - all published courses
    return publishedCourses;
  };

  const getCourseProgress = (courseId: string): number => {
    const courseModules = modulos.filter(m => m.cursoId === courseId);
    const modulesIds = courseModules.map(m => m.id);
    const courseLessons = aulas.filter(a => modulesIds.includes(a.moduloId));
    
    if (courseLessons.length === 0) return 0;
    
    const completedLessons = progress.filter(
      p => p.courseId === courseId && p.completed
    ).length;
    
    return Math.round((completedLessons / courseLessons.length) * 100);
  };

  const hasAccessToCourse = (courseId: string): boolean => {
    return checkAccess(courseId);
  };

  const handleCourseClick = (courseId: string) => {
    window.open(`/admin/courses/${courseId}`, '_blank');
  };

  // Scroll functions for shelves
  const scrollShelf = (containerId: string, direction: 'left' | 'right') => {
    const container = document.getElementById(containerId);
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Render horizontal shelf with scroll
  const renderShelfContent = (shelfId: string, courses: typeof publishedCourses) => {
    const containerId = `shelf-scroll-${shelfId}`;
    
    return (
      <div className="relative group/shelf">
        {/* Left Arrow */}
        <button
          onClick={() => scrollShelf(containerId, 'left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 rounded-full p-1.5 opacity-0 group-hover/shelf:opacity-100 transition-opacity shadow-lg"
        >
          <ChevronLeft className="h-4 w-4 text-white" />
        </button>

        {/* Scrollable Container */}
        <div
          id={containerId}
          className="flex gap-3 overflow-x-auto scrollbar-hide scroll-smooth px-1 py-1"
        >
          {courses.map(course => {
            const isLocked = !hasAccessToCourse(course.id);
            const courseProgress = getCourseProgress(course.id);

            return (
              <div
                key={course.id}
                className={cn(
                  "flex-shrink-0 relative group/card cursor-pointer",
                  cardWidths[device]
                )}
                onClick={() => handleCourseClick(course.id)}
              >
                <CourseCardVertical
                  course={course}
                  isLocked={isLocked}
                  showTitle={settings.exibirTitulo ?? true}
                  showDescription={settings.exibirDescricao ?? true}
                  showCategory={settings.exibirCategoria ?? true}
                  showProgress={(settings.mostrarProgresso ?? true) && !isLocked}
                  showLock={settings.mostrarCadeado ?? true}
                  hoverEffect={settings.efeitoHover ?? true}
                  showBorder={settings.mostrarBorda ?? true}
                  gradientOpacity={settings.opacidadeGradienteCard ?? 60}
                  progress={courseProgress}
                  onCourseClick={() => {}}
                />
                {/* Edit Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/card:opacity-100 transition-opacity flex items-center justify-center rounded-lg pointer-events-none">
                  <div className="bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    Editar
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => scrollShelf(containerId, 'right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-black/70 hover:bg-black/90 rounded-full p-1.5 opacity-0 group-hover/shelf:opacity-100 transition-opacity shadow-lg"
        >
          <ChevronRight className="h-4 w-4 text-white" />
        </button>
      </div>
    );
  };

  return (
    <div className={cn(
      "sticky top-6 rounded-xl border border-gold/30 bg-black/40 backdrop-blur-md overflow-hidden shadow-2xl",
      "transition-all duration-300",
      isExpanded ? "col-span-2" : ""
    )}>
      <ShowcasePreviewHeader
        device={device}
        onDeviceChange={onDeviceChange}
        isExpanded={isExpanded}
        onToggleExpand={onToggleExpand}
        onOpenNewTab={onOpenNewTab}
      />
      
      <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
        <div 
          className="mx-auto transition-all duration-300"
          style={{ width: deviceWidths[device] }}
        >
          {/* Hero Banner */}
          {banner.exibir && banner.imagemUrl && (
            <div 
              className="relative w-full"
              style={{ 
                aspectRatio: banner.aspectRatio === 'auto' 
                  ? `${banner.larguraOriginal || 1920}/${banner.alturaOriginal || 500}` 
                  : banner.aspectRatio?.replace('/', ' / ') || '21 / 9'
              }}
            >
              <img 
                src={banner.imagemUrl} 
                alt="Banner Principal" 
                className="w-full h-full"
                style={{ objectFit: banner.objectFit || 'cover' }}
              />
              <div 
                className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"
                style={{ opacity: (settings.opacidadeGradienteVitrine ?? 80) / 100 }}
              />
            </div>
          )}

          {/* Courses by Shelf */}
          <div className="p-4 space-y-6">
            {activeShelves.length > 0 ? (
              activeShelves.map(shelf => {
                const shelfCourses = getCoursesForShelf(shelf);
                
                if (shelfCourses.length === 0) return null;
                
                return (
                  <div key={shelf.id} className="space-y-2">
                    {/* Shelf Title */}
                    <h3 className="text-sm font-semibold text-gold/85 px-1">
                      {shelf.titulo || (
                        <span className="italic text-muted-foreground/60">
                          Título da prateleira (não definido)
                        </span>
                      )}
                    </h3>
                    
                    {/* Horizontal Scroll Shelf */}
                    {renderShelfContent(shelf.id, shelfCourses)}
                  </div>
                );
              })
            ) : publishedCourses.length > 0 ? (
              // Fallback: Show all courses if no shelves configured
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gold/85 px-1">
                  Todos os Cursos
                </h3>
                {renderShelfContent('all-courses', publishedCourses)}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhum curso disponível</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
