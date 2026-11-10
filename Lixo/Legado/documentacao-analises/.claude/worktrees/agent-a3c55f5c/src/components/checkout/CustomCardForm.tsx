
import { UseFormReturn } from "react-hook-form";
import { CheckoutFormValues } from "@/types/checkout-form";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, Calendar, Lock, ChevronDown } from "lucide-react";
import { cardUtils } from "@/lib/card-utils";

interface CustomCardFormProps {
    form: UseFormReturn<CheckoutFormValues>;
    installmentOptions?: any[];
    onCardNumberChange?: (cardNumber: string) => void;
}

export function CustomCardForm({ form, installmentOptions = [], onCardNumberChange }: CustomCardFormProps) {
    return (
        <div className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <h2 className="text-xl font-semibold text-foreground">Dados do Cartão</h2>
                </div>
                <Lock className="w-4 h-4 text-muted-foreground/70" />
            </div>

            {/* Número do Cartão */}
            <FormField
                control={form.control}
                name="cardNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-foreground">Número do Cartão *</FormLabel>
                        <FormControl>
                            <div className="relative">
                                <Input
                                    placeholder="0000 0000 0000 0000"
                                    className="pl-4 h-11 bg-background"
                                    {...field}
                                    onChange={(e) => {
                                        const val = cardUtils.maskCardNumber(e.target.value);
                                        field.onChange(val);
                                        if (val.replace(/\s/g, '').length >= 6 && onCardNumberChange) {
                                            onCardNumberChange(val);
                                        }
                                    }}
                                    maxLength={19}
                                />
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            {/* Nome no Cartão */}
            <FormField
                control={form.control}
                name="cardHolder"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-foreground">Nome no Cartão *</FormLabel>
                        <FormControl>
                            <Input
                                placeholder="Como aparece no cartão"
                                className="h-11 bg-background"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />

            <div className="grid grid-cols-2 gap-4">
                {/* Validade */}
                <FormField
                    control={form.control}
                    name="cardExpiration"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">Validade *</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="MM/AA"
                                    className="h-11 bg-background"
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(cardUtils.maskExpirationDate(e.target.value));
                                    }}
                                    maxLength={5}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* CVV */}
                <FormField
                    control={form.control}
                    name="cardCvv"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">CVV *</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="000"
                                    className="h-11 bg-background"
                                    {...field}
                                    onChange={(e) => {
                                        field.onChange(cardUtils.maskCVV(e.target.value));
                                    }}
                                    maxLength={4}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            {/* Parcelamento */}
            {installmentOptions.length > 0 && (
                <FormField
                    control={form.control}
                    name="installments"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-foreground">Opções de Parcelamento *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || "1"}>
                                <FormControl>
                                    <SelectTrigger className="h-11 bg-background">
                                        <SelectValue placeholder="Selecione as parcelas" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {installmentOptions.map((opt: any) => (
                                        <SelectItem key={opt.installments} value={String(opt.installments)}>
                                            {opt.recommended_message}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}
        </div>
    );
}
