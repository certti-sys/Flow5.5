import { GripVertical, Video, FileText, File, Link2, Edit, Trash2, MoreVertical, Eye, EyeOff, Copy, Play, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
import type { Lesson } from "@/hooks/useLessons";

interface AvailableModule {
  id: string;
  nome: string;
}

interface LessonRowProps {
  lesson: Lesson;
  onEdit: (lesson: Lesson) => void;
  onDelete: (lessonId: string) => void;
  onToggleStatus: (lessonId: string, currentStatus: 'Publicado' | 'Rascunho') => void;
  onDuplicate: (lessonId: string) => void;
  onPreview?: (lesson: Lesson) => void;
  onMoveToModule?: (lessonId: string, targetModuleId: string) => void;
  availableModules?: AvailableModule[];
}

const tipoIcons: Record<string, React.ElementType> = {
  video: Video,
  pdf: FileText,
  arquivo: File,
  externo: Link2,
};

const tipoLabels: Record<string, string> = {
  video: "Vídeo",
  pdf: "PDF",
  arquivo: "Arquivo",
  externo: "Link",
};

export function LessonRow({ 
  lesson, 
  onEdit, 
  onDelete, 
  onToggleStatus, 
  onDuplicate,
  onPreview,
  onMoveToModule,
  availableModules = []
}: LessonRowProps) {
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
  };

  const Icon = tipoIcons[lesson.tipo] || File;
  
  // Filter out the current module from available modules
  const otherModules = availableModules.filter(m => m.id !== lesson.moduloId);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 rounded-lg bg-background/30 border border-border/30 hover:border-primary/30 hover:bg-background/50 hover:shadow-md hover:shadow-primary/5 transition-all duration-200 group ${
        isDragging ? "opacity-50 scale-[1.02]" : ""
      }`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors opacity-50 group-hover:opacity-100"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Icon */}
      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
        <Icon className="h-4 w-4 text-primary" />
      </div>

      {/* Thumbnail (if exists) */}
      {lesson.thumbnail && (
        <img
          src={lesson.thumbnail}
          alt={lesson.nome}
          className="w-12 h-8 object-cover rounded border border-border/30"
        />
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate group-hover:text-primary transition-colors">{lesson.nome}</p>
        <p className="text-xs text-muted-foreground">{tipoLabels[lesson.tipo]}</p>
      </div>

      {/* Status Badge */}
      <Badge
        variant={lesson.status === "Publicado" ? "default" : "secondary"}
        className={
          lesson.status === "Publicado"
            ? "bg-primary/20 text-primary border-primary/30"
            : "bg-muted/50 text-muted-foreground"
        }
      >
        {lesson.status}
      </Badge>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 opacity-50 group-hover:opacity-100 transition-opacity">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 bg-card border-border">
          {/* Preview Button */}
          {onPreview && (
            <DropdownMenuItem onClick={() => onPreview(lesson)}>
              <Play className="h-4 w-4 mr-2" />
              Preview
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onClick={() => onEdit(lesson)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar Aula
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDuplicate(lesson.id)}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicar Aula
          </DropdownMenuItem>

          {/* Move to Module Submenu */}
          {onMoveToModule && otherModules.length > 0 && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Mover para Módulo
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="bg-card border-border">
                {otherModules.map((modulo) => (
                  <DropdownMenuItem 
                    key={modulo.id}
                    onClick={() => onMoveToModule(lesson.id, modulo.id)}
                  >
                    {modulo.nome}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}

          <DropdownMenuItem onClick={() => onToggleStatus(lesson.id, lesson.status)}>
            {lesson.status === "Publicado" ? (
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
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Aula
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. A aula "{lesson.nome}" será excluída permanentemente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(lesson.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
