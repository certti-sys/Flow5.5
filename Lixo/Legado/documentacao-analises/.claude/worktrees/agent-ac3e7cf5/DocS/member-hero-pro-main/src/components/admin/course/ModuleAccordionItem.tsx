import { GripVertical, Edit, Trash2, Plus, MoreVertical, Eye, EyeOff, ChevronDown, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  SensorDescriptor,
  SensorOptions,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { LessonRow } from "./LessonRow";
import type { Module } from "@/hooks/useModules";
import type { Lesson } from "@/hooks/useLessons";

interface AvailableModule {
  id: string;
  nome: string;
}

interface ModuleAccordionItemProps {
  module: Module;
  lessons: Lesson[];
  onEditModule: (module: Module) => void;
  onDeleteModule: (moduleId: string) => void;
  onToggleModuleStatus: (moduleId: string, currentStatus: 'Publicado' | 'Rascunho') => void;
  onDuplicateModule: (moduleId: string) => void;
  onCreateLesson: (moduleId: string) => void;
  onEditLesson: (lesson: Lesson) => void;
  onDeleteLesson: (lessonId: string) => void;
  onToggleLessonStatus: (lessonId: string, currentStatus: 'Publicado' | 'Rascunho') => void;
  onDuplicateLesson: (lessonId: string) => void;
  onPreviewLesson?: (lesson: Lesson) => void;
  onMoveLesson?: (lessonId: string, targetModuleId: string) => void;
  availableModules?: AvailableModule[];
  onDragEndLessons: (event: DragEndEvent) => void;
  sensors: SensorDescriptor<SensorOptions>[];
}

export function ModuleAccordionItem({
  module,
  lessons,
  onEditModule,
  onDeleteModule,
  onToggleModuleStatus,
  onDuplicateModule,
  onCreateLesson,
  onEditLesson,
  onDeleteLesson,
  onToggleLessonStatus,
  onDuplicateLesson,
  onPreviewLesson,
  onMoveLesson,
  availableModules = [],
  onDragEndLessons,
  sensors,
}: ModuleAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDragging ? "opacity-50 scale-[1.02]" : ""} transition-all duration-200`}
    >
      <AccordionItem
        value={module.id}
        className="border border-border/50 rounded-xl bg-card/30 overflow-hidden group/accordion data-[state=open]:border-primary/30 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/5 transition-all duration-300"
      >
        <div className="flex items-center gap-2 px-3 sm:px-4 py-3 bg-card/50 hover:bg-card/80 transition-all duration-200 border-l-2 border-l-transparent hover:border-l-primary group-data-[state=open]/accordion:border-l-primary group-data-[state=open]/accordion:bg-card/70">
          {/* Drag Handle */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors opacity-50 hover:opacity-100"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Accordion Trigger with Custom Arrow */}
          <AccordionTrigger className="flex-1 min-w-0 hover:no-underline py-0 [&>svg]:hidden">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-left w-full min-w-0">
              <ChevronDown className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 transition-transform duration-300 group-data-[state=open]/accordion:rotate-180" />
              <span className="font-medium truncate max-w-[100px] sm:max-w-[180px] md:max-w-none">{module.nome}</span>
              <Badge
                variant={module.status === "Publicado" ? "default" : "secondary"}
                className={`text-xs shrink-0 ${
                  module.status === "Publicado"
                    ? "bg-primary/20 text-primary border-primary/30"
                    : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {module.status}
              </Badge>
              <span className="text-xs sm:text-sm text-muted-foreground shrink-0 hidden sm:inline">
                {lessons.length} {lessons.length === 1 ? "aula" : "aulas"}
              </span>
            </div>
          </AccordionTrigger>

          {/* Action Buttons Group - Always stay together on the right */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Add Lesson Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onCreateLesson(module.id);
              }}
              className="gap-1 h-10 w-10 sm:h-8 sm:w-auto min-h-[44px] sm:min-h-0 px-0 sm:px-3 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Aula</span>
            </Button>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px] hover:bg-white/10">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-card border-border">
                <DropdownMenuItem onClick={() => onEditModule(module)} className="min-h-[44px] py-3">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Módulo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDuplicateModule(module.id)} className="min-h-[44px] py-3">
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar Módulo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleModuleStatus(module.id, module.status)} className="min-h-[44px] py-3">
                  {module.status === "Publicado" ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Despublicar
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Publicar
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive min-h-[44px] py-3"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Módulo
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir módulo?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação não pode ser desfeita. O módulo "{module.nome}" e todas as suas aulas serão excluídos permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0">
                      <AlertDialogCancel className="min-h-[44px] w-full sm:w-auto">Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDeleteModule(module.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 min-h-[44px] w-full sm:w-auto"
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <AccordionContent className="pb-0 data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="p-4 pt-2 space-y-3 bg-background/20">
            {lessons.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border/50 rounded-lg bg-card/20">
                <p className="text-sm text-muted-foreground mb-3">
                  Nenhuma aula neste módulo
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCreateLesson(module.id)}
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Primeira Aula
                </Button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEndLessons}
              >
                <SortableContext
                  items={lessons.map((l) => l.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {lessons.map((lesson) => (
                      <LessonRow
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={onEditLesson}
                        onDelete={onDeleteLesson}
                        onToggleStatus={onToggleLessonStatus}
                        onDuplicate={onDuplicateLesson}
                        onPreview={onPreviewLesson}
                        onMoveToModule={onMoveLesson}
                        availableModules={availableModules}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Add Lesson Button */}
            {lessons.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCreateLesson(module.id)}
                className="w-full gap-2 border-dashed border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <Plus className="h-4 w-4" />
                Adicionar Aula
              </Button>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </div>
  );
}
