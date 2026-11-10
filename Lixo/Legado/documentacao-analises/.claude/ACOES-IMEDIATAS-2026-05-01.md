# ⚡ AÇÕES IMEDIATAS - Neo Vidya Stream

**Data:** 2026-05-01 21:14 UTC  
**Prioridade:** ALTA  
**Tempo Estimado:** 2-4 horas

---

## 🎯 OBJETIVO

Organizar o repositório e preparar para a próxima fase de desenvolvimento (Checkout Avançado - Semana 3-4).

---

## 📋 CHECKLIST DE AÇÕES IMEDIATAS

### 1. Organização do Repositório (30 min)

#### 1.1 Commit das Mudanças Pendentes
```bash
# Revisar mudanças
git status
git diff

# Adicionar arquivos modificados
git add .agents/skills/mercadopago-integration/SKILL.md
git add .claude/settings.local.json
git add scripts/test-checkout-form-schema.mjs
git add src/App.tsx
git add src/components/admin/AdminSidebar.tsx
git add src/features/coupons/components/CouponInput.tsx
git add src/pages/admin/Coupons.tsx
git add supabase/config.toml
git add supabase/functions/_shared/cors.ts
git add supabase/functions/validate-coupon/index.ts

# Commit
git commit -m "chore: update configs and refine coupon system integration"
```

#### 1.2 Adicionar Documentação Nova
```bash
# Adicionar documentação da análise
git add .agent/
git add .claude/ANALISE-COMPLETA-SISTEMA-2026-05-01.md
git add .claude/RESUMO-VISUAL-2026-05-01.md
git add .claude/ACOES-IMEDIATAS-2026-05-01.md
git add FlowMembers-Evolution-Package/
git add scripts/

# Commit
git commit -m "docs: add comprehensive system analysis and evolution package"
```

#### 1.3 Push para Remote
```bash
# Push da branch atual
git push origin feature/coupons-system
```

---

### 2. Merge da Branch (15 min)

#### 2.1 Preparar Merge
```bash
# Atualizar main
git checkout main
git pull origin main

# Merge feature/coupons-system
git merge feature/coupons-system

# Resolver conflitos se houver
# (provavelmente não haverá)
```

#### 2.2 Push Main
```bash
# Push main atualizada
git push origin main

# Criar tag de release
git tag -a v5.1.1-coupons -m "Release: Sistema de Cupons + Mercado Pago Pix/Cartão"
git push origin v5.1.1-coupons
```

---

### 3. Limpeza de Branches (15 min)

#### 3.1 Listar Worktree Branches
```bash
# Ver todas as branches
git branch -a

# Identificar worktree branches antigas
# worktree-agent-a09de71c
# worktree-agent-a1fba298
# worktree-agent-a3c55f5c
# worktree-agent-a4859135
# worktree-agent-a7edcf1f
# worktree-agent-abf0cca1
# worktree-agent-ac3e7cf5
# worktree-agent-ac531885
# worktree-agent-acb7f926
# worktree-agent-ad50fa24
```

#### 3.2 Remover Worktrees Inativos
```bash
# Listar worktrees
git worktree list

# Remover worktrees inativos (se não estiverem em uso)
# CUIDADO: Só remover se tiver certeza que não estão em uso
git worktree remove .claude/worktrees/agent-a09de71c
git worktree remove .claude/worktrees/agent-a1fba298
# ... (repetir para outros se necessário)

# Ou remover todos de uma vez (CUIDADO!)
# rm -rf .claude/worktrees/*
# git worktree prune
```

#### 3.3 Deletar Branches Locais
```bash
# Deletar branches worktree locais (após remover worktrees)
git branch -D worktree-agent-a09de71c
git branch -D worktree-agent-a1fba298
# ... (repetir para outros)
```

---

### 4. Implementar Boleto (3 horas)

#### 4.1 Adicionar Campos de Endereço no Checkout (1h)

**Arquivo:** `src/pages/checkout/Checkout.tsx`

