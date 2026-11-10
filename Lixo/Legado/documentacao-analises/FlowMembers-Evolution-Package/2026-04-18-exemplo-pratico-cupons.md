# Exemplo Prático Completo: Sistema de Cupons

**Feature:** Sistema de Cupons Avançado  
**Tempo Estimado:** 1 semana  
**Complexidade:** Baixa-Média  
**Fase:** 1 (Manual)

Este documento mostra a implementação completa do sistema de cupons do início ao fim, servindo como template para outras features.

---

## Visão Geral

O sistema de cupons permite criar códigos de desconto (percentual ou fixo) com validações avançadas:
- Data de validade
- Produtos específicos
- Valor mínimo de compra
- Limite de uso
- Histórico completo

---

## Passo 1: Database Schema

### 1.1 Criar Migration

```bash
cd flowmembers5-main
supabase migration new coupons_system
```

### 1.2 Escrever SQL

Arquivo: `supabase/migrations/YYYYMMDDHHMMSS_coupons_system.sql`

```sql
-- Tabela principal de cupons
create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  discount_type text check (discount_type in ('percent', 'fixed')) not null,
  discount_value numeric not null check (discount_value > 0),
  max_uses int check (max_uses > 0),
  uses_count int default 0 check (uses_count >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  min_purchase_amount numeric default 0 check (min_purchase_amount >= 0),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Relação cupom-produto (many-to-many)
create table coupon_products (
  coupon_id uuid references coupons(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  primary key (coupon_id, product_id)
);

-- Histórico de uso
create table coupon_usage (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references coupons(id) on delete cascade,
  order_id uuid references orders(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  discount_applied numeric not null,
  created_at timestamptz default now()
);

-- Índices para performance
create index idx_coupons_code on coupons(code);
create index idx_coupons_active on coupons(is_active) where is_active = true;
create index idx_coupon_usage_coupon on coupon_usage(coupon_id);
create index idx_coupon_usage_order on coupon_usage(order_id);

-- RLS Policies
alter table coupons enable row level security;
alter table coupon_products enable row level security;
alter table coupon_usage enable row level security;

-- Admins podem fazer tudo
create policy "Admins can do everything on coupons"
  on coupons for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Todos podem ler cupons ativos
create policy "Anyone can read active coupons"
  on coupons for select
  using (is_active = true);

-- Admins podem gerenciar coupon_products
create policy "Admins can manage coupon_products"
  on coupon_products for all
  using (auth.jwt() ->> 'role' = 'admin');

-- Todos podem ler coupon_products
create policy "Anyone can read coupon_products"
  on coupon_products for select
  using (true);

-- Apenas sistema pode inserir em coupon_usage
create policy "System can insert coupon_usage"
  on coupon_usage for insert
  with check (true);

-- Admins podem ler histórico
create policy "Admins can read coupon_usage"
  on coupon_usage for select
  using (auth.jwt() ->> 'role' = 'admin');

-- Trigger para atualizar updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_coupons_updated_at
  before update on coupons
  for each row
  execute function update_updated_at_column();
```

### 1.3 Aplicar Migration

```bash
supabase db push
```

Verificar no Supabase Studio: http://localhost:54323

---

## Passo 2: Edge Function - Validação

### 2.1 Criar Edge Function

```bash
supabase functions new validate-coupon
```

### 2.2 Implementar Lógica

Arquivo: `supabase/functions/validate-coupon/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema de validação
const ValidateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  productId: z.string().uuid(),
  amount: z.number().positive(),
  userId: z.string().uuid().optional()
});

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse input
    const body = await req.json();
    const { code, productId, amount, userId } = ValidateCouponSchema.parse(body);

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // 1. Buscar cupom
    const { data: coupon, error: couponError } = await supabaseClient
      .from('coupons')
      .select(`
        *,
        coupon_products (
          product_id
        )
      `)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (couponError || !coupon) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Cupom inválido ou não encontrado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Validar data
    const now = new Date();
    if (coupon.valid_from && new Date(coupon.valid_from) > now) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Cupom válido a partir de ${new Date(coupon.valid_from).toLocaleDateString('pt-BR')}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (coupon.valid_until && new Date(coupon.valid_until) < now) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Cupom expirado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validar produto
    if (coupon.coupon_products && coupon.coupon_products.length > 0) {
      const validForProduct = coupon.coupon_products.some(
        (cp: any) => cp.product_id === productId
      );
      if (!validForProduct) {
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Cupom não válido para este produto' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 4. Validar valor mínimo
    if (amount < coupon.min_purchase_amount) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: `Valor mínimo de compra: R$ ${coupon.min_purchase_amount.toFixed(2)}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validar limite de uso
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Cupom esgotado' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Calcular desconto
    let discountApplied = 0;
    if (coupon.discount_type === 'percent') {
      discountApplied = (amount * coupon.discount_value) / 100;
    } else {
      discountApplied = coupon.discount_value;
    }

    // Desconto não pode ser maior que o valor total
    discountApplied = Math.min(discountApplied, amount);

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value
        },
        discount_applied: Number(discountApplied.toFixed(2))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating coupon:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof z.ZodError 
          ? 'Dados inválidos' 
          : 'Erro ao validar cupom' 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
```

### 2.3 Deploy Edge Function

```bash
supabase functions deploy validate-coupon
```

### 2.4 Testar Edge Function

```bash
curl -X POST 'http://localhost:54321/functions/v1/validate-coupon' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "code": "DESCONTO10",
    "productId": "uuid-do-produto",
    "amount": 100
  }'
```

---

## Passo 3: Tipos TypeScript

### 3.1 Criar Arquivo de Tipos

Arquivo: `src/features/coupons/types/index.ts`

```typescript
export interface Coupon {
  id: string;
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  valid_from: string | null;
  valid_until: string | null;
  min_purchase_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CouponProduct {
  coupon_id: string;
  product_id: string;
}

export interface CouponUsage {
  id: string;
  coupon_id: string;
  order_id: string;
  user_id: string | null;
  discount_applied: number;
  created_at: string;
}

export type DiscountType = 'percent' | 'fixed';

export interface CouponValidationInput {
  code: string;
  productId: string;
  amount: number;
  userId?: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: {
    id: string;
    code: string;
    discount_type: DiscountType;
    discount_value: number;
  };
  discount_applied?: number;
  error?: string;
}

export interface CouponFormData {
  code: string;
  discount_type: DiscountType;
  discount_value: number;
  max_uses: number | null;
  valid_from: string | null;
  valid_until: string | null;
  min_purchase_amount: number;
  is_active: boolean;
  product_ids: string[];
}
```

---

## Passo 4: React Hook

### 4.1 Criar Hook de Validação

Arquivo: `src/features/coupons/hooks/useCouponValidation.ts`

```typescript
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CouponValidationInput, CouponValidationResult } from '../types';

export function useCouponValidation() {
  return useMutation({
    mutationFn: async (data: CouponValidationInput): Promise<CouponValidationResult> => {
      const { data: result, error } = await supabase.functions.invoke('validate-coupon', {
        body: data
      });

      if (error) {
        throw new Error(error.message);
      }

      return result as CouponValidationResult;
    }
  });
}
```

---

## Passo 5: Componente CouponInput

### 5.1 Criar Componente

Arquivo: `src/features/coupons/components/CouponInput.tsx`

```typescript
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Tag, CheckCircle2 } from 'lucide-react';
import { useCouponValidation } from '../hooks/useCouponValidation';
import type { CouponValidationResult } from '../types';

interface CouponInputProps {
  productId: string;
  amount: number;
  onApply: (result: CouponValidationResult) => void;
  disabled?: boolean;
}

export function CouponInput({ productId, amount, onApply, disabled }: CouponInputProps) {
  const [code, setCode] = useState('');
  const [applied, setApplied] = useState(false);
  const validateMutation = useCouponValidation();

  const handleApply = async () => {
    if (!code.trim()) {
      toast.error('Digite um código de cupom');
      return;
    }

    try {
      const result = await validateMutation.mutateAsync({
        code: code.trim().toUpperCase(),
        productId,
        amount
      });

      if (result.valid) {
        setApplied(true);
        onApply(result);
        toast.success(
          `Cupom aplicado! Desconto: R$ ${result.discount_applied?.toFixed(2)}`,
          { icon: <CheckCircle2 className="text-green-500" /> }
        );
      } else {
        toast.error(result.error || 'Cupom inválido');
      }
    } catch (error) {
      toast.error('Erro ao validar cupom');
      console.error(error);
    }
  };

  const handleRemove = () => {
    setCode('');
    setApplied(false);
    onApply({ valid: false });
    toast.info('Cupom removido');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Cupom de desconto</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Digite o código"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            disabled={disabled || applied || validateMutation.isPending}
            className="pl-10"
            maxLength={50}
          />
        </div>
        
        {!applied ? (
          <Button
            onClick={handleApply}
            disabled={disabled || !code.trim() || validateMutation.isPending}
            variant="outline"
          >
            {validateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Aplicar'
            )}
          </Button>
        ) : (
          <Button
            onClick={handleRemove}
            disabled={disabled}
            variant="destructive"
          >
            Remover
          </Button>
        )}
      </div>
      
      {applied && (
        <p className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-4 h-4" />
          Cupom aplicado com sucesso!
        </p>
      )}
    </div>
  );
}
```

---

## Passo 6: Admin Page - CRUD Cupons

### 6.1 Criar Página Admin

Arquivo: `src/pages/admin/Coupons.tsx`

```typescript
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminHeader } from '@/components/admin/AdminHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit2, Trash2, Search, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { CouponFormModal } from '@/components/admin/CouponFormModal';
import type { Coupon } from '@/features/coupons/types';

