import { UseFormReturn } from "react-hook-form";
import { CheckoutFormValues } from "@/types/checkout-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { User, Smartphone } from "lucide-react";
import { cardUtils } from "@/lib/card-utils";
import { cn } from "@/lib/utils";

interface CustomerFormProps {
    form: UseFormReturn<CheckoutFormValues>;
    /** Exibe o campo de CPF/CNPJ (config `customer_fields.cpf`). */
    showCpf?: boolean;
    /** Exibe o campo de celular (config `customer_fields.phone`). */
    showPhone?: boolean;
}

export function CustomerForm({ form, showCpf = true, showPhone = true }: CustomerFormProps) {
    const showDocumentRow = showCpf || showPhone;

    return (
        <div className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Seus dados</h2>
            </div>

            <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-foreground">Nome completo</FormLabel>
                        <FormControl>
                            <Input placeholder="Digite seu nome completo" className="h-11 bg-background" {...field} />
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
                        <FormLabel className="text-foreground">E-mail</FormLabel>
                        <FormControl>
                            <Input type="email" placeholder="seu@email.com" className="h-11 bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {showDocumentRow && (
                <div className={cn("grid grid-cols-1 gap-4", showCpf && showPhone && "md:grid-cols-2")}>
                    {showCpf && (
                        <FormField
                            control={form.control}
                            name="cpf"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground">CPF / CNPJ</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="000.000.000-00"
                                            className="h-11 bg-background"
                                            {...field}
                                            value={field.value ?? ""}
                                            onChange={(e) => field.onChange(cardUtils.maskCPF(e.target.value))}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}

                    {showPhone && (
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-foreground">Celular</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <Input
                                                placeholder="(00) 00000-0000"
                                                className="pl-10 h-11 bg-background"
                                                {...field}
                                                value={field.value ?? ""}
                                                onChange={(e) => field.onChange(cardUtils.maskPhone(e.target.value))}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>
            )}

            <div className="text-[12px] text-green-600 font-medium cursor-help hover:underline decoration-dotted underline-offset-2">
                Por que pedimos esse dado?
            </div>
        </div>
    );
}
