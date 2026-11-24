-- Remove `cart_recovery_settings.discount_percent`.
--
-- A coluna nasceu prometendo "cupom na recuperação" (`20261118160000_cart_leads.sql`),
-- mas nada nunca leu o valor: a edge `cart-recovery` fazia `select *` e ignorava,
-- a UI declarava no tipo e não tinha input, e o link de recuperação nunca levou
-- cupom. Cupom de verdade já existe em `/admin/cupons` e o aluno digita no
-- checkout, então a coluna era só um número inerte no banco.

alter table public.cart_recovery_settings
    drop column if exists discount_percent;
