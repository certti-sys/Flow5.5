
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

    // Gateway selecionado — define se o cartão é digitado no nosso form (MP)
    // ou na página hospedada (Asaas, Pagar.me e PayPal, sem dados de cartão no cliente).
    gateway: z.enum(["mercadopago", "stripe", "asaas", "pushinpay", "pagarme", "paypal"]).optional(),

    // Card Fields (Optional unless paymentMethod is credit_card)
    cardHolder: z.string().optional(),
    cardNumber: z.string().optional(),
    cardExpiration: z.string().optional(),
    cardCvv: z.string().optional(),
    installments: z.string().optional(),

    // Endereço (obrigatório apenas para boleto)
    zipCode: z.string().optional(),
    streetName: z.string().optional(),
    streetNumber: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    federalUnit: z.string().optional(),
}).superRefine((data, ctx) => {
    // We assume the paymentMethod will be passed to the form or validated
    // If we want validation, we need to ensure paymentMethod is set in the form data
    if (data.paymentMethod === "credit_card" && data.gateway !== "asaas" && data.gateway !== "pagarme" && data.gateway !== "paypal") {
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

    if (data.paymentMethod === "bolbradesco") {
        if (!data.zipCode || data.zipCode.replace(/\D/g, "").length !== 8) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "CEP inválido", path: ["zipCode"] });
        }
        if (!data.streetName || data.streetName.trim().length < 3) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a rua", path: ["streetName"] });
        }
        if (!data.streetNumber || data.streetNumber.trim().length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o número", path: ["streetNumber"] });
        }
        if (!data.neighborhood || data.neighborhood.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o bairro", path: ["neighborhood"] });
        }
        if (!data.city || data.city.trim().length < 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe a cidade", path: ["city"] });
        }
        if (!data.federalUnit || data.federalUnit.trim().length !== 2) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: "UF inválida", path: ["federalUnit"] });
        }
    }
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
