import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalSection, modalFieldClass } from "@/components/ui/modal";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UserPlus } from "lucide-react";

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", whatsapp: "", password: "" },
  });

  const createStudentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Sessão não encontrada. Faça login novamente.');

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...values, role: 'student', courseIds: [] }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao criar usuário');
      return result;
    },
    onSuccess: () => {
      toast.success("Aluno criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["adminStudents"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      let msg = error?.message || "Erro ao criar aluno";
      if (msg.includes("already been registered")) {
        msg = "Este e-mail já está cadastrado no sistema.";
      }
      toast.error(msg);
    },
  });

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-xl">
        <ModalHeader
          title="Criar Novo Aluno"
          description="Preencha os dados para criar uma nova conta de aluno"
          icon={<UserPlus className="h-5 w-5" />}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => createStudentMutation.mutate(v))}>
            <ModalBody>
              <ModalSection>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="João Silva" {...field} className={modalFieldClass} />
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
                        <Input type="email" placeholder="joao@example.com" {...field} className={modalFieldClass} />
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
                        <Input placeholder="+55 11 99999-9999" {...field} className={modalFieldClass} />
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
                        <Input type="password" placeholder="Mínimo 6 caracteres" {...field} className={modalFieldClass} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </ModalSection>
            </ModalBody>

            <ModalFooter
              onCancel={() => onOpenChange(false)}
              confirmLabel="Criar Aluno"
              pendingLabel="Criando..."
              isPending={createStudentMutation.isPending}
            />
          </form>
        </Form>
      </ModalContent>
    </Modal>
  );
}
