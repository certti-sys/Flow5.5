import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
} from "@/components/ui/accordion";
import { CourseModuleItem } from "@/components/admin/CourseModuleItem";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";

interface CourseModuleAccordionProps {
  modules: any[];
  courseId: string;
  onAddModule: () => void;
  onAddLesson: (courseId: string, moduleId: string) => void;
  onEditModule: (module: any, courseId: string) => void;
  onDeleteModule: (module: any) => void;
  onEditLesson: (lesson: any, courseId: string) => void;
  onReorder: (active: { id: string }, over: { id: string }) => void;
}

export function CourseModuleAccordion({
  modules,
  courseId,
  onAddModule,
  onAddLesson,
  onEditModule,
  onDeleteModule,
  onEditLesson,
  onReorder,
}: CourseModuleAccordionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onReorder(active, over);
  };

  const handleEditModule = (module: any) => {
    onEditModule(module, courseId);
  };

  const handleDeleteModule = (module: any) => {
    onDeleteModule(module);
  };

  const handleEditLesson = (lesson: any) => {
    onEditLesson(lesson, courseId);
  };

  return (
    <>
      {modules.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <Accordion type="multiple" className="space-y-4">
              {modules.map((module, index) => (
                <CourseModuleItem
                  key={module.id}
                  index={index}
                  module={module}
                  courseId={courseId}
                  onAddLesson={onAddLesson}
                  onEditModule={handleEditModule}
                  onDeleteModule={handleDeleteModule}
                  onEditLesson={handleEditLesson}
                />
              ))}
            </Accordion>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-center py-16 bg-white/[0.01] rounded-[24px] border border-dashed border-white/10 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
            <Plus className="w-8 h-8 text-white/10" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-white uppercase tracking-widest">
              Nenhum módulo
            </p>
            <p className="text-[12px] text-muted-foreground mt-1">
              Comece criando a estrutura para suas aulas.
            </p>
          </div>
          <Button
            variant="link" onClick={onAddModule}
            className="text-primary font-bold text-[13px]"
          >
            Criar Primeiro Módulo
          </Button>
        </div>
      )}
    </>
  );
}