# Admin Coupons Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir a página administrativa de cupons para seguir o padrão visual de Pedidos e entregar um modal funcional de criação/edição integrado ao Supabase.

**Architecture:** A página `src/pages/admin/Coupons.tsx` será reescrita para reutilizar o padrão estrutural de `src/pages/admin/Orders.tsx`, com `AdminHeader`, cards de estatística, tabela estilizada e ações consistentes. O formulário de cupom ficará em um modal na própria página, com estado local, validação via `react-hook-form` + `zod`, e persistência via `supabase-js` nas tabelas `coupons` e `coupon_products`.

**Tech Stack:** React, TypeScript, TanStack Query, React Hook Form, Zod, Supabase JS, shadcn/ui, Sonner, Lucide React.

---

## File Structure

- **Modify:** `src/pages/admin/Coupons.tsx` — alinhar layout ao padrão de Pedidos, listar cupons, abrir modal, criar/editar/excluir cupons.
- **Create:** `src/features/coupons/components/AdminCouponFormDialog.tsx` — modal completo de cadastro/edição.
- **Create:** `src/features/coupons/schemas/couponFormSchema.ts` — schema zod e tipos de entrada do formulário.
- **Optionally modify:** `src/features/coupons/types/index.ts` — complementar tipos se faltar shape para admin.

### Task 1: Reestruturar página de cupons no padrão de Pedidos

**Files:**
- Modify: `src/pages/admin/Coupons.tsx`
- Reference: `src/pages/admin/Orders.tsx`

- [ ] **Step 1: Remover header duplicado e adaptar cabeçalho**

Trocar o uso de `Navbar` e do header manual por `AdminHeader` com este formato:

```tsx
<AdminHeader
  title="Gestão de Cupons"
  description="Crie, edite e monitore cupons de desconto da plataforma."
  searchValue={searchTerm}
  onSearchChange={setSearchTerm}
  searchPlaceholder="Buscar por código do cupom..."
  actionButton={
    <Button onClick={() => setDialogOpen(true)} className="gap-2 rounded-2xl font-bold">
      <Plus className="w-4 h-4" />
      Novo Cupom
    </Button>
  }
/>
```

- [ ] **Step 2: Criar estado mínimo da página**

Adicionar no topo do componente:

```tsx
const [searchTerm, setSearchTerm] = useState("");
const [dialogOpen, setDialogOpen] = useState(false);
const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
```

- [ ] **Step 3: Buscar cupons e produtos**

Usar `useQuery` com estes formatos:

```tsx
const { data: coupons = [], isLoading } = useQuery({
  queryKey: ["admin-coupons"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as Coupon[];
  }
});

const { data: products = [] } = useQuery({
  queryKey: ["admin-coupon-products"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw error;
    return data;
  }
});
```

- [ ] **Step 4: Filtrar cupons por busca**

```tsx
const filteredCoupons = useMemo(() => {
  if (!searchTerm) return coupons;
  const term = searchTerm.toLowerCase();
  return coupons.filter(coupon => coupon.code.toLowerCase().includes(term));
}, [coupons, searchTerm]);
```

- [ ] **Step 5: Criar cards de estatística no estilo de Pedidos**

Adicionar cards para:
- total de cupons
- cupons ativos
- cupons expirados
- cupons usados

Com visual próximo de `OrderStatCard` em `Orders.tsx`.

- [ ] **Step 6: Criar tabela no padrão visual de Pedidos**

Tabela com colunas:
- código
- tipo
- valor
- validade
- uso
- status
- ações

Ações:
```tsx
<Button variant="ghost" size="icon" onClick={() => { setEditingCoupon(coupon); setDialogOpen(true); }}>
  <Edit className="w-4 h-4" />
</Button>
<Button variant="ghost" size="icon" onClick={() => handleDelete(coupon.id)}>
  <Trash2 className="w-4 h-4" />
</Button>
```

### Task 2: Criar schema e modal funcional

