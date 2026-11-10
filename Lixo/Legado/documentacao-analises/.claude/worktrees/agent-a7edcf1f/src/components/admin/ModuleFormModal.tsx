import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FolderPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const moduleSchema = z.object({
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
});

interface ModuleFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  module?: any;
}

export function ModuleFormModal({
  open,
  onOpenChange,
  courseId,
  module,
}: ModuleFormModalProps) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(module?.title || "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const saveMutation = useMutation({
    mutationFn: async () => {
      const validation = moduleSchema.safeParse({ title });
      if (!validation.success) {
        const formattedErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            formattedErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(formattedErrors);
        throw new Error("Validação falhou");
      }

      if (module) {
        const { error } = await supabase
          .from("modules")
          .update({ title })
          .eq("id", module.id);
        if (error) throw error;
      } else {
        const { data: maxOrder } = await supabase
          .from("modules")
          .select("order_index")
          .eq("course_id", courseId)
          .order("order_index", { ascending: false })
          .limit(1)
          .single();

        const { error } = await supabase.from("modules").insert({
          course_id: courseId,
          title,
          order_index: (maxOrder?.order_index || 0) + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courseModules"] });
      toast.success(module ? "Módulo atualizado!" : "Módulo criado!");
      onOpenChange(false);
      setTitle("");
      setErrors({});
    },
    onError: (error: any) => {
      if (error.message !== "Validação falhou") {
        toast.error(error.message || "Erro ao salvar módulo");
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] sm:max-w-[500px] p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              <FolderPlus className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">
                {module ? "Editar Módulo" : "Novo Módulo"}
              </DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                {module ? "Atualize o título do módulo" : "Crie um novo módulo para organizar as aulas"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-white/80 font-medium">Título do Módulo</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Introdução ao curso"
                className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3 rounded-b-[20px]">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="h-[44px] px-6 rounded-[12px] font-bold bg-primary hover:bg-primary/90 text-white w-full sm:w-auto min-w-[120px]"
          >
            {saveMutation.isPending ? "Salvando..." : "Salvar Módulo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
