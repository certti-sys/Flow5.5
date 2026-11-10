import { z } from "zod";

const emptyStringToNull = (value: unknown) => {
  if (value === "") return null;
  return value;
};

export const couponFormSchema = z.object({
  code: z.string().min(1, "Informe o código").max(50, "Máximo 50 caracteres"),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.coerce.number().positive("Informe um valor maior que zero"),
  max_uses: z.preprocess(
    emptyStringToNull,
    z.number().int().positive("Deve ser um número inteiro positivo").nullable().optional(),
  ),
  valid_from: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  valid_until: z.preprocess(emptyStringToNull, z.string().nullable().optional()),
  min_purchase_amount: z.coerce.number().min(0, "Não pode ser negativo"),
  is_active: z.boolean(),
  product_ids: z.array(z.string()).default([]),
});

export type CouponFormValues = z.infer<typeof couponFormSchema>;
