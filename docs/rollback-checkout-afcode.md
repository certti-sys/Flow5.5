# Rollback — checkout (alinhamento visual afcode + tema claro)

Tag de rollback: **`pre-checkout-afcode`** (`git tag -l "pre-*"`).

## 1. Ver o que mudou

```powershell
git diff pre-checkout-afcode --stat
git diff pre-checkout-afcode -- src/components/checkout src/pages/checkout src/types/checkout-config.ts src/index.css src/pages/admin/CheckoutBuilder.tsx
```

## 2. Reverter tudo (código)

```powershell
git revert --no-commit pre-checkout-afcode..HEAD
git commit -m "revert: checkout volta ao estado pre-checkout-afcode"
git push
```

`git revert` preserva histórico (não reescreve, seguro com deploy automático).
Alternativa destrutiva, só em último caso:

```powershell
git reset --hard pre-checkout-afcode
git push --force-with-lease
```

## 3. Reverter só o tema (sem tocar no layout)

O tema claro é controlado por **um único campo**: `product.checkout_config.appearance.theme`.
Nada de migration, nada de coluna nova.

Via admin: `Admin → Checkout → aba Geral → Cores e botão → Tema do checkout` → **Escuro** → Salvar.

Via SQL (produção, exige confirmação):

```sql
update products
set checkout_config = jsonb_set(checkout_config, '{appearance,theme}', '"dark"', true)
where checkout_slug = 'fundamentos-do-react';
```

Todos os produtos de uma vez:

```sql
update products
set checkout_config = jsonb_set(coalesce(checkout_config, '{}'::jsonb), '{appearance,theme}', '"dark"', true)
where checkout_config is not null;
```

Sem o campo, `normalizeCheckoutConfig` cai no default `'dark'` — é o comportamento anterior.

## 4. Reverter só a ordem dos blocos (mobile)

A ordem mobile usa classes `order-*` do Tailwind em `src/pages/checkout/Checkout.tsx`.
Reverter = trocar `order-first lg:order-none` por nada na coluna direita, e devolver o
bloco de cupom para a coluna direita.

## 5. Reverter só as cores do order bump

`ORDER_BUMP_COLORS` em `src/components/checkout/OrderBumpCard.tsx` é a única fonte.
A versão antiga está em:

```powershell
git show pre-checkout-afcode:src/components/checkout/OrderBumpCard.tsx
```

## 6. Reverter o tema claro (CSS)

Único bloco afetado: `[data-checkout-theme="light"]` em `src/index.css`.
Remover o bloco devolve o app ao tema escuro; nada mais quebra (o atributo
fica sem efeito).

## Checklist de validação pós-rollback

- `npx tsc --noEmit` → 0 erros
- `npm run build` → ok
- `/c/fundamentos-do-react` em 1440 / 834 / 390 px: sem overflow horizontal, contador sticky, CTA legível
- Admin `/admin/checkout`: salvar e reabrir mantém o tema escolhido
