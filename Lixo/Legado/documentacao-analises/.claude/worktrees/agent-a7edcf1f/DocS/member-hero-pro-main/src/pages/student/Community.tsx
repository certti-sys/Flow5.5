import { useSupabaseCommunity } from "@/hooks/useSupabaseCommunity";
import { useCourses } from "@/hooks/useCourses";
import { useLessons } from "@/hooks/useLessons";
import { useStudentAccess } from "@/hooks/useStudentAccess";
import { useAuthContext } from "@/contexts/AuthContext";
import { useStudentProgress } from "@/hooks/useStudentProgress";
import { useSupabaseCardsSettings } from "@/hooks/useSupabaseCardsSettings";
import { Button } from "@/components/ui/button";
import { Lock, ShoppingCart, BookOpen } from "lucide-react";
import { useSupabaseBannersSecundarios } from "@/hooks/useSupabaseBannersSecundarios";
import { CourseCardVertical } from "@/components/student/CourseCardVertical";
import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Community() {
  const navigate = useNavigate();
  const { bannersAtivos } = useSupabaseBannersSecundarios();
  const { user } = useAuthContext();
  
  // Filtrar banners para comunidade
  const bannersComunidade = bannersAtivos.filter(b => b.exibir_comunidade);
  
  // Filtrar banners por posição
  const getBannersByPosition = (position: 'antes' | 'entre' | 'depois') => {
    return bannersComunidade.filter(b => b.posicao === position);
  };
  
  // Componente para renderizar banner
  const renderBanner = (banner: any) => (
    <div 
      key={banner.id}
      className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 mb-6"
    >
      <div className="relative w-full rounded-xl overflow-hidden max-w-7xl mx-auto" style={{ aspectRatio: '3/1' }}>
        <img 
          src={banner.imagem_url || ''} 
          alt={banner.nome || 'Banner promocional'} 
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );
  const { settings, checkUserAccess, manualAccess, loadingSettings } = useSupabaseCommunity();
  const { cursos: allCourses } = useCourses();
  const { aulas: allLessons } = useLessons();
  const { hasAccess: hasAccessToCourse } = useStudentAccess();
  const { getLessonProgress } = useStudentProgress();
  const { settings: cardsSettings, isLoading: isLoadingSettings } = useSupabaseCardsSettings();
  const [hasManualAccess, setHasManualAccess] = React.useState(false);

  // Check if user has manual access
  React.useEffect(() => {
    const checkAccess = async () => {
      if (user?.id) {
        const access = await checkUserAccess(user.id);
        setHasManualAccess(access);
      }
    };
    checkAccess();
  }, [user?.id, checkUserAccess, manualAccess]);

  // Determine if user has access to community
  const hasAccess = React.useMemo(() => {
    if (hasManualAccess) return true;
    
    // Check if user has access to any linked course
    const linkedCourses = settings?.cursosVinculados || [];
    return linkedCourses.some(courseId => hasAccessToCourse(courseId));
  }, [hasManualAccess, settings?.cursosVinculados, hasAccessToCourse]);

  // Filter linked courses to display
  const linkedCourses = React.useMemo(() => {
    if (!settings?.cursosVinculados) return [];
    return allCourses.filter(c => 
      settings.cursosVinculados.includes(c.id) && c.status === "Publicado"
    );
  }, [settings?.cursosVinculados, allCourses]);

  // Get first lesson of a course
  const obterPrimeiraAulaDoCurso = (courseId: string) => {
    return allLessons
      .filter(l => l.cursoId === courseId && l.status === "Publicado")
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))[0];
  };

  // Calculate course progress
  const getCourseProgress = (courseId: string) => {
    const courseLessons = allLessons.filter(l => l.cursoId === courseId);
    if (courseLessons.length === 0) return 0;
    
    const completedLessons = courseLessons.filter(l => {
      const progress = getLessonProgress(l.id);
      return progress?.completed;
    });
    
    return Math.round((completedLessons.length / courseLessons.length) * 100);
  };

  const handleBuyAccess = () => {
    // Get first linked course checkout URL
    const firstLinkedCourse = allCourses.find(c => 
      settings?.cursosVinculados?.includes(c.id)
    );
    if (firstLinkedCourse?.checkoutUrl) {
      window.open(firstLinkedCourse.checkoutUrl, "_blank");
    }
  };

  const handleCourseClick = (courseId: string) => {
    if (hasAccessToCourse(courseId)) {
      const primeiraAula = obterPrimeiraAulaDoCurso(courseId);
      if (primeiraAula) {
        navigate(`/student/lesson/${primeiraAula.id}`);
      } else {
        toast.info("Este curso ainda não possui aulas disponíveis");
      }
    } else {
      // Verificar se existe URL de checkout configurada
      const course = allCourses.find(c => c.id === courseId);
      if (course?.checkoutUrl) {
        window.open(course.checkoutUrl, '_blank');
      } else {
        toast.info("Curso não liberado");
      }
    }
  };

  const handleBuyClick = (courseId: string) => {
    const course = allCourses.find(c => c.id === courseId);
    if (course?.checkoutUrl) {
      window.open(course.checkoutUrl, "_blank");
    }
  };

  if (loadingSettings || isLoadingSettings) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando comunidade...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {!hasAccess ? (
        // Locked View - No Access
        <div className="relative">
          {/* Blurred Banner */}
          <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
            <div 
              className="absolute inset-0 bg-cover bg-center blur-md scale-110"
              style={{ backgroundImage: `url(${settings?.bannerPrincipal || 'https://images.unsplash.com/photo-1487017159836-4e23ece2e4cf?w=1200&h=600&fit=crop'})` }}
            />
            <div className="absolute inset-0 bg-black/60" />
            
            {/* Lock Icon & Message */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
              <div className="glass-card border border-border/50 rounded-2xl p-8 max-w-md">
                <Lock className="w-16 h-16 mx-auto mb-4 text-primary" />
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {settings?.nome || "Comunidade Premium"}
                </h1>
                <p className="text-muted-foreground mb-6">
                  {settings?.descricao || "Área exclusiva com conteúdos premium"}
                </p>
                
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Conteúdo exclusivo para membros
                  </p>
                  
                  {settings?.cursosVinculados && settings.cursosVinculados.length > 0 && (
                    <>
                      <p className="text-sm text-foreground">
                        Para ter acesso, adquira um dos cursos:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {settings.cursosVinculados.map((courseId) => {
                          const course = allCourses.find(c => c.id === courseId);
                          return course ? (
                            <li key={courseId}>• {course.titulo}</li>
                          ) : null;
                        })}
                      </ul>
                      <Button 
                        onClick={handleBuyAccess}
                        className="w-full gap-2 bg-primary hover:bg-primary/90"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Adquirir Acesso
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Unlocked View - Full Community with automatic shelves
        <div className="space-y-8 pb-12">
          {/* Banners Secundários - ANTES do conteúdo */}
          {getBannersByPosition('antes').map(renderBanner)}

          {/* Banner Principal */}
          {settings?.bannerPrincipal && (
            <div className="relative h-[40vh] sm:h-[50vh] overflow-hidden">
              <img 
                src={settings.bannerPrincipal}
                alt={settings.nome}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8">
                <div className="max-w-7xl mx-auto">
                  <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-2">
                    {settings.nome}
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    {settings.descricao}
                  </p>
                  {settings.mensagemBoasVindas && (
                    <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                      {settings.mensagemBoasVindas}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Linked Courses Grid */}
          <div className="max-w-7xl mx-auto px-4 space-y-6">
            {/* Banners Secundários - ENTRE o conteúdo */}
            {getBannersByPosition('entre').map(renderBanner)}

            <h2 className="text-2xl font-bold text-foreground">
              Cursos Exclusivos
            </h2>

            {linkedCourses.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum curso vinculado à comunidade
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {linkedCourses.map((course) => {
                  const userHasAccess = hasAccessToCourse(course.id);
                  const progress = userHasAccess ? getCourseProgress(course.id) : 0;

                  return (
                    <CourseCardVertical
                      key={course.id}
                      course={course}
                      isLocked={!userHasAccess}
                      showTitle={cardsSettings.exibirTitulo}
                      showDescription={cardsSettings.exibirDescricao}
                      showCategory={cardsSettings.exibirCategoria}
                      showProgress={cardsSettings.mostrarProgresso && userHasAccess}
                      showLock={cardsSettings.mostrarCadeado && !userHasAccess}
                      hoverEffect={cardsSettings.efeitoHover}
                      progress={progress}
                      onCourseClick={() => handleCourseClick(course.id)}
                    />
                  );
                })}
              </div>
            )}
            
            {/* Banners Secundários - DEPOIS do conteúdo */}
            {getBannersByPosition('depois').map(renderBanner)}
          </div>
        </div>
      )}
    </div>
  );
}
