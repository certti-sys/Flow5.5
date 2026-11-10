import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

interface CourseSelectorProps {
  selectedCourses: string[];
  onSelectionChange: (courses: string[]) => void;
}

export function CourseSelector({ selectedCourses, onSelectionChange }: CourseSelectorProps) {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["allCourses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, category, thumbnail")
        .order("title");
      
      if (error) throw error;
      return data;
    },
  });

  const handleToggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      onSelectionChange(selectedCourses.filter(id => id !== courseId));
    } else {
      onSelectionChange([...selectedCourses, courseId]);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Label>Selecione os Cursos ({selectedCourses.length} selecionados)</Label>
      <ScrollArea className="h-[300px] rounded-md border border-input p-4">
        <div className="space-y-3">
          {courses.map((course) => (
            <div key={course.id} className="flex items-start space-x-3">
              <Checkbox
                id={course.id}
                checked={selectedCourses.includes(course.id)}
                onCheckedChange={() => handleToggleCourse(course.id)}
              />
              <div className="flex-1 flex items-center gap-3">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-16 h-9 object-cover rounded"
                />
                <div className="flex-1">
                  <Label
                    htmlFor={course.id}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {course.title}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {course.category}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