**Files:**
- Create: `src/features/coupons/schemas/couponFormSchema.ts`
- Create: `src/features/coupons/components/AdminCouponFormDialog.tsx`

- [ ] **Step 1: Criar schema do formulário**

Escrever em `src/features/coupons/schemas/couponFormSchema.ts`:

```tsx
import { z } from "zod";

export const couponFormSchema = z.object({
  code: z.string().min(1, "Informe o código").max(50),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.coerce.number().positive("Informe um valor maior que zero"),
  max_uses: z.coerce.number().int().positive().nullable().optional(),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  min_purchase_amount: z.coerce.number().min(0),
  is_active: z.boolean(),
  product_ids: z.array(z.string()).default([]),
});

export type CouponFormValues = z.infer<typeof couponFormSchema>;
```

- [ ] **Step 2: Criar modal com react-hook-form**

Estrutura base do modal:

```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="sm:max-w-3xl">
    <DialogHeader>
      <DialogTitle>{coupon ? "Editar cupom" : "Novo cupom"}</DialogTitle>
    </DialogHeader>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* campos */}
      </form>
    </Form>
  </DialogContent>
</Dialog>
```

- [ ] **Step 3: Adicionar campos completos do modal**

Campos obrigatórios:
- código
- tipo de desconto
- valor do desconto
- limite de uso
- validade inicial
- validade final
- valor mínimo da compra
- ativo/inativo
- multiselect de produtos opcionais

- [ ] **Step 4: Implementar submit para criar cupom**

Fluxo:
1. inserir em `coupons`
2. se houver `product_ids`, inserir em `coupon_products`
3. invalidar query `admin-coupons`
4. fechar modal
5. exibir `toast.success`

- [ ] **Step 5: Implementar submit para editar cupom**

Fluxo:
1. atualizar `coupons`
2. deletar vínculos antigos em `coupon_products`
3. recriar vínculos de `product_ids`
4. invalidar query `admin-coupons`
5. fechar modal
6. exibir `toast.success`

### Task 3: Integrar modal e ações na página

**Files:**
- Modify: `src/pages/admin/Coupons.tsx`
- Create/Use: `src/features/coupons/components/AdminCouponFormDialog.tsx`

- [ ] **Step 1: Renderizar modal na página**

```tsx
<AdminCouponFormDialog
  open={dialogOpen}
  onOpenChange={(open) => {
    setDialogOpen(open);
    if (!open) setEditingCoupon(null);
  }}
  coupon={editingCoupon}
  products={products}
/>
```

- [ ] **Step 2: Implementar exclusão de cupom**

Usar `useMutation`:

```tsx
const deleteCouponMutation = useMutation({
  mutationFn: async (couponId: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", couponId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success("Cupom removido com sucesso");
    queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
  },
  onError: (error: any) => toast.error(error.message || "Erro ao remover cupom")
});
```

- [ ] **Step 3: Garantir estados vazios e loading**

Se `isLoading`, mostrar skeleton/loading.
Se `filteredCoupons.length === 0`, mostrar empty state com texto e CTA de criar cupom.

### Task 4: Verificação

**Files:**
- Verify: `src/pages/admin/Coupons.tsx`
- Verify: `src/features/coupons/components/AdminCouponFormDialog.tsx`
- Verify: `src/features/coupons/schemas/couponFormSchema.ts`

- [ ] **Step 1: Rodar build**

Run: `npm run build`
Expected: build concluído com sucesso.

- [ ] **Step 2: Rodar app e validar no navegador**

Validar:
- apenas um item “Cupons” no menu
- página `/admin/cupons` abre sem header duplicado
- layout visual consistente com Pedidos
- botão “Novo Cupom” abre modal
- modal cria cupom real
- editar cupom funciona
- excluir cupom funciona

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/Coupons.tsx src/features/coupons/components/AdminCouponFormDialog.tsx src/features/coupons/schemas/couponFormSchema.ts
git commit -m "feat(admin): add functional coupon management modal"
```