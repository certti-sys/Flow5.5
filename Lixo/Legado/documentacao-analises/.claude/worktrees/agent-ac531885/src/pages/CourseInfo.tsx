import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, ChevronLeft, BookOpen, Clock, ShoppingCart, Star, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

const CourseInfo = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // Scroll to top when page loads or courseId changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [courseId]);

  // Fetch course with modules and lessons
  const { data: course, isLoading } = useQuery({
    queryKey: ["course-info", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select(`
          *,
          modules (
            *,
            lessons (*)
          )
        `)
        .eq("id", courseId)
        .order("order_index", { foreignTable: "modules", ascending: true })
        .order("order_index", { foreignTable: "modules.lessons", ascending: true })
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const modules = course?.modules || [];
  const totalLessons = modules.reduce((acc, module) => acc + (module.lessons?.length || 0), 0);

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl text-muted-foreground">Curso não encontrado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <main className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          className="gap-2 hover:bg-white/5 mb-8 text-muted-foreground hover:text-foreground transition-colors group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Voltar para Meus Cursos
        </Button>

        {/* Course Info - Premium Layout */}
        <div className="max-w-6xl mx-auto space-y-12 animate-fade-in">

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16">

            {/* Left Column - Visual Content */}
            <div className="w-full lg:w-2/5 space-y-6">
              <div className="relative group shadow-2xl shadow-primary/10 rounded-2xl overflow-hidden ring-1 ring-white/10">
                <AspectRatio ratio={2 / 3}>
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mb-4 shadow-2xl">
                      <Lock className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <Badge variant="secondary" className="bg-primary text-white border-none px-4 py-1 text-xs font-bold tracking-widest uppercase">
                      Acesso Restrito
                    </Badge>
                  </div>
                </AspectRatio>
              </div>

              {/* Course Features Table */}
              <div className="glass-card rounded-2xl p-6 space-y-4 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Garantia de 7 dias</span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Acesso Vitalício</span>
                </div>
                <Separator className="bg-white/5" />
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Star className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm font-semibold">Certificado Incluso</span>
                </div>
              </div>
            </div>

            {/* Right Column - Product Info */}
            <div className="w-full lg:w-3/5 flex flex-col justify-center">

              {/* Badge & Category */}
              <div className="mb-4">
                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 uppercase tracking-widest text-[10px] font-black px-3 py-1">
                  {course.category || "CURSO PREMIUM"}
                </Badge>
              </div>

              <h1 className="text-[32px] md:text-[42px] lg:text-[48px] font-black mb-6 tracking-tighter leading-[1.1] text-foreground">
                {course.title}
              </h1>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                    {course.instructor?.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-muted-foreground font-medium">por <span className="text-foreground">{course.instructor}</span></span>
                </div>
                <Separator orientation="vertical" className="h-4 bg-white/10" />
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-primary/70" />
                    <span>{totalLessons} aulas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary/70" />
                    <span>{course.duration}</span>
                  </div>
                </div>
              </div>

              {course.description && (
                <div className="prose prose-invert max-w-none mb-10">
                  <p className="text-[16px] md:text-[18px] text-muted-foreground leading-relaxed">
                    {course.description}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                {course.checkout_url && (
                  <Button
                    onClick={() => window.open(course.checkout_url!, '_blank')}
                    className="flex-1 gradient-primary text-white text-lg py-7 h-auto rounded-2xl font-black shadow-xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98] group"
                  >
                    <ShoppingCart className="w-5 h-5 mr-3 transition-transform group-hover:scale-110" />
                    QUERO ME INSCREVER AGORA
                  </Button>
                )}

                <Button
                  onClick={() => navigate("/dashboard")}
                  variant="outline"
                  className="h-auto py-7 px-8 rounded-2xl border-white/10 hover:bg-white/5 font-bold transition-all"
                >
                  Ver Outros Cursos
                </Button>
              </div>

              {/* Course Structure - Premium Accordion */}
              {modules.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-[20px] md:text-[24px] tracking-tight uppercase">Conteúdo do Curso</h3>
                    <Badge variant="secondary" className="bg-white/5 text-muted-foreground border-none">
                      Acesso Bloqueado
                    </Badge>
                  </div>

                  <Accordion type="single" collapsible className="w-full bg-white/5 rounded-2xl border border-white/5 overflow-hidden">
                    {modules.map((module, idx) => (
                      <AccordionItem key={module.id} value={module.id} className="border-b border-white/5 last:border-0">
                        <AccordionTrigger className="px-6 py-5 hover:bg-white/5 hover:no-underline transition-all group">
                          <div className="flex items-center gap-4 text-left">
                            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-xs font-bold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-bold text-[14px] md:text-[16px] leading-tight group-hover:text-primary transition-colors">{module.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 font-medium">
                                {module.lessons?.length || 0} aulas exclusivas
                              </p>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-5 pt-2">
                          <div className="space-y-3">
                            {module.lessons?.map((lesson: any, lIdx: number) => (
                              <div key={lesson.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0 opacity-60">
                                <div className="flex items-center gap-3">
                                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-sm font-medium">{lIdx + 1}. {lesson.title}</span>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-bold">{lesson.duration}</span>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CourseInfo;

