import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SortableRowProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

export function SortableRow({ id, children, className }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-border/50 hover:bg-white/5 transition-colors",
        isDragging && "opacity-50 bg-primary/10",
        className
      )}
    >
      <td className="w-10 pl-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-white/10 transition-colors"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </td>
      {children}
    </TableRow>
  );
}
