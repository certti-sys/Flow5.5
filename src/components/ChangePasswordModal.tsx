import { useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const passwordSchema = z.object({
    currentPassword: z.string().min(1, "Senha atual obrigatória"),
    newPassword: z.string().min(6, "Nova senha deve ter no mínimo 6 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
});

type PasswordFormValues = z.infer<typeof passwordSchema>;

interface ChangePasswordModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const ChangePasswordModal = ({ open, onOpenChange }: ChangePasswordModalProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const form = useForm<PasswordFormValues>({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        },
    });

    const [formErrors, setFormErrors] = useState<Record<string, string>>({});

    const onSubmit = async (data: PasswordFormValues) => {
        setIsLoading(true);
        try {
          const validation = passwordSchema.safeParse(data);
          if (!validation.success) {
            validation.error.issues.forEach((err) => {
              if (err.path[0]) {
                form.setError(err.path[0] as string, { message: err.message });
              }
            });
            setIsLoading(false);
            return;
          }

            // Primeiro, validar senha atual tentando fazer login
            const { data: { user } } = await supabase.auth.getUser();

            if (!user?.email) {
                throw new Error("Usuário não encontrado");
            }

            // Tentar fazer sign in com senha atual para validar
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: data.currentPassword,
            });

            if (signInError) {
                toast.error("Senha atual incorreta");
                setIsLoading(false);
                return;
            }

            // Se senha atual está correta, atualizar para nova senha
            const { error: updateError } = await supabase.auth.updateUser({
                password: data.newPassword,
            });

            if (updateError) throw updateError;

            toast.success("Senha atualizada com sucesso!");
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error("Error changing password:", error);
            toast.error("Erro ao atualizar senha");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-2xl text-gradient">Redefinir Senha</DialogTitle>
                    <DialogDescription>
                        Digite sua senha atual e escolha uma nova senha
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="currentPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Senha Atual</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showCurrentPassword ? "text" : "password"}
                                                placeholder="Digite sua senha atual"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            >
                                                {showCurrentPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nova Senha</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showNewPassword ? "text" : "password"}
                                                placeholder="Digite a nova senha"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Confirmar Nova Senha</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Digite a nova senha novamente"
                                                {...field}
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <Eye className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </Button>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="flex gap-3 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    form.reset();
                                    onOpenChange(false);
                                }}
                                className="flex-1"
                                disabled={isLoading}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 gradient-primary text-white"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Atualizando...
                                    </>
                                ) : (
                                    "Confirmar"
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};

