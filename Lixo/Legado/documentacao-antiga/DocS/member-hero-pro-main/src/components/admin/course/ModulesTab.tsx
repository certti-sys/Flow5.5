import { useState } from "react";
import { Plus, AlertTriangle, CheckCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
} from "@/components/ui/accordion";
import { useModules, Module } from "@/hooks/useSupabaseModules";
import { useLessons, Lesson } from "@/hooks/useSupabaseLessons";
import { ModuleAccordionItem } from "./ModuleAccordionItem";
import { ModuleFormDialog } from "./ModuleFormDialog";
import { LessonFormDialog } from "./LessonFormDialog";
import { LessonPreviewDialog } from "./LessonPreviewDialog";
import { useToast } from "@/hooks/use-toast";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface ModulesTabProps {
  courseId: string;
  courseStatus: "Publicado" | "Rascunho";
  onPublishCourse: () => void;
}

export function ModulesTab({ courseId, courseStatus, onPublishCourse }: ModulesTabProps) {
  const { toast } = useToast();
  const { obterModulosPorCurso, criarModulo, editarModulo, excluirModulo, duplicarModulo, reordenarModulos, alterarStatusModulo } = useModules();
  const { obterAulasPorModulo, criarAula, editarAula, excluirAula, duplicarAula, reordenarAulas, alterarStatus, moverAulaParaModulo } = useLessons();

  const modulos = obterModulosPorCurso(courseId);

  // Module dialog state
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  // Lesson dialog state
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [currentModuleId, setCurrentModuleId] = useState<string>("");

  // Preview dialog state
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Module handlers
  const handleCreateModule = () => {
    setEditingModule(null);
    setModuleDialogOpen(true);
  };

  const handleEditModule = (module: Module) => {
    setEditingModule(module);
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async (data: Omit<Module, 'id' | 'criadoEm'>) => {
    if (editingModule) {
      await editarModulo(editingModule.id, data);
      toast({ title: "Módulo atualizado", description: `"${data.nome}" foi atualizado com sucesso.` });
    } else {
      const ordem = modulos.length + 1;
      await criarModulo({ ...data, cursoId: courseId, ordem });
      toast({ title: "Módulo criado", description: `"${data.nome}" foi criado com sucesso.` });
    }
    setModuleDialogOpen(false);
    setEditingModule(null);
  };

  const handleDeleteModule = (moduleId: string) => {
    excluirModulo(moduleId);
    toast({ title: "Módulo excluído", description: "O módulo foi excluído permanentemente." });
  };

  const handleToggleModuleStatus = async (moduleId: string) => {
    await alterarStatusModulo(moduleId);
    toast({ title: "Status do módulo alterado!" });
  };

  const handleDuplicateModule = async (moduleId: string) => {
    const duplicated = await duplicarModulo(moduleId);
    if (duplicated) {
      toast({ title: "Módulo duplicado", description: `"${duplicated.nome}" foi criado como cópia.` });
    }
  };

  // Lesson handlers
  const handleCreateLesson = (moduleId: string) => {
    setCurrentModuleId(moduleId);
    setEditingLesson(null);
    setLessonDialogOpen(true);
  };

  const handleEditLesson = (lesson: Lesson) => {
    setCurrentModuleId(lesson.moduloId);
    setEditingLesson(lesson);
    setLessonDialogOpen(true);
  };

  const handleSaveLesson = async (data: Omit<Lesson, 'id' | 'criadoEm'>) => {
    if (editingLesson) {
      await editarAula(editingLesson.id, data);
      toast({ title: "Aula atualizada", description: `"${data.nome}" foi atualizada com sucesso.` });
    } else {
      const aulasDoModulo = obterAulasPorModulo(currentModuleId);
      const ordem = aulasDoModulo.length + 1;
      await criarAula({ ...data, moduloId: currentModuleId, cursoId: courseId, ordem });
      toast({ title: "Aula criada", description: `"${data.nome}" foi criada com sucesso.` });
    }
    setLessonDialogOpen(false);
    setEditingLesson(null);
  };

  const handleDeleteLesson = (lessonId: string) => {
    excluirAula(lessonId);
    toast({ title: "Aula excluída", description: "A aula foi excluída permanentemente." });
  };

  const handleToggleLessonStatus = async (lessonId: string) => {
    await alterarStatus(lessonId);
    toast({ title: "Status da aula alterado!" });
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    const duplicated = await duplicarAula(lessonId);
    if (duplicated) {
      toast({ title: "Aula duplicada", description: `"${duplicated.nome}" foi criada como cópia.` });
    }
  };

  // Preview lesson handler
  const handlePreviewLesson = (lesson: Lesson) => {
    setPreviewLesson(lesson);
  };

  // Move lesson to another module handler
  const handleMoveLesson = async (lessonId: string, targetModuleId: string) => {
    try {
      await moverAulaParaModulo(lessonId, targetModuleId, courseId);
      const targetModule = modulos.find(m => m.id === targetModuleId);
      toast({ 
        title: "Aula movida", 
        description: `A aula foi movida para "${targetModule?.nome || 'outro módulo'}".` 
      });
    } catch (error) {
      toast({ 
        title: "Erro ao mover", 
        description: "Não foi possível mover a aula.",
        variant: "destructive"
      });
    }
  };

  // Drag and drop handler for modules
  const handleDragEndModules = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = modulos.findIndex((m) => m.id === active.id);
      const newIndex = modulos.findIndex((m) => m.id === over.id);
      const newOrder = arrayMove(modulos, oldIndex, newIndex);
      await reordenarModulos(newOrder);
    }
  };

  // Drag and drop handler for lessons within a module
  const handleDragEndLessons = (moduleId: string) => async (event: DragEndEvent) => {
    const { active, over } = event;
    const aulas = obterAulasPorModulo(moduleId);

    if (over && active.id !== over.id) {
      const oldIndex = aulas.findIndex((a) => a.id === active.id);
      const newIndex = aulas.findIndex((a) => a.id === over.id);
      const newOrder = arrayMove(aulas, oldIndex, newIndex);
      await reordenarAulas(newOrder);
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Alert */}
      {courseStatus === "Rascunho" && (
        <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
            <div>
              <p className="font-medium text-yellow-500">Curso em Rascunho</p>
              <p className="text-sm text-muted-foreground">
                Este curso não está visível para os alunos. Publique-o para liberar o acesso.
              </p>
            </div>
          </div>
          <Button 
            onClick={onPublishCourse}
            className="bg-green-600 hover:bg-green-700 text-white gap-2 min-h-[44px] w-full sm:w-auto shrink-0"
          >
            <Send className="h-4 w-4" />
            Publicar Curso
          </Button>
        </div>
      )}

      {courseStatus === "Publicado" && (
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <p className="text-sm text-green-500">Curso publicado e visível para os alunos</p>
        </div>
      )}

      <Card className="glass-card border-border/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <CardTitle className="text-lg">Módulos e Aulas</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Organize a estrutura do seu curso de forma hierárquica
            </p>
          </div>
          <Button onClick={handleCreateModule} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 min-h-[44px] w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Criar Módulo
          </Button>
        </CardHeader>
      <CardContent>
        {modulos.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border/50 rounded-xl">
            <p className="text-muted-foreground mb-4">
              Nenhum módulo criado ainda. Comece adicionando seu primeiro módulo.
            </p>
            <Button onClick={handleCreateModule} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Módulo
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndModules}
          >
            <SortableContext
              items={modulos.map((m) => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <Accordion type="multiple" className="space-y-3">
                {modulos.map((modulo) => (
                  <ModuleAccordionItem
                    key={modulo.id}
                    module={modulo}
                    lessons={obterAulasPorModulo(modulo.id)}
                    onEditModule={handleEditModule}
                    onDeleteModule={handleDeleteModule}
                    onToggleModuleStatus={handleToggleModuleStatus}
                    onDuplicateModule={handleDuplicateModule}
                    onCreateLesson={handleCreateLesson}
                    onEditLesson={handleEditLesson}
                    onDeleteLesson={handleDeleteLesson}
                    onToggleLessonStatus={handleToggleLessonStatus}
                    onDuplicateLesson={handleDuplicateLesson}
                    onPreviewLesson={handlePreviewLesson}
                    onMoveLesson={handleMoveLesson}
                    availableModules={modulos.map(m => ({ id: m.id, nome: m.nome }))}
                    onDragEndLessons={handleDragEndLessons(modulo.id)}
                    sensors={sensors}
                  />
                ))}
              </Accordion>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      {/* Module Dialog */}
      <ModuleFormDialog
        open={moduleDialogOpen}
        onOpenChange={setModuleDialogOpen}
        module={editingModule}
        onSave={handleSaveModule}
      />

      {/* Lesson Dialog */}
      <LessonFormDialog
        open={lessonDialogOpen}
        onOpenChange={setLessonDialogOpen}
        lesson={editingLesson}
        moduleId={currentModuleId}
        courseId={courseId}
        onSave={handleSaveLesson}
      />

      {/* Preview Dialog */}
      <LessonPreviewDialog
        open={!!previewLesson}
        onOpenChange={(open) => !open && setPreviewLesson(null)}
        lesson={previewLesson}
      />
      </Card>
    </div>
  );
}
