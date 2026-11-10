import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { CheckoutFormValues } from "@/types/checkout-form";
import { CreditCard, QrCode, Barcode, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodsProps {
    form: UseFormReturn<CheckoutFormValues>;
    onMethodChange: (method: 'credit_card' | 'pix' | 'bolbradesco') => void;
    allowedMethods?: string[];
}

export function PaymentMethods({ form, onMethodChange, allowedMethods = ["credit_card", "pix", "bolbradesco"] }: PaymentMethodsProps) {
    const [method, setMethod] = useState<'credit_card' | 'pix' | 'bolbradesco'>(() => {
        // Inicializa com o primeiro método disponível
        if (allowedMethods.includes('credit_card')) return 'credit_card';
        if (allowedMethods.includes('pix')) return 'pix';
        return 'bolbradesco';
    });

    useEffect(() => {
        // Notifica o pai sobre o método inicial
        onMethodChange(method);
    }, []);

    useEffect(() => {
        if (!allowedMethods.includes(method)) {
            const newMethod = allowedMethods.includes('credit_card') ? 'credit_card'
                : allowedMethods.includes('pix') ? 'pix' : 'bolbradesco';
            setMethod(newMethod as any);
            onMethodChange(newMethod as any);
        }
    }, [allowedMethods]);

    const handleMethodChange = (value: 'credit_card' | 'pix' | 'bolbradesco') => {
        setMethod(value);
        onMethodChange(value);
    };

    // Filtra apenas os métodos permitidos para o layout dinâmico
    const activeMethodsList = ['credit_card', 'pix', 'bolbradesco'].filter(m => allowedMethods.includes(m));

    return (
        <div className="bg-card text-card-foreground p-6 rounded-lg border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    Meios de pagamento
                </h2>
                <Lock className="w-4 h-4 text-muted-foreground/60" />
            </div>

            {/* Botões lado a lado com flex (ocupam espaço igual) */}
            <div className="flex gap-3">
                {allowedMethods.includes('credit_card') && (
                    <button
                        type="button"
                        onClick={() => handleMethodChange('credit_card')}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
                            method === 'credit_card' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-white/[0.08] bg-card"
                        )}
                    >
                        <CreditCard className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">Cartão</span>
                    </button>
                )}

                {allowedMethods.includes('pix') && (
                    <button
                        type="button"
                        onClick={() => handleMethodChange('pix')}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
                            method === 'pix' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-white/[0.08] bg-card"
                        )}
                    >
                        <QrCode className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">Pix</span>
                    </button>
                )}

                {allowedMethods.includes('bolbradesco') && (
                    <button
                        type="button"
                        onClick={() => handleMethodChange('bolbradesco')}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center border rounded-lg p-4 cursor-pointer transition-all hover:border-primary/50",
                            method === 'bolbradesco' ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-white/[0.08] bg-card"
                        )}
                    >
                        <Barcode className="w-6 h-6 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium">Boleto</span>
                    </button>
                )}
            </div>
        </div>
    );
}
