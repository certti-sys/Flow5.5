import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Loader2, GripVertical, X, Plus } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface DraggableCourseSelectorProps {
  selectedCourses: string[];
  onSelectionChange: (courses: string[]) => void;
}

interface SortableItemProps {
  course: any;
  onRemove: () => void;
}

function SortableItem({ course, onRemove }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: course.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-white/[0.08] hover:bg-muted transition-colors"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <img
        src={course.thumbnail}
        alt={course.title}
        className="w-16 h-9 object-cover rounded"
      />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{course.title}</p>
        <p className="text-xs text-muted-foreground">{course.category}</p>
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function DraggableCourseSelector({
  selectedCourses,
  onSelectionChange,
}: DraggableCourseSelectorProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch all courses
  const { data: allCourses = [], isLoading } = useQuery({
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

  // Get selected courses in order
  const orderedCourses = selectedCourses
    .map((id) => allCourses.find((c) => c.id === id))
    .filter((c) => c !== undefined);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = selectedCourses.indexOf(active.id as string);
      const newIndex = selectedCourses.indexOf(over.id as string);

      const newOrder = arrayMove(selectedCourses, oldIndex, newIndex);
      onSelectionChange(newOrder);
    }
  };

  const handleRemoveCourse = (courseId: string) => {
    onSelectionChange(selectedCourses.filter((id) => id !== courseId));
  };

  const handleToggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      onSelectionChange(selectedCourses.filter((id) => id !== courseId));
    } else {
      onSelectionChange([...selectedCourses, courseId]);
    }
  };

  const availableCourses = allCourses.filter(
    (course) => !selectedCourses.includes(course.id)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>
          Cursos Selecionados ({selectedCourses.length})
        </Label>
        
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Cursos
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Cursos ao Carrossel</DialogTitle>
              <DialogDescription>
                Selecione os cursos que deseja adicionar. Você poderá reordenar depois.
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {availableCourses.map((course) => (
                  <div key={course.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`add-${course.id}`}
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
                          htmlFor={`add-${course.id}`}
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

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {selectedCourses.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-white/[0.08] rounded-lg">
          <p className="text-sm text-muted-foreground mb-4">
            Nenhum curso selecionado
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Curso
          </Button>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={selectedCourses}
            strategy={verticalListSortingStrategy}
          >
            <ScrollArea className="h-[320px] rounded-md border border-input p-4">
              <div className="space-y-2">
                {orderedCourses.map((course, index) => (
                  <div key={course.id} className="relative">
                    <div className="absolute -left-8 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
                      {index + 1}
                    </div>
                    <SortableItem
                      course={course}
                      onRemove={() => handleRemoveCourse(course.id)}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SortableContext>
        </DndContext>
      )}
      
      <p className="text-xs text-muted-foreground">
        Arraste os cursos para reordenar. A ordem aqui será a ordem de exibição no carrossel.
      </p>
    </div>
  );
}
