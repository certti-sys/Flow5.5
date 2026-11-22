import { useState, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import { CheckoutFormValues } from "@/types/checkout-form";
import { CreditCard, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { METHOD_ICONS } from "@/lib/gateway-brand";

interface PaymentMethodsProps {
    form: UseFormReturn<CheckoutFormValues>;
    onMethodChange: (method: 'credit_card' | 'pix' | 'bolbradesco') => void;
    allowedMethods?: string[];
    /** Tema visual do checkout. */
    theme?: 'dark' | 'light';
}

export function PaymentMethods({ form, onMethodChange, allowedMethods = ["credit_card", "pix", "bolbradesco"], theme = 'dark' }: PaymentMethodsProps) {
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

    const light = theme === 'light';
    const idleClass = light ? "border-border bg-card hover:border-primary/60" : "border-white/[0.08] bg-card hover:border-primary/50";
    const activeClass = "border-primary bg-primary/5 ring-2 ring-primary";

    const options = [
        { key: 'credit_card' as const, icon: METHOD_ICONS.credit_card, label: 'Cartão' },
        { key: 'pix' as const, icon: METHOD_ICONS.pix, label: 'Pix' },
        { key: 'bolbradesco' as const, icon: METHOD_ICONS.bolbradesco, label: 'Boleto' },
    ].filter((option) => allowedMethods.includes(option.key));

    return (
        <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    Meios de pagamento
                </h2>
                <Lock className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex gap-3">
                {options.map((option) => (
                    <button
                        key={option.key}
                        type="button"
                        onClick={() => handleMethodChange(option.key)}
                        aria-pressed={method === option.key}
                        className={cn(
                            "flex-1 flex flex-col items-center justify-center gap-2 border-2 rounded-lg min-h-[84px] p-4 cursor-pointer transition-all",
                            method === option.key ? activeClass : idleClass
                        )}
                    >
                        <img src={option.icon} alt="" className="w-7 h-7 object-contain" />
                        <span className="text-sm font-medium">{option.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
