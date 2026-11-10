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
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;
}

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Confirmar Exclusão",
  description = "Tem certeza que deseja excluir? Esta ação não pode ser desfeita.",
  confirmLabel = "Excluir",
  isPending = false,
}: ConfirmDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="glass-card border-white/10 rounded-[20px] max-w-md p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <AlertDialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-left space-y-1">
              <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">{title}</AlertDialogTitle>
              <AlertDialogDescription className="text-[14px] text-muted-foreground m-0">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px] sm:justify-end">
          <AlertDialogCancel 
            disabled={isPending}
            className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] bg-transparent text-white mt-0"
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isPending}
            className="h-[44px] px-6 rounded-[12px] bg-red-500 hover:bg-red-600 text-white font-bold border-0 mt-0"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
