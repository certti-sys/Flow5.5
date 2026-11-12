import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { CheckoutFormValues } from "@/types/checkout-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cardUtils } from "@/lib/card-utils";

interface BoletoAddressFormProps {
    form: UseFormReturn<CheckoutFormValues>;
}

interface ViaCepResult {
    erro?: boolean;
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
}

/**
 * Endereço exigido pelo Mercado Pago para emissão de boleto.
 * O CEP preenche rua/bairro/cidade/UF automaticamente via ViaCEP.
 */
export function BoletoAddressForm({ form }: BoletoAddressFormProps) {
    const [lookingUp, setLookingUp] = useState(false);
    const [lookupError, setLookupError] = useState<string | null>(null);

    const lookupCep = async (rawCep: string) => {
        const digits = rawCep.replace(/\D/g, "");
        if (digits.length !== 8) return;

        setLookingUp(true);
        setLookupError(null);
        try {
            const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
            if (!res.ok) throw new Error("CEP não encontrado");
            const data: ViaCepResult = await res.json();
            if (data.erro) throw new Error("CEP não encontrado");

            if (data.logradouro) form.setValue("streetName", data.logradouro, { shouldValidate: true });
            if (data.bairro) form.setValue("neighborhood", data.bairro, { shouldValidate: true });
            if (data.localidade) form.setValue("city", data.localidade, { shouldValidate: true });
            if (data.uf) form.setValue("federalUnit", data.uf.toUpperCase(), { shouldValidate: true });

            form.setFocus("streetNumber");
        } catch (e: any) {
            setLookupError(e?.message || "Não foi possível buscar o CEP");
        } finally {
            setLookingUp(false);
        }
    };

    return (
        <div className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold">Endereço do boleto</h2>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
                O Mercado Pago exige o endereço completo para emitir o boleto.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">CEP</FormLabel>
                            <FormControl>
                                <div className="relative">
                                    <Input
                                        placeholder="00000-000"
                                        className="h-11 bg-background"
                                        {...field}
                                        onChange={(e) => {
                                            const masked = cardUtils.maskCEP(e.target.value);
                                            field.onChange(masked);
                                            if (masked.replace(/\D/g, "").length === 8) lookupCep(masked);
                                        }}
                                        onBlur={() => {
                                            field.onBlur();
                                            lookupCep(field.value || "");
                                        }}
                                    />
                                    {lookingUp && (
                                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                                    )}
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="streetName"
                    render={({ field }) => (
                        <FormItem className="md:col-span-2">
                            <FormLabel className="text-foreground">Rua / Avenida</FormLabel>
                            <FormControl>
                                <Input placeholder="Rua das Flores" className="h-11 bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                    control={form.control}
                    name="streetNumber"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">Número</FormLabel>
                            <FormControl>
                                <Input placeholder="123" className="h-11 bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="neighborhood"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">Bairro</FormLabel>
                            <FormControl>
                                <Input placeholder="Centro" className="h-11 bg-background" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel className="text-foreground">Cidade</FormLabel>
                                <FormControl>
                                    <Input placeholder="São Paulo" className="h-11 bg-background" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="federalUnit"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-foreground">UF</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="SP"
                                        maxLength={2}
                                        className="h-11 bg-background uppercase"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            </div>

            {lookupError && (
                <p className="text-sm text-destructive">{lookupError}</p>
            )}
        </div>
    );
}