```typescript
// Adicionar campos ao schema Zod
const checkoutSchema = z.object({
  // ... campos existentes ...
  
  // Campos de endereço (obrigatórios apenas para boleto)
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
}).superRefine((data, ctx) => {
  // Validação condicional para boleto
  if (data.paymentMethod === "boleto") {
    if (!data.cep) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CEP é obrigatório para boleto",
        path: ["cep"],
      });
    }
    if (!data.street) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rua é obrigatória para boleto",
        path: ["street"],
      });
    }
    if (!data.number) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Número é obrigatório para boleto",
        path: ["number"],
      });
    }
    if (!data.neighborhood) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bairro é obrigatório para boleto",
        path: ["neighborhood"],
      });
    }
    if (!data.city) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cidade é obrigatória para boleto",
        path: ["city"],
      });
    }
    if (!data.state) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Estado é obrigatório para boleto",
        path: ["state"],
      });
    }
  }
});

// Adicionar campos no JSX (renderizar apenas se boleto selecionado)
{paymentMethod === "boleto" && (
  <div className="space-y-4 mt-4">
    <h3 className="font-semibold">Endereço para Boleto</h3>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="cep">CEP *</Label>
        <Input
          id="cep"
          {...register("cep")}
          placeholder="00000-000"
          maxLength={9}
        />
        {errors.cep && (
          <p className="text-sm text-red-500">{errors.cep.message}</p>
        )}
      </div>
    </div>
    
    <div>
      <Label htmlFor="street">Rua *</Label>
      <Input
        id="street"
        {...register("street")}
        placeholder="Nome da rua"
      />
      {errors.street && (
        <p className="text-sm text-red-500">{errors.street.message}</p>
      )}
    </div>
    
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-1">
        <Label htmlFor="number">Número *</Label>
        <Input
          id="number"
          {...register("number")}
          placeholder="123"
        />
        {errors.number && (
          <p className="text-sm text-red-500">{errors.number.message}</p>
        )}
      </div>
      
      <div className="col-span-2">
        <Label htmlFor="complement">Complemento</Label>
        <Input
          id="complement"
          {...register("complement")}
          placeholder="Apto, bloco, etc"
        />
      </div>
    </div>
    
    <div>
      <Label htmlFor="neighborhood">Bairro *</Label>
      <Input
        id="neighborhood"
        {...register("neighborhood")}
        placeholder="Nome do bairro"
      />
      {errors.neighborhood && (
        <p className="text-sm text-red-500">{errors.neighborhood.message}</p>
      )}
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="city">Cidade *</Label>
        <Input
          id="city"
          {...register("city")}
          placeholder="Nome da cidade"
        />
        {errors.city && (
          <p className="text-sm text-red-500">{errors.city.message}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="state">Estado *</Label>
        <Select onValueChange={(value) => setValue("state", value)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AC">Acre</SelectItem>
            <SelectItem value="AL">Alagoas</SelectItem>
            <SelectItem value="AP">Amapá</SelectItem>
            <SelectItem value="AM">Amazonas</SelectItem>
            <SelectItem value="BA">Bahia</SelectItem>
            <SelectItem value="CE">Ceará</SelectItem>
            <SelectItem value="DF">Distrito Federal</SelectItem>
            <SelectItem value="ES">Espírito Santo</SelectItem>
            <SelectItem value="GO">Goiás</SelectItem>
            <SelectItem value="MA">Maranhão</SelectItem>
            <SelectItem value="MT">Mato Grosso</SelectItem>
            <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
            <SelectItem value="MG">Minas Gerais</SelectItem>
            <SelectItem value="PA">Pará</SelectItem>
            <SelectItem value="PB">Paraíba</SelectItem>
            <SelectItem value="PR">Paraná</SelectItem>
            <SelectItem value="PE">Pernambuco</SelectItem>
            <SelectItem value="PI">Piauí</SelectItem>
            <SelectItem value="RJ">Rio de Janeiro</SelectItem>
            <SelectItem value="RN">Rio Grande do Norte</SelectItem>
            <SelectItem value="RS">Rio Grande do Sul</SelectItem>
            <SelectItem value="RO">Rondônia</SelectItem>
            <SelectItem value="RR">Roraima</SelectItem>
            <SelectItem value="SC">Santa Catarina</SelectItem>
            <SelectItem value="SP">São Paulo</SelectItem>
            <SelectItem value="SE">Sergipe</SelectItem>
            <SelectItem value="TO">Tocantins</SelectItem>
          </SelectContent>
        </Select>
        {errors.state && (
          <p className="text-sm text-red-500">{errors.state.message}</p>
        )}
      </div>
    </div>
  </div>
)}
```

