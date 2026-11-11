import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Shell único de modal do design system.
 *
 * Antes cada modal repetia à mão `glass-card border-white/10 rounded-[20px]
 * p-0 overflow-hidden bg-black/90 backdrop-blur-xl` e variava raio (20/24/32),
 * blur (xl/2xl/3xl) e padding do cabeçalho (py-5 vs py-6 vs p-8). Aqui a
 * estrutura é definida uma vez.
 */

const TONES = {
  primary: { icon: "bg-primary/20 border-primary/30 text-primary", action: "bg-primary hover:bg-primary/90 text-primary-foreground" },
  success: { icon: "bg-emerald-500/20 border-emerald-500/30 text-emerald-500", action: "bg-emerald-500 hover:bg-emerald-600 text-white" },
  warning: { icon: "bg-amber-500/20 border-amber-500/30 text-amber-500", action: "bg-amber-500 hover:bg-amber-600 text-white" },
  danger: { icon: "bg-red-500/20 border-red-500/30 text-red-500", action: "bg-red-500 hover:bg-red-600 text-white" },
} as const;

export type ModalTone = keyof typeof TONES;

export const modalContentClass =
  "glass-card border-white/10 rounded-[20px] p-0 overflow-hidden bg-black/90 backdrop-blur-xl";

export const modalFooterClass =
  "p-6 border-t border-white/5 bg-black/40 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3";

export const modalFieldClass =
  "bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/80 h-[44px]";

/** Cartão interno que agrupa campos dentro do corpo do modal. */
export function ModalSection({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4", className)}
      {...props}
    />
  );
}

interface ModalHeaderProps {
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** Texto curto no avatar quando não há ícone (ex.: iniciais do aluno). */
  badge?: string;
  tone?: ModalTone;
  className?: string;
}

export function ModalHeader({
  title,
  description,
  icon,
  badge,
  tone = "primary",
  className,
}: ModalHeaderProps) {
  return (
    <div
      className={cn(
        "px-6 py-5 border-b border-white/5 bg-white/[0.02] flex items-center gap-4",
        className,
      )}
    >
      {(icon || badge) && (
        <div
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center border shrink-0",
            TONES[tone].icon,
          )}
          aria-hidden="true"
        >
          {badge ? <span className="font-bold text-lg">{badge}</span> : icon}
        </div>
      )}
      <div className="text-left space-y-1 min-w-0">
        <DialogTitle className="text-[20px] font-bold text-white tracking-tight">{title}</DialogTitle>
        {description && (
          <DialogDescription className="text-[14px] text-muted-foreground m-0">
            {description}
          </DialogDescription>
        )}
      </div>
    </div>
  );
}

export function ModalBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6 space-y-4", className)} {...props} />;
}

interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  onCancel?: () => void;
  cancelLabel?: string;
  confirmLabel: string;
  onConfirm?: () => void;
  confirmType?: "button" | "submit";
  isPending?: boolean;
  pendingLabel?: string;
  tone?: ModalTone;
  cancelDisabled?: boolean;
  confirmDisabled?: boolean;
}

export function ModalFooter({
  onCancel,
  cancelLabel = "Cancelar",
  confirmLabel,
  onConfirm,
  confirmType = "submit",
  isPending = false,
  pendingLabel,
  tone = "primary",
  cancelDisabled,
  confirmDisabled,
  className,
  ...props
}: ModalFooterProps) {
  return (
    <div className={cn(modalFooterClass, className)} {...props}>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending || cancelDisabled}
          className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
        >
          {cancelLabel}
        </Button>
      )}
      <Button
        type={confirmType}
        onClick={onConfirm}
        disabled={isPending || confirmDisabled}
        className={cn("h-[44px] px-6 rounded-[12px] font-bold min-w-[120px]", TONES[tone].action)}
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {isPending && pendingLabel ? pendingLabel : confirmLabel}
      </Button>
    </div>
  );
}

/**
 * Variante do `DialogContent` já com o chrome do design system.
 * Use no lugar de repetir as classes em cada modal.
 */
export const ModalContent = React.forwardRef<
  React.ElementRef<typeof DialogContent>,
  React.ComponentPropsWithoutRef<typeof DialogContent>
>(({ className, ...props }, ref) => (
  <DialogContent ref={ref} className={cn(modalContentClass, className)} {...props} />
));
ModalContent.displayName = "ModalContent";

export { Dialog as Modal };
