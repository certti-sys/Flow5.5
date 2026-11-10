# 📋 Boleto - Pendente de Implementação

**Data:** 2026-05-01 02:08 UTC  
**Status:** ⏳ PENDENTE - Requer campos de endereço

---

## Problema Identificado

Boleto do Mercado Pago requer campos de endereço completo do cliente que não estão no formulário atual.

**Erro do Mercado Pago:**
```
To generate a registered boleto the following parameters are required:
- payer.address.zip_code
- payer.address.street_name
- payer.address.street_number
- payer.address.neighborhood
- payer.address.city
- payer.address.federal_unit
```

---

## Campos Atuais do Formulário

✅ Nome  
✅ Email  
✅ CPF  
✅ Telefone  
❌ CEP  
❌ Rua  
❌ Número  
❌ Bairro  
❌ Cidade  
❌ Estado  

---

## Implementação Necessária

### 1. Atualizar Schema do Formulário
**Arquivo:** `src/types/checkout-form.ts`

```typescript
export const checkoutFormSchema = z.object({
    // ... campos existentes ...
    
    // Campos de endereço (obrigatórios para boleto)
    zipCode: z.string().optional(),
    street: z.string().optional(),
    streetNumber: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
}).superRefine((data, ctx) => {
    // Validação condicional para boleto
    if (data.paymentMethod === "bolbradesco") {
        if (!data.zipCode || data.zipCode.length < 8) {
            ctx.addIssue({ 
                code: z.ZodIssueCode.custom, 
                message: "CEP é obrigatório para boleto", 
                path: ["zipCode"] 
            });
        }
        // ... validar outros campos ...
    }
});
```

### 2. Adicionar Campos no CustomerForm
**Arquivo:** `src/components/checkout/CustomerForm.tsx`

Adicionar campos condicionais que aparecem apenas quando boleto está selecionado:
- Input de CEP com máscara (00000-000)
- Busca automática de endereço via API ViaCEP
- Campos de rua, número, bairro, cidade, estado

### 3. Atualizar Backend
**Arquivo:** `supabase/functions/payment-ops/index.ts`

```typescript
// No MercadoPagoProvider.createPaymentIntent
if (paymentMethod === 'bolbradesco') {
    payload.payer.address = {
        zip_code: order.metadata.zipCode,
        street_name: order.metadata.street,
        street_number: order.metadata.streetNumber,
        neighborhood: order.metadata.neighborhood,
        city: order.metadata.city,
        federal_unit: order.metadata.state
    };
}
```

### 4. Integração com ViaCEP (Opcional mas Recomendado)

```typescript
const fetchAddressByCEP = async (cep: string) => {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    return {
        street: data.logradouro,
        neighborhood: data.bairro,
        city: data.localidade,
        state: data.uf
    };
};
```

---

## Estimativa de Tempo

- **Schema e validação:** 30 minutos
- **UI dos campos:** 1 hora
- **Integração ViaCEP:** 30 minutos
- **Backend:** 30 minutos
- **Testes:** 30 minutos
- **Total:** ~3 horas

---

## Alternativas

### Opção 1: Implementação Completa (Recomendada)
- ✅ Melhor UX
- ✅ Produção-ready
- ❌ Mais tempo

### Opção 2: Desabilitar Boleto Temporariamente
- ✅ Rápido
- ❌ Remove funcionalidade
- ❌ Não resolve o problema

### Opção 3: Endereço Fake para Sandbox
- ✅ Permite testar
- ❌ Não funciona em produção
- ❌ Gambiarra

---

## Recomendação

**Implementar campos de endereço completos** na próxima sprint/semana.

Boleto é um método de pagamento importante no Brasil, mas requer mais campos do que Pix e Cartão. A implementação deve ser feita corretamente para produção.

---

## Status Atual

- ✅ Pix funcionando
- ✅ Cartão funcionando
- ⏳ Boleto pendente (requer endereço)

**Progresso Semana 2:** 4/5 tasks (80%)
