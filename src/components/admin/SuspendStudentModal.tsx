import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
  suspension_reason: z.string().min(10, "Motivo deve ter pelo menos 10 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

interface Student {
  id: string;
  name: string;
  status: string;
}

interface SuspendStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function SuspendStudentModal({ open, onOpenChange, student }: SuspendStudentModalProps) {
  const queryClient = useQueryClient();
  const isSuspended = student?.status === "suspended";

  const form = useForm<FormValues>({
    defaultValues: {
      suspension_reason: "",
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const suspendMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!student) return;

      const updates = isSuspended
        ? {
            status: "active",
            suspended_at: null,
            suspended_by: null,
            suspension_reason: null,
          }
        : {
            status: "suspended",
            suspended_at: new Date().toISOString(),
            suspended_by: (await supabase.auth.getUser()).data.user?.id,
            suspension_reason: values.suspension_reason,
          };

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", student.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(
        isSuspended
          ? "Aluno reativado com sucesso!"
          : "Aluno suspenso com sucesso!"
      );
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    const validation = formSchema.safeParse(values);
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          form.setError(err.path[0] as string, { message: err.message });
        }
      });
      return;
    }
    suspendMutation.mutate(values);
  };

  // If reactivating, skip form and submit directly
  const handleReactivate = () => {
    suspendMutation.mutate({ suspension_reason: "" });
  };

  if (isSuspended) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-md p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
          <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div className="text-left space-y-1">
                <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Reativar Conta</DialogTitle>
                <DialogDescription className="text-[14px] text-muted-foreground m-0">
                  Deseja reativar a conta de <strong className="text-white">{student?.name}</strong>?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px]">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={suspendMutation.isPending}
              className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] bg-transparent text-white mt-0 font-bold"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReactivate}
              disabled={suspendMutation.isPending}
              className="h-[44px] px-6 rounded-[12px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold border-0 mt-0"
            >
              {suspendMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reativar Conta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-md p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30 shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Suspender Conta</DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                Suspender a conta de <strong className="text-white">{student?.name}</strong>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <div className="p-6">
              <FormField
                control={form.control}
                name="suspension_reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[12px] uppercase tracking-widest font-bold text-white/40">Motivo da Suspensão</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo da suspensão..."
                        className="bg-white/5 border-white/5 min-h-[100px] rounded-[12px] focus:bg-white/[0.08] transition-all resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-red-400 text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <div className="p-6 border-t border-white/5 bg-black/40 flex justify-end gap-3 rounded-b-[20px]">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={suspendMutation.isPending}
                className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={suspendMutation.isPending}
                className="h-[44px] px-6 rounded-[12px] bg-red-500 hover:bg-red-600 text-white font-bold"
              >
                {suspendMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Suspender Conta
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
