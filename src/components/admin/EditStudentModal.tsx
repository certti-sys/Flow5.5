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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, User } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Student {
  id: string;
  name: string;
  email: string;
  whatsapp?: string;
}

interface EditStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: Student | null;
}

export function EditStudentModal({ open, onOpenChange, student }: EditStudentModalProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      email: "",
      whatsapp: "",
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (student) {
      form.reset({
        name: student.name,
        email: student.email,
        whatsapp: student.whatsapp || "",
      });
    }
  }, [student, form]);

  const updateStudentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!student) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          name: values.name,
          email: values.email,
          whatsapp: values.whatsapp || null,
        })
        .eq("id", student.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar perfil: ${error.message}`);
    },
  });

  const onSubmit = (values: FormValues) => {
    setFormErrors({});
    const validation = formSchema.safeParse(values);
    if (!validation.success) {
      validation.error.issues.forEach((err) => {
        if (err.path[0]) {
          form.setError(err.path[0] as string, { message: err.message });
        }
      });
      return;
    }
    updateStudentMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
              {student ? (
                <span className="text-primary font-bold text-lg">{student.name.substring(0, 2).toUpperCase()}</span>
              ) : (
                <User className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Editar Perfil do Aluno</DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                {student?.email || "Atualize as informações do aluno"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col">
            <div className="p-6 space-y-4">
              <div className="bg-black/20 border border-white/5 rounded-[12px] p-5 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Nome Completo</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="João Silva" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="joao@example.com" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">WhatsApp (opcional)</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="+55 11 99999-9999" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-primary/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="p-6 border-t border-white/5 bg-black/40 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateStudentMutation.isPending}
                className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={updateStudentMutation.isPending}
                className="h-[44px] px-6 rounded-[12px] font-bold"
              >
                {updateStudentMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