#### 4.2 Atualizar Backend (1h)

**Arquivo:** `supabase/functions/payment-ops/index.ts`

```typescript
// Adicionar campos de endereço ao payload do Mercado Pago
if (action === "create_payment" && payment_method_id === "bolbradesco") {
  // Validar campos de endereço
  const { cep, street, number, neighborhood, city, state } = req;
  
  if (!cep || !street || !number || !neighborhood || !city || !state) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Campos de endereço são obrigatórios para boleto"
      }),
      { status: 400, headers: corsHeaders }
    );
  }
  
  // Adicionar payer com endereço completo
  paymentData.payer = {
    email: customerEmail,
    first_name: customerName.split(" ")[0],
    last_name: customerName.split(" ").slice(1).join(" "),
    identification: {
      type: "CPF",
      number: customerDocument
    },
    address: {
      zip_code: cep.replace(/\D/g, ""),
      street_name: street,
      street_number: number,
      neighborhood: neighborhood,
      city: city,
      federal_unit: state
    }
  };
}
```

#### 4.3 Testar Boleto (1h)

```bash
# 1. Iniciar dev server
npm run dev

# 2. Abrir checkout
# http://localhost:8080/checkout/[productId]

# 3. Selecionar "Boleto"

# 4. Preencher dados:
# - Nome: João Silva
# - Email: joao@example.com
# - CPF: 529.982.247-25
# - Telefone: (11) 98765-4321
# - CEP: 01310-100
# - Rua: Avenida Paulista
# - Número: 1000
# - Bairro: Bela Vista
# - Cidade: São Paulo
# - Estado: SP

# 5. Clicar em "Pagar"

# 6. Verificar:
# - Boleto gerado?
# - URL do boleto retornada?
# - Pedido criado no banco?
# - Redirect para página de obrigado?

# 7. Documentar resultado
```

#### 4.4 Commit
```bash
git add src/pages/checkout/Checkout.tsx
git add supabase/functions/payment-ops/index.ts
git commit -m "feat(checkout): add address fields for boleto payment method"
git push origin main
```

---

### 5. Validação e Testes (30 min)

#### 5.1 Testar Fluxo Completo

```
CHECKLIST DE TESTES:

Pix:
□ QR Code aparece
□ Código pode ser copiado
□ Pagamento é aprovado
□ Acesso é liberado

Cartão:
□ SDK carrega
□ Tokenização funciona
□ Pagamento é aprovado
□ Acesso é liberado

Boleto:
□ Campos de endereço aparecem
□ Validação funciona
□ Boleto é gerado
□ URL é retornada
□ Acesso é liberado após pagamento

Cupons:
□ Validação funciona
□ Desconto é aplicado
□ Uso é registrado
□ Limite é respeitado
```

#### 5.2 Verificar Logs
```bash
# Verificar logs do Supabase
# Abrir: http://localhost:54323
# Ir para: Logs → Edge Functions
# Verificar: payment-ops, validate-coupon
```

---

### 6. Documentação (30 min)

#### 6.1 Atualizar README Principal
```bash
# Criar/atualizar README.md na raiz
```

