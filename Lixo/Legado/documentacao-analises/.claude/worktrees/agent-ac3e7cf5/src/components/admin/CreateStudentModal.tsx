import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Loader2, Plus, UserPlus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  whatsapp: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStudentModal({ open, onOpenChange }: CreateStudentModalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      whatsapp: "",
      password: "",
    },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: values,
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success("Aluno criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar aluno: ${error.message}`);
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      await createStudentMutation.mutateAsync(values);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 rounded-[20px] max-w-xl p-0 overflow-hidden bg-black/90 backdrop-blur-xl">
        <DialogHeader className="px-6 py-5 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
              <UserPlus className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="text-left space-y-1">
              <DialogTitle className="text-[20px] font-bold text-white tracking-tight">Criar Novo Aluno</DialogTitle>
              <DialogDescription className="text-[14px] text-muted-foreground m-0">
                Preencha os dados para criar uma nova conta de aluno
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
                          className="bg-transparent border-white/10 focus-visible:ring-emerald-500/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
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
                          className="bg-transparent border-white/10 focus-visible:ring-emerald-500/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
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
                          className="bg-transparent border-white/10 focus-visible:ring-emerald-500/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Senha</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="••••••••" 
                          {...field} 
                          className="bg-transparent border-white/10 focus-visible:ring-emerald-500/50 text-white placeholder:text-muted-foreground/50 h-[44px]"
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
                disabled={isLoading}
                className="h-[44px] px-6 glass-card border-white/10 hover:bg-white/5 rounded-[12px] text-white bg-transparent font-bold"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-[44px] px-6 rounded-[12px] bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Aluno
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}