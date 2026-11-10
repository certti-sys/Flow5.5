
import { z } from "zod";
import { cardUtils } from "@/lib/card-utils";

export const checkoutFormSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("E-mail inválido"),
    cpf: z.string()
        .min(11, "CPF incompleto")
        .refine((val) => cardUtils.validateCPF(val), { message: "CPF inválido (dígitos incorretos)" }),
    phone: z.string().min(14, "Telefone incompleto (formato: (00) 00000-0000)"),

    // We will use a hidden field or logic outside zod to know if we validate card
    // But for now, let's keep them optional and refine
    paymentMethod: z.enum(["credit_card", "pix", "bolbradesco"]).optional(),

    // Card Fields (Optional unless paymentMethod is credit_card)
    cardHolder: z.string().optional(),
    cardNumber: z.string().optional(),
    cardExpiration: z.string().optional(),
    cardCvv: z.string().optional(),
    installments: z.string().optional(),
}).superRefine((data, ctx) => {
    // We assume the paymentMethod will be passed to the form or validated
    // If we want validation, we need to ensure paymentMethod is set in the form data
    if (data.paymentMethod === "credit_card") {
        if (!data.cardHolder || data.cardHolder.length < 3) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Nome no cartão é obrigatório", path: ["cardHolder"] });
        }
        if (!data.cardNumber || !cardUtils.validateLuhn(data.cardNumber)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Número de cartão inválido", path: ["cardNumber"] });
        }
        if (!data.cardExpiration || !cardUtils.validateExpirationDate(data.cardExpiration)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Data inválida ou expirada", path: ["cardExpiration"] });
        }
        if (!data.cardCvv || data.cardCvv.length < 3) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CVV inválido", path: ["cardCvv"] });
        }
        if (!data.installments) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selecione o parcelamento", path: ["installments"] });
        }
    }
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
