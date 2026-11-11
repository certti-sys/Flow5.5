import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Award } from "lucide-react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalSection,
} from "@/components/ui/modal";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const schema = z.object({
  userId: z.string().min(1, "Selecione o aluno"),
  courseId: z.string().min(1, "Selecione o curso"),
});

type FormValues = z.infer<typeof schema>;

interface IssueCertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IssueCertificateModal({ open, onOpenChange }: IssueCertificateModalProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { userId: "", courseId: "" },
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery({
    queryKey: ["certificateStudents"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email")
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string | null; email: string | null }[];
    },
  });

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
    queryKey: ["certificateCourses"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .order("title");
      if (error) throw error;
      return data as { id: string; title: string | null }[];
    },
  });

  const issueMutation = useMutation({
    mutationFn: async ({ userId, courseId }: FormValues) => {
      // Certificado é único por (user_id, course_id): devolve o existente
      // em vez de estourar o unique constraint.
      const { data: existing, error: existingError } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId)
        .eq("course_id", courseId)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) return { id: existing.id, reused: true };

      const { data, error } = await supabase
        .from("certificates")
        .insert({ user_id: userId, course_id: courseId })
        .select("id")
        .single();

      if (error) throw error;
      return { id: data.id, reused: false };
    },
    onSuccess: ({ id, reused }) => {
      toast.success(reused ? "Aluno já possui este certificado. Abrindo..." : "Certificado emitido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin_certificates"] });
      form.reset();
      onOpenChange(false);
      navigate(`/certificado/${id}`);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao emitir certificado");
    },
  });

  const semDados = !loadingStudents && !loadingCourses && (students.length === 0 || courses.length === 0);

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-lg">
        <ModalHeader
          title="Novo Certificado"
          description="Emita um certificado manualmente para um aluno"
          icon={<Award className="h-5 w-5" />}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => issueMutation.mutate(v))}>
            <ModalBody>
              <ModalSection>
                <FormField
                  control={form.control}
                  name="userId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Aluno</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingStudents}>
                        <FormControl>
                          <SelectTrigger className="h-[44px] bg-transparent border-white/10 text-white">
                            <SelectValue placeholder={loadingStudents ? "Carregando..." : "Selecione o aluno"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent container={document.body} className="z-[10001] max-h-[280px]">
                          {students.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name || s.email || s.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="courseId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80 font-medium">Curso</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={loadingCourses}>
                        <FormControl>
                          <SelectTrigger className="h-[44px] bg-transparent border-white/10 text-white">
                            <SelectValue placeholder={loadingCourses ? "Carregando..." : "Selecione o curso"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent container={document.body} className="z-[10001] max-h-[280px]">
                          {courses.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.title || c.id}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {semDados && (
                  <p role="alert" className="text-[13px] text-amber-500">
                    Cadastre ao menos um aluno e um curso antes de emitir certificados.
                  </p>
                )}
              </ModalSection>
            </ModalBody>

            <ModalFooter
              onCancel={() => onOpenChange(false)}
              confirmLabel="Emitir Certificado"
              pendingLabel="Emitindo..."
              isPending={issueMutation.isPending}
              confirmDisabled={semDados}
            />
          </form>
        </Form>
      </ModalContent>
    </Modal>
  );
}

export default IssueCertificateModal;