export default function CouponsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const queryClient = useQueryClient();

  // Query para listar cupons
  const { data: coupons, isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coupon[];
    }
  });

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coupons')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Cupom excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir cupom: ' + error.message);
    }
  });

  const handleCreate = () => {
    setSelectedCoupon(null);
    setIsModalOpen(true);
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cupom?')) {
      deleteMutation.mutate(id);
    }
  };

  const filteredCoupons = coupons?.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Estatísticas
  const stats = {
    total: coupons?.length || 0,
    active: coupons?.filter(c => c.is_active).length || 0,
    used: coupons?.reduce((sum, c) => sum + c.uses_count, 0) || 0
  };

  return (
    <div className="space-y-6">
      <AdminHeader title="Cupons de Desconto" />

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Cupons</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-muted-foreground">Cupons Ativos</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <Tag className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total de Usos</p>
              <p className="text-2xl font-bold">{stats.used}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Ações */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {/* Tabela */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Usos</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredCoupons?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center">
                  Nenhum cupom encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredCoupons?.map((coupon) => (
                <TableRow key={coupon.id}>
                  <TableCell className="font-mono font-bold">
                    {coupon.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {coupon.discount_type === 'percent' ? 'Percentual' : 'Fixo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {coupon.discount_type === 'percent' 
                      ? `${coupon.discount_value}%` 
                      : `R$ ${coupon.discount_value.toFixed(2)}`
                    }
                  </TableCell>
                  <TableCell>
                    {coupon.uses_count}
                    {coupon.max_uses && ` / ${coupon.max_uses}`}
                  </TableCell>
                  <TableCell className="text-sm">
                    {coupon.valid_until 
                      ? new Date(coupon.valid_until).toLocaleDateString('pt-BR')
                      : 'Sem limite'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={coupon.is_active ? 'success' : 'secondary'}>
                      {coupon.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEdit(coupon)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(coupon.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal */}
      <CouponFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        coupon={selectedCoupon}
      />
    </div>
  );
}
```

---

## Passo 7: Integração no Checkout

### 7.1 Atualizar CheckoutPage

Arquivo: `src/pages/checkout/Checkout.tsx` (adicionar)

```typescript
import { CouponInput } from '@/features/coupons/components/CouponInput';
import type { CouponValidationResult } from '@/features/coupons/types';

export default function CheckoutPage() {
  // ... código existente ...
  
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidationResult | null>(null);

  const handleCouponApply = (result: CouponValidationResult) => {
    if (result.valid) {
      setAppliedCoupon(result);
    } else {
      setAppliedCoupon(null);
    }
  };

  const finalAmount = useMemo(() => {
    let amount = product?.price || 0;
    if (appliedCoupon?.valid && appliedCoupon.discount_applied) {
      amount -= appliedCoupon.discount_applied;
    }
    return Math.max(amount, 0);
  }, [product, appliedCoupon]);

  return (
    <div>
      {/* ... formulário existente ... */}
      
      {/* Adicionar antes do payment */}
      <CouponInput
        productId={productId!}
        amount={product?.price || 0}
        onApply={handleCouponApply}
      />
      
      {/* Atualizar OrderSummary */}
      <OrderSummary
        subtotal={product?.price || 0}
        discount={appliedCoupon?.discount_applied || 0}
        total={finalAmount}
      />
    </div>
  );
}
```

---

## Passo 8: Testes

### 8.1 Checklist de Testes

- [ ] Criar cupom no admin
- [ ] Aplicar cupom válido no checkout
- [ ] Testar cupom expirado
- [ ] Testar cupom esgotado (max_uses)
- [ ] Testar valor mínimo não atingido
- [ ] Testar cupom para produto errado
- [ ] Testar desconto percentual (ex: 10%)
- [ ] Testar desconto fixo (ex: R$ 50)
- [ ] Remover cupom aplicado
- [ ] Editar cupom no admin
- [ ] Desativar cupom
- [ ] Deletar cupom

---

## Passo 9: Commit

```bash
git add .
git commit -m "feat: sistema de cupons avançado

- Database schema (coupons, coupon_products, coupon_usage)
- Edge Function validate-coupon
- React hook useCouponValidation
- Componente CouponInput
- Admin CRUD completo
- Integração no checkout
- Testes completos"

git push
```

---

## Conclusão

Este exemplo mostra o fluxo completo de implementação de uma feature:

1. ✅ Database schema com RLS
2. ✅ Edge Function com validação
3. ✅ Tipos TypeScript
4. ✅ React Hook
5. ✅ Componente UI
6. ✅ Admin CRUD
7. ✅ Integração
8. ✅ Testes
9. ✅ Commit

Use este template para implementar as outras features!

---

**Tempo real de implementação:** 6-8 horas  
**Próxima feature:** Múltiplos Gateways de Pagamento
