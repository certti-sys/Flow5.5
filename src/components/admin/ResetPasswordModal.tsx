import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Key } from "lucide-react";
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

interface Student {
  id: string;
  name: string;
  email: string;
}

interface ResetPasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function ResetPasswordModal({ open, onOpenChange, student }: ResetPasswordModalProps) {
  const [showConfirm, setShowConfirm] = useState(true);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data.tempPassword;
    },
    onSuccess: (password) => {
      setTempPassword(password);
      setShowConfirm(false);
      toast.success("Senha resetada com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao resetar senha: ${error.message}`);
      onOpenChange(false);
    },
  });

  const handleConfirm = () => {
    if (student) {
      resetPasswordMutation.mutate(student.id);
    }
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      toast.success("Senha copiada para a área de transferência!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setShowConfirm(true);
    setTempPassword(null);
    setCopied(false);
    onOpenChange(false);
  };

  if (showConfirm) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="glass-card border-white/10 rounded-[20px] max-w-md p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
          <AlertDialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30 shrink-0">
                <Key className="h-5 w-5 text-amber-500" />
              </div>
              <div className="text-left space-y-1">
                <AlertDialogTitle className="text-[20px] font-bold text-white tracking-tight">Resetar Senha</AlertDialogTitle>
                <AlertDialogDescription className="text-[14px] text-muted-foreground m-0">
                  Tem certeza que deseja resetar a senha de <strong className="text-white">{student?.name}</strong>?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <div className="p-6">
            <p className="text-[14px] text-white/70">
              Uma nova senha temporária será gerada e você deverá compartilhá-la com o aluno.
            </p>
          </div>
          <AlertDialogFooter className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px] sm:justify-end py-4">
            <AlertDialogCancel 
              disabled={resetPasswordMutation.isPending}
              className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] bg-transparent text-white mt-0"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={resetPasswordMutation.isPending}
              className="h-[44px] px-6 rounded-[12px] bg-amber-500 hover:bg-amber-600 text-white font-bold border-0 mt-0"
            >
              {resetPasswordMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-md p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <Check className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Senha Gerada</DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                Compartilhe a senha com {student?.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-6">
          <div className="p-5 rounded-[12px] bg-black/20 border border-white/5">
            <p className="text-[12px] uppercase tracking-widest font-bold text-white/40 mb-3">Senha Temporária</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-[20px] font-mono font-bold text-emerald-400 bg-white/[0.02] px-4 py-3 rounded-[8px] border border-white/5">
                {tempPassword}
              </code>
              <Button
                variant="outline"
                onClick={handleCopyPassword}
                className="h-[52px] w-[52px] rounded-[8px] glass-card border-white/10 hover:bg-white/5 p-0"
              >
                {copied ? (
                  <Check className="h-5 w-5 text-emerald-500" />
                ) : (
                  <Copy className="h-5 w-5 text-white/70" />
                )}
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-[12px] bg-amber-500/10 border border-amber-500/20">
            <p className="text-[13px] text-amber-200/80 leading-relaxed">
              <strong className="text-amber-500">Importante:</strong> Esta senha é temporária e o aluno deverá alterá-la no primeiro acesso à plataforma.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end rounded-b-[20px]">
          <Button 
            onClick={handleClose}
            className="h-[44px] px-8 rounded-[12px] bg-white text-black hover:bg-white/90 font-bold"
          >
            Concluir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}