import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LessonListProps {
  lessons: any[];
  onEditLesson: (lesson: any) => void;
}

function SortableLesson({
  lesson,
  onEdit,
  onDelete,
}: {
  lesson: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-white/10 rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{lesson.title}</p>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
          <span>{lesson.duration}</span>
          <span className="truncate max-w-[200px]">{lesson.video_url}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Edit className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="hover:bg-destructive/10 text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function LessonList({ lessons, onEditLesson }: LessonListProps) {
  const queryClient = useQueryClient();
  const [items, setItems] = useState(lessons);
  const [deletingLesson, setDeletingLesson] = useState<any>(null);

  // Sync items with lessons prop
  useEffect(() => {
    setItems(lessons);
  }, [lessons]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const reorderMutation = useMutation({
    mutationFn: async (reorderedLessons: any[]) => {
      const updates = reorderedLessons.map((lesson, index) =>
        supabase
          .from("lessons")
          .update({ order_index: index })
          .eq("id", lesson.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courseModules"] });
      toast.success("Ordem atualizada!");
    },
    onError: () => {
      toast.error("Erro ao reordenar aulas");
      setItems(lessons);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from("lessons")
        .delete()
        .eq("id", lessonId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courseModules"] });
      toast.success("Aula excluída!");
      setDeletingLesson(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir aula");
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex);
      setItems(newItems);
      reorderMutation.mutate(newItems);
    }
  };

  if (lessons.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Nenhuma aula cadastrada
      </p>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={items} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {items.map((lesson) => (
              <SortableLesson
                key={lesson.id}
                lesson={lesson}
                onEdit={() => onEditLesson(lesson)}
                onDelete={() => setDeletingLesson(lesson)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <AlertDialog
        open={!!deletingLesson}
        onOpenChange={() => setDeletingLesson(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <Trash2 className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <AlertDialogTitle className="tracking-tight">Excluir Aula</AlertDialogTitle>
                <AlertDialogDescription className="mt-1">
                  A aula "{deletingLesson?.title}" será permanentemente excluída. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 pt-4 border-t border-white/5">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deletingLesson.id)}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              Excluir Aula
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