**Conteúdo sugerido:**
```markdown
# Neo Vidya Stream (Flow 5.1)

Plataforma LMS com Gamificação e Sistema de Pagamentos.

## Status
- ✅ 99% Funcional
- ✅ Segurança Hardened
- ✅ Pagamentos: Pix + Cartão + Boleto

## Stack
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL + Edge Functions)
- TailwindCSS + shadcn/ui
- Mercado Pago

## Funcionalidades
- Sistema de Cursos
- Gamificação (XP, Badges, Leaderboards)
- Pagamentos (Pix, Cartão, Boleto)
- Sistema de Cupons
- Notificações (Email + WhatsApp)
- Certificados Digitais
- Webhooks Hub

## Documentação
- `.planning/` - Planejamento do projeto
- `DocS/` - Documentação técnica completa
- `.agent/` - GSD Framework
- `.claude/` - Análises e diagnósticos

## Setup
```bash
npm install
npm run dev
```

## Deploy
```bash
npm run build
```

## Licença
Proprietário - Neo Vidya Stream
```

#### 6.2 Atualizar ROADMAP
```bash
# Atualizar .planning/ROADMAP.md
```

Marcar como concluído:
- ✅ Milestone 3 - Phase 1: Sistema de Cupons
- ✅ Milestone 3 - Phase 2: Mercado Pago (Pix + Cartão + Boleto)

Adicionar próximo:
- ⏳ Milestone 3 - Phase 3: Checkout Avançado (Semana 3-4)

---

## 📊 RESUMO DAS AÇÕES

```
┌──────────────────────────────────────────────────────────┐
│  AÇÃO                              TEMPO      STATUS     │
├──────────────────────────────────────────────────────────┤
│  1. Organização do Repositório     30min     ⏳          │
│  2. Merge da Branch                15min     ⏳          │
│  3. Limpeza de Branches            15min     ⏳          │
│  4. Implementar Boleto             3h        ⏳          │
│  5. Validação e Testes             30min     ⏳          │
│  6. Documentação                   30min     ⏳          │
├──────────────────────────────────────────────────────────┤
│  TOTAL                             ~5h       ⏳          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 RESULTADO ESPERADO

Após completar estas ações:

✅ Repositório organizado e limpo  
✅ Branch feature/coupons-system mergeada  
✅ Documentação atualizada  
✅ Boleto funcionando 100%  
✅ Sistema de pagamentos completo (Pix + Cartão + Boleto)  
✅ Pronto para Semana 3-4 (Checkout Avançado)  

---

## 📅 CRONOGRAMA SUGERIDO

### Hoje (2026-05-01)
- ⏰ 21:30 - 22:00: Organização do repositório (30min)
- ⏰ 22:00 - 22:15: Merge e limpeza (15min)
- ⏰ 22:15 - 22:30: Pausa ☕

### Amanhã (2026-05-02)
- ⏰ 09:00 - 12:00: Implementar boleto (3h)
- ⏰ 12:00 - 13:00: Almoço 🍽️
- ⏰ 13:00 - 14:00: Testes e documentação (1h)
- ⏰ 14:00 - 14:30: Review e commit final (30min)

**TOTAL: ~5 horas de trabalho**

---

## ✅ CHECKLIST FINAL

Antes de considerar concluído:

- [ ] Todos os commits feitos
- [ ] Branch mergeada na main
- [ ] Tag de release criada
- [ ] Worktrees limpos
- [ ] Boleto implementado
- [ ] Testes passando
- [ ] Documentação atualizada
- [ ] README.md atualizado
- [ ] ROADMAP.md atualizado
- [ ] Sistema 100% funcional

---

## 🚀 PRÓXIMA FASE

Após completar estas ações, iniciar:

**SEMANA 3-4: CHECKOUT AVANÇADO**
- Timer de urgência
- Exit intent popup
- Reviews e depoimentos
- Sales notifications
- Admin config

**Objetivo:** +10-15% conversão adicional

---

**Documento criado em:** 2026-05-01 21:14 UTC  
**Prioridade:** ALTA  
**Tempo Estimado:** 5 horas  
**Status:** ⏳ AGUARDANDO EXECUÇÃO

---

**Preparado por:** Claude Sonnet 4.5  
**Para:** Equipe Neo Vidya Stream

