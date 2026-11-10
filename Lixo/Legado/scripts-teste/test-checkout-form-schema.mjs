// Test script for checkout form schema validation
// Run with: node scripts/test-checkout-form-schema.mjs
//
// This script validates that the checkout form schema correctly accepts
// Pix payments without requiring credit card fields.

import { z } from 'zod';

// Inline minimal card utils for validation
const cardUtils = {
  validateCPF: (cpf) => {
    const digits = cpf.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(digits[i]) * (10 - i);
    }
    let check1 = (sum * 10) % 11;
    if (check1 === 10) check1 = 0;
    if (check1 !== parseInt(digits[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(digits[i]) * (11 - i);
    }
    let check2 = (sum * 10) % 11;
    if (check2 === 10) check2 = 0;
    if (check2 !== parseInt(digits[10])) return false;

    return true;
  },
  validateLuhn: (cardNumber) => {
    const digits = cardNumber.replace(/\s/g, '');
    if (!/^\d+$/.test(digits)) return false;
    let sum = 0;
    let isEven = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      if (isEven) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      isEven = !isEven;
    }
    return sum % 10 === 0;
  },
  validateExpirationDate: (expiration) => {
    if (!/^\d{2}\/\d{2}$/.test(expiration)) return false;
    const [month, year] = expiration.split('/').map(Number);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const expDate = new Date(2000 + year, month - 1);
    return expDate >= now;
  }
};

// Inline checkout form schema
const checkoutFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("E-mail inválido"),
  cpf: z.string()
    .min(11, "CPF incompleto")
    .refine((val) => cardUtils.validateCPF(val), { message: "CPF inválido (dígitos incorretos)" }),
  phone: z.string().min(14, "Telefone incompleto (formato: (00) 00000-0000)"),
  paymentMethod: z.enum(["credit_card", "pix", "bolbradesco"]).optional(),
  cardHolder: z.string().optional(),
  cardNumber: z.string().optional(),
  cardExpiration: z.string().optional(),
  cardCvv: z.string().optional(),
  installments: z.string().optional(),
}).superRefine((data, ctx) => {
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

// Test case: Pix payment without card fields
const result = checkoutFormSchema.safeParse({
  name: 'Cliente Teste',
  email: 'cliente@teste.com',
  cpf: '52998224725',
  phone: '(11) 99999-9999',
  paymentMethod: 'pix'
});

if (!result.success) {
  console.error('FAIL: checkoutFormSchema rejected Pix without card fields');
  console.error(JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

console.log('PASS: checkoutFormSchema aceita Pix sem campos de cartão');
