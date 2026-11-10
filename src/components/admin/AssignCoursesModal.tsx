import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, BookOpen } from "lucide-react";

interface Student {
  id: string;
  name: string;
}

interface AssignCoursesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function AssignCoursesModal({ open, onOpenChange, student }: AssignCoursesModalProps) {
  const queryClient = useQueryClient();
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Fetch all courses
  const { data: courses = [] } = useQuery({
    queryKey: ["allCourses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("title");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch student's assigned courses
  const { data: assignedCourses = [] } = useQuery({
    queryKey: ["studentCourses", student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from("user_course_access")
        .select("course_id")
        .eq("user_id", student.id);
      
      if (error) throw error;
      return data.map(item => item.course_id);
    },
    enabled: !!student && open,
  });

  // Fetch student's assigned categories
  const { data: assignedCategories = [] } = useQuery({
    queryKey: ["studentCategories", student?.id],
    queryFn: async () => {
      if (!student) return [];
      
      const { data, error } = await supabase
        .from("user_course_categories")
        .select("category")
        .eq("user_id", student.id);
      
      if (error) throw error;
      return data.map(item => item.category);
    },
    enabled: !!student && open,
  });

  // Initialize selected courses and categories when modal opens or student changes
  useEffect(() => {
    if (!student || !open) return;
    setSelectedCourses(assignedCourses);
    setSelectedCategories(assignedCategories);
  }, [student?.id, open, assignedCourses, assignedCategories]);

  // Get unique categories
  const categories = Array.from(new Set(courses.map(c => c.category)));

  const assignCoursesMutation = useMutation({
    mutationFn: async ({ courseIds, categoryIds }: { courseIds: string[], categoryIds: string[] }) => {
      if (!student) return;

      // Remove all existing course assignments
      const { error: deleteCoursesError } = await supabase
        .from("user_course_access")
        .delete()
        .eq("user_id", student.id);

      if (deleteCoursesError) throw deleteCoursesError;

      // Remove all existing category assignments
      const { error: deleteCategoriesError } = await supabase
        .from("user_course_categories")
        .delete()
        .eq("user_id", student.id);

      if (deleteCategoriesError) throw deleteCategoriesError;

      // Insert new course assignments
      if (courseIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_course_access")
          .insert(
            courseIds.map(courseId => ({
              user_id: student.id,
              course_id: courseId,
            }))
          );

        if (insertError) throw insertError;
      }

      // Insert new category assignments
      if (categoryIds.length > 0) {
        const { error: insertError } = await supabase
          .from("user_course_categories")
          .insert(
            categoryIds.map(category => ({
              user_id: student.id,
              category: category,
            }))
          );

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast.success("Cursos e categorias atribuídos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["studentCourses"] });
      queryClient.invalidateQueries({ queryKey: ["studentCategories"] });
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atribuir cursos: ${error.message}`);
    },
  });

  const handleToggleCourse = (courseId: string) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectAll = () => {
    setSelectedCourses(courses.map(c => c.id));
  };

  const handleDeselectAll = () => {
    setSelectedCourses([]);
  };

  const handleToggleCategory = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSelectByCategory = (category: string) => {
    const categoryCourses = courses
      .filter(c => c.category === category)
      .map(c => c.id);
    
    setSelectedCourses(prev => {
      const newSet = new Set([...prev, ...categoryCourses]);
      return Array.from(newSet);
    });
  };

  const handleSave = () => {
    assignCoursesMutation.mutate({
      courseIds: selectedCourses,
      categoryIds: selectedCategories,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-3xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <BookOpen className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Atribuir Cursos</DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                Gerenciar cursos e acessos para {student?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="individual" className="flex flex-col w-full">
          <div className="px-6 pt-4 border-b border-white/5">
            <TabsList className="bg-transparent h-auto p-0 gap-6 w-full justify-start rounded-none">
              <TabsTrigger 
                value="individual"
                className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-emerald-500 after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium"
              >
                Cursos Individuais
              </TabsTrigger>
              <TabsTrigger 
                value="category"
                className="relative rounded-none px-0 py-3 text-white/50 data-[state=active]:text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-emerald-500 after:opacity-0 data-[state=active]:after:opacity-100 transition-all font-medium"
              >
                Por Categoria
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="individual" className="m-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[14px] text-white/60 font-medium">
                    {selectedCourses.length} de {courses.length} selecionado(s)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                      className="glass-card border-white/10 hover:bg-white/5 h-[32px] px-3 rounded-[8px] text-[12px]"
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="glass-card border-white/10 hover:bg-white/5 h-[32px] px-3 rounded-[8px] text-[12px]"
                    >
                      Desmarcar Todos
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-styled">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center space-x-3 p-3 rounded-[10px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                    >
                      <Checkbox
                        id={course.id}
                        checked={selectedCourses.includes(course.id)}
                        onCheckedChange={() => handleToggleCourse(course.id)}
                        className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                      />
                      <label
                        htmlFor={course.id}
                        className="flex-1 cursor-pointer"
                      >
                        <p className="text-[14px] font-medium text-white/90 leading-none mb-1">{course.title}</p>
                        <p className="text-[12px] text-white/40">
                          {course.category} • {course.duration}
                        </p>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="category" className="m-0 space-y-4 focus-visible:outline-none focus-visible:ring-0">
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-[14px] text-white/60 font-medium">
                    {selectedCategories.length} de {categories.length} categoria(s) selecionada(s)
                  </p>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-styled">
                  {categories.map((category) => {
                    const categoryCourses = courses.filter(c => c.category === category);
                    return (
                      <div
                        key={category}
                        className="flex items-start space-x-3 p-4 rounded-[10px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                      >
                        <Checkbox
                          id={`category-${category}`}
                          checked={selectedCategories.includes(category)}
                          onCheckedChange={() => handleToggleCategory(category)}
                          className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <label
                          htmlFor={`category-${category}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-[14px] font-medium text-white/90 leading-none">{category}</h4>
                            <span className="text-[12px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {categoryCourses.length} curso(s)
                            </span>
                          </div>
                          <p className="text-[12px] text-white/40 line-clamp-2 mt-1">
                            {categoryCourses.map(c => c.title).join(", ")}
                          </p>
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={assignCoursesMutation.isPending}
            className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={assignCoursesMutation.isPending}
            className="h-[44px] px-6 rounded-[12px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
          >
            {assignCoursesMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar Atribuições
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}