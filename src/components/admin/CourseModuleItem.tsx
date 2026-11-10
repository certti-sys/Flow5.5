import { Button } from "@/components/ui/button";
import { Plus, Edit, Trash2 } from "lucide-react";
import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { LessonList } from "@/components/admin/LessonList";
import { cn } from "@/lib/utils";

interface CourseModuleItemProps {
  module: any;
  courseId: string;
  onAddLesson: (courseId: string, moduleId: string) => void;
  onEditModule: (module: any) => void;
  onDeleteModule: (module: any) => void;
  onEditLesson: (lesson: any) => void;
}

export function CourseModuleItem({
  module,
  courseId,
  onAddLesson,
  onEditModule,
  onDeleteModule,
  onEditLesson,
}: CourseModuleItemProps) {
  const handleEditModule = () => {
    onEditModule(module);
  };

  const handleDeleteModule = () => {
    onDeleteModule(module);
  };

  const handleEditLesson = (lesson: any) => {
    onEditLesson(lesson);
  };

  return (
    <AccordionItem
      key={module.id}
      value={module.id}
      className="border border-white/5 rounded-[20px] bg-white/[0.02] overflow-hidden px-5 hover:border-white/10 transition-colors"
    >
      <AccordionTrigger className="py-5 hover:no-underline group/module transition-all">
        <div className="flex items-center justify-between flex-1 mr-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center font-black text-[14px] text-white/30 border border-white/5 group-hover/module:border-primary/30 group-hover/module:text-primary transition-all">
              {module.order_index + 1}
            </div>
            <div className="text-left">
              <span className="font-bold text-[15px] text-white group-hover/module:text-primary transition-colors">
                {module.title}
              </span>
              <p className="text-[11px] text-muted-foreground/60">
                {module.lessons?.length || 0} aulas cadastradas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 opacity-0 group-hover/module:opacity-100 transition-opacity">
              <Button
                variant="ghost" size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditModule();
                }}
                className="w-9 h-9 rounded-xl hover:bg-primary/20 hover:text-primary transition-all"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModule();
                }}
                className="w-9 h-9 rounded-xl hover:bg-red-500/20 hover:text-red-500 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-6">
        <div className="space-y-5 pt-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/20">
              Listagem de Aulas
            </span>
            <Button
              variant="ghost" size="sm"
              onClick={() => onAddLesson(courseId, module.id)}
              className="h-[34px] px-4 rounded-xl border border-white/10 hover:bg-white/10 text-[11px] font-bold uppercase tracking-wider gap-2"
            >
              <Plus className="w-3.5 h-3.5 text-primary" />
              Nova Aula
            </Button>
          </div>
          <div className="bg-black/20 rounded-[18px] border border-white/5 p-2 overflow-hidden">
            <LessonList
              lessons={module.lessons || []}
              onEditLesson={(lesson) => handleEditLesson(lesson)}
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}