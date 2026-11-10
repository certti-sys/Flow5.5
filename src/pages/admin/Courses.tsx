import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2, ChevronDown, Settings, BookOpen, User, Layers, PlayCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { CourseFormModal } from "@/components/admin/CourseFormModal";
import { LessonFormModal } from "@/components/admin/LessonFormModal";
import { ModuleFormModal } from "@/components/admin/ModuleFormModal";
import { CategoryManagerModal } from "@/components/admin/CategoryManagerModal";
import { LessonList } from "@/components/admin/LessonList";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CourseModuleAccordion } from "@/components/admin/CourseModuleAccordion";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export default function AdminCourses() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [deletingCourse, setDeletingCourse] = useState<any>(null);

  const [lessonModalOpen, setLessonModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [preselectedModuleId, setPreselectedModuleId] = useState<string>("");
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);

  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<any>(null);
  const [deletingModule, setDeletingModule] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("todos");

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["adminCourses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["courseCategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_categories")
        .select("name")
        .order("name");
      if (error) throw error;
      return data.map(c => c.name);
    },
  });

  const { data: coursesWithModules = {} } = useQuery({
    queryKey: ["courseModules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modules")
        .select(`
          *,
          lessons (*)
        `)
        .order("order_index");

      if (error) throw error;

      const grouped = data.reduce((acc: any, module: any) => {
        if (!acc[module.course_id]) {
          acc[module.course_id] = [];
        }
        acc[module.course_id].push({
          ...module,
          lessons: module.lessons.sort((a: any, b: any) => a.order_index - b.order_index)
        });
        return acc;
      }, {});

      return grouped;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminCourses"] });
      toast.success("Curso excluído com sucesso!");
      setDeletingCourse(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir curso");
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from("modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courseModules"] });
      toast.success("Módulo excluído com sucesso!");
      setDeletingModule(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir módulo");
    },
  });

  const handleAddCourse = () => {
    setEditingCourse(null);
    setModalOpen(true);
  };

  const handleEditCourse = (course: any) => {
    setEditingCourse(course);
    setModalOpen(true);
  };

  const handleDeleteCourse = (course: any) => {
    setDeletingCourse(course);
  };

  const confirmDelete = () => {
    if (deletingCourse) {
      deleteMutation.mutate(deletingCourse.id);
    }
  };

  const handleAddLesson = (courseId: string, moduleId: string) => {
    setSelectedCourseId(courseId);
    setPreselectedModuleId(moduleId);
    setEditingLesson(null);
    setLessonModalOpen(true);
  };

  const handleEditLesson = (lesson: any, courseId: string) => {
    setSelectedCourseId(courseId);
    setEditingLesson(lesson);
    setLessonModalOpen(true);
  };

  const handleAddModule = (courseId: string) => {
    setSelectedCourseId(courseId);
    setEditingModule(null);
    setModuleModalOpen(true);
  };

  const handleEditModule = (module: any, courseId: string) => {
    setSelectedCourseId(courseId);
    setEditingModule(module);
    setModuleModalOpen(true);
  };

  const handleDeleteModule = (module: any) => {
    setDeletingModule(module);
  };

  const confirmDeleteModule = () => {
    if (deletingModule) {
      deleteModuleMutation.mutate(deletingModule.id);
    }
  };

  const filteredCourses = courses?.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.instructor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "todos" || course.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center py-24">
        <div className="glass-card border-white/10 rounded-[24px] p-8 flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-sm text-white/60 mt-3">Carregando cursos...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-20"
    >
      <AdminHeader
        title="Gestão de Cursos"
        description="Organize seu conteúdo em cursos, módulos e aulas."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar curso ou instrutor..."
        actionButton={
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setCategoryManagerOpen(true)}
              variant="outline"
              className="glass-card border-white/10 hover:bg-white/5 h-[44px] px-6 rounded-[12px] font-semibold text-[13px] tracking-tight"
            >
              <Settings className="w-4 h-4 mr-2" />
              Categorias
            </Button>
            <Button
              onClick={handleAddCourse}
              className="gradient-primary shadow-glow h-[44px] px-6 rounded-[12px] font-bold text-[13px] tracking-tight"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Curso
            </Button>
          </div>
        }
        filters={
          <div className="flex items-center gap-2 pl-2 border-l border-white/10 ml-2">
            <Button
              variant="ghost"
              onClick={() => setSelectedCategory("todos")}
              className={cn(
                "h-8 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all",
                selectedCategory === "todos"
                  ? "bg-primary text-white shadow-glow"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              Todos
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                variant="ghost"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "h-8 px-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all whitespace-nowrap",
                  selectedCategory === cat
                    ? "bg-primary text-white shadow-glow"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                )}
              >
                {cat}
              </Button>
            ))}
          </div>
        }
      />

      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredCourses.map((course: any) => {
            const moduleCount = coursesWithModules[course.id]?.length || 0;
            const lessonCount = coursesWithModules[course.id]?.reduce(
              (acc: number, mod: any) => acc + (mod.lessons?.length || 0), 0
            ) || 0;

            return (
              <motion.div
                key={course.id}
                variants={item}
                layout
                className="glass-card rounded-[24px] border-white/10 overflow-hidden hover:border-white/10 transition-all duration-500 group/course bg-white/[0.02]"
              >
                <Collapsible>
                  <div className="p-4 sm:p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 opacity-0 group-hover/course:opacity-100 transition-opacity duration-1000" />

                    <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-10">
                      <div className="relative shrink-0 group/img w-full md:w-48">
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-28 object-cover rounded-[16px] border border-white/10 shadow-2xl group-hover/img:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 rounded-[16px] bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover/img:opacity-40 transition-opacity" />
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 group-hover/img:translate-x-1 group-hover/img:-translate-y-1 transition-transform duration-500">
                          <PlayCircle className="w-4 h-4 text-primary shadow-glow" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md">
                            {course.category}
                          </Badge>
                          {course.is_published === false && (
                            <Badge variant="outline" className="bg-white/5 text-muted-foreground/60 border-white/10 text-[9px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md">
                              Rascunho
                            </Badge>
                          )}
                          <div className="h-1 w-1 rounded-full bg-white/10 mx-1" />
                          <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tighter">ID: #{course.id.slice(0,4)}</span>
                        </div>

                        <h3 className="font-black text-[22px] text-white leading-tight group-hover/course:text-primary transition-colors tracking-tight">
                          {course.title}
                        </h3>

                        <div className="flex flex-wrap items-center gap-5 text-[12px] text-muted-foreground/80 mt-3 font-medium">
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5">
                            <User className="w-3.5 h-3.5 text-primary/60" />
                            <span className="text-white/70">{course.instructor}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5 opacity-40" />
                            <span><strong className="text-white">{moduleCount}</strong> Módulos</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 opacity-40" />
                            <span><strong className="text-white">{lessonCount}</strong> Aulas</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleEditCourse(course)}
                          className="w-11 h-11 rounded-[14px] hover:bg-primary/20 hover:text-primary border border-white/5 hover:border-primary/20 transition-all duration-300"
                        >
                          <Edit className="w-4.5 h-4.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          onClick={() => handleDeleteCourse(course)}
                          className="w-11 h-11 rounded-[14px] hover:bg-red-500/20 text-muted-foreground hover:text-red-500 border border-white/5 transition-all duration-300"
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </Button>
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost" size="icon"
                            className="w-11 h-11 rounded-[14px] hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all data-[state=open]:rotate-180 duration-500"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t border-white/5 p-6 bg-white/[0.015] backdrop-blur-sm">
                      <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                          <h4 className="text-[17px] font-bold text-white flex items-center gap-3">
                            <div className="w-2 h-5 bg-primary rounded-full shadow-glow" />
                            Estrutura do Curso
                          </h4>
                          <p className="text-[12px] text-muted-foreground ml-5">Gerencie os módulos e a ordem das aulas.</p>
                        </div>
                        <Button
                          onClick={() => handleAddModule(course.id)}
                          className="bg-primary hover:bg-primary/90 text-white shadow-glow h-[40px] px-6 rounded-[12px] text-[12px] font-bold uppercase tracking-wider gap-2 transition-all hover:scale-105"
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Módulo
                        </Button>
                      </div>

                      <CourseModuleAccordion
                        modules={coursesWithModules[course.id] || []}
                        courseId={course.id}
                        onAddModule={() => handleAddModule(course.id)}
                        onAddLesson={handleAddLesson}
                        onEditModule={handleEditModule}
                        onDeleteModule={handleDeleteModule}
                        onEditLesson={handleEditLesson}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredCourses.length === 0 && !isLoading && (
          <div className="glass-card py-32 rounded-[32px] border-dashed border-white/10 flex flex-col items-center justify-center text-center px-6">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
              <Search className="w-10 h-10 text-white/10" />
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight mb-2">CURSO NÃO ENCONTRADO</h2>
            <p className="text-muted-foreground text-[14px] max-w-xs mb-8">
              Não encontramos nenhum curso com os termos ou filtros selecionados.
            </p>
            <Button
              variant="outline"
              onClick={() => { setSearchTerm(""); setSelectedCategory("todos"); }}
              className="glass-card border-white/10 hover:bg-white/5 h-12 px-8 rounded-[12px] font-bold uppercase tracking-widest text-[12px]"
            >
              LIMPAR TODOS OS FILTROS
            </Button>
          </div>
        )}
      </div>

      <CourseFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        course={editingCourse}
      />

      <LessonFormModal
        open={lessonModalOpen}
        onOpenChange={setLessonModalOpen}
        courseId={selectedCourseId}
        lesson={editingLesson}
        preselectedModuleId={preselectedModuleId}
      />

      <ModuleFormModal
        open={moduleModalOpen}
        onOpenChange={setModuleModalOpen}
        courseId={selectedCourseId}
        module={editingModule}
      />

      <CategoryManagerModal
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
      />

      <AlertDialog open={!!deletingCourse} onOpenChange={() => setDeletingCourse(null)}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[28px] max-w-[440px] p-8 overflow-hidden">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
              <Trash2 className="h-7 w-7 text-red-500" />
            </div>
            <AlertDialogHeader>
              <div className="space-y-2">
                <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight uppercase">Excluir Curso</AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] text-muted-foreground leading-relaxed">
                  Tem certeza que deseja excluir permanentemente <strong className="text-white">"{deletingCourse?.title}"</strong>? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="flex-1 h-[44px] glass-card border-white/10 hover:bg-white/5 rounded-[12px] mt-0 font-bold uppercase tracking-widest text-[11px]">
              Manter Curso
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={deleteMutation.isPending}
              className="flex-1 h-[44px] bg-red-500 hover:bg-red-600 text-white border-0 rounded-[12px] font-bold uppercase tracking-widest text-[11px]"
            >
              Excluir Agora
            </AlertDialogAction>
          </AlertDialogFooter>
        </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deletingModule} onOpenChange={() => setDeletingModule(null)}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[28px] max-w-[440px] p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
          <AlertDialogHeader className="px-8 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                <Trash2 className="h-7 w-7 text-red-500" />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">Excluir Módulo</AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] text-muted-foreground leading-relaxed">
                  O módulo <strong className="text-white">"{deletingModule?.title}"</strong> e suas aulas vinculadas serão apagados definitivamente.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="h-[44px] flex-1 glass-card border-white/10 hover:bg-white/5 rounded-[16px] font-bold uppercase tracking-widest text-[11px] mt-0">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteModule}
              className="h-[44px] flex-1 bg-red-500 hover:bg-red-600 text-white border-0 rounded-[16px] font-bold uppercase tracking-widest text-[11px] shadow-glow-red"
            >
              EXCLUIR AGORA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}