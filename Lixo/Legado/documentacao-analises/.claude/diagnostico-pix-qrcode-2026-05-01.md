# 🔍 DIAGNÓSTICO SISTEMÁTICO - PIX QR CODE NÃO APARECE

**Data:** 2026-05-01  
**Problema:** QR Code do Pix não está sendo exibido na página de obrigado  
**Status:** Fase 1 - Root Cause Investigation CONCLUÍDA

---

## 📊 Evidências Coletadas

### 1. Análise da Imagem Fornecida
- ✅ Código Pix (string) está sendo exibido: `00020126580014br.gov.bcb.pix0136b76ae9c2...`
- ❌ QR Code (imagem) NÃO está aparecendo
- ✅ Pedido foi criado: `#5b594b7b`
- ✅ Valor correto: `R$ 67,00`

### 2. Análise do Código

#### Backend (payment-ops/index.ts)
```typescript
// Linha 143 - Extração do QR Code
qr_code: data.point_of_interaction?.transaction_data?.qr_code,
```
✅ **Código correto** - extrai o campo certo da resposta do Mercado Pago

#### Frontend (Checkout.tsx)
```typescript
// Linha 326-327 - Adiciona QR Code à URL
if (result.qr_code) {
    redirectUrl += `&qrcode=${encodeURIComponent(result.qr_code)}`;
}
```
✅ **Código correto** - adiciona QR code à URL de redirect

#### Página de Obrigado (ThankYou.tsx)
```typescript
// Linha 15 - Lê QR Code da URL
const qrCode = searchParams.get("qrcode");

// Linha 122-132 - Exibe QR Code
{paymentMethod === "pix" && qrCode && !isPaid && (
    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCode)}`} />
)}
```
✅ **Código correto** - lê e exibe QR code

### 3. Documentação do Mercado Pago

**Estrutura esperada da resposta:**
```json
{
  "point_of_interaction": {
    "transaction_data": {
      "qr_code": "00020126600014br.gov.bcb.pix...",
      "qr_code_base64": "iVBORw0KGgoAAAANSUhEUgAABRQ...",
      "ticket_url": "https://www.mercadopago.com.br/..."
    }
  }
}
```

---

## 🎯 ROOT CAUSE - Hipóteses

### Hipótese 1: QR Code muito longo para URL (MAIS PROVÁVEL)
**Evidência:**
- Códigos Pix podem ter até 500+ caracteres
- URLs têm limite de ~2000 caracteres
- `encodeURIComponent()` aumenta o tamanho

**Teste:**
```javascript
const pixCode = "00020126580014br.gov.bcb.pix0136b76ae9c2-2ec4-4110-954e-ebfe";
const encoded = encodeURIComponent(pixCode);
console.log('Original:', pixCode.length);
console.log('Encoded:', encoded.length);
```

### Hipótese 2: API não retorna qr_code
**Evidência:**
- Mercado Pago pode não retornar `qr_code` em sandbox
- Ou credenciais não têm permissão para Pix

### Hipótese 3: Serviço de QR Code não carrega
**Evidência:**
- ✅ Serviço `api.qrserver.com` está online (testado)
- ❌ Mas pode estar bloqueado por CORS ou timeout

---

## 🔧 Fase 2: Soluções Propostas

### Solução 1: Usar Base64 em vez de URL (RECOMENDADA)
**Por quê:** Evita limite de URL e é mais confiável

**Implementação:**
1. Backend retorna `qr_code_base64` do Mercado Pago
2. Frontend passa base64 via state em vez de URL
3. Página de obrigado renderiza: `<img src="data:image/png;base64,${qrCode}" />`

**Vantagens:**
- ✅ Sem limite de tamanho
- ✅ Não depende de serviço externo
- ✅ Mais rápido (sem requisição HTTP)

### Solução 2: Armazenar QR Code no banco
**Por quê:** Evita passar dados grandes pela URL

**Implementação:**
1. Backend salva `qr_code` na tabela `payments`
2. Frontend redireciona apenas com `orderId`
3. Página de obrigado busca QR code do banco

**Vantagens:**
- ✅ URL limpa
- ✅ QR code persistido
- ✅ Pode ser consultado depois

### Solução 3: Usar sessionStorage
**Por quê:** Solução rápida sem alterar backend

**Implementação:**
1. Frontend salva QR code no sessionStorage
2. Redireciona sem QR code na URL
3. Página de obrigado lê do sessionStorage

**Vantagens:**
- ✅ Rápido de implementar
- ✅ Não altera backend
- ❌ Perde dados se usuário recarregar

---

## 📋 Próximos Passos

### Passo 1: Adicionar Instrumentação (✅ FEITO)
Adicionei logs no backend para diagnosticar:
```typescript
console.log('[MercadoPago PIX] Diagnóstico:');
console.log('  - qr_code existe?', !!data.point_of_interaction?.transaction_data?.qr_code);
console.log('  - qr_code length:', data.point_of_interaction?.transaction_data?.qr_code?.length || 0);
```

### Passo 2: Testar e Coletar Logs
1. Fazer um pagamento Pix
2. Abrir DevTools → Console
3. Procurar logs `[MercadoPago PIX]`
4. Verificar se `qr_code` existe e seu tamanho

### Passo 3: Implementar Solução
Baseado nos logs, implementar a solução mais adequada.

---

## 🧪 Como Testar

### Teste Manual
```bash
# 1. Iniciar dev server
npm run dev

# 2. Abrir DevTools (F12)
# 3. Ir para aba Console
# 4. Fazer pagamento Pix
# 5. Verificar logs:
#    - [checkout] Resposta da payment-ops
#    - [MercadoPago PIX] Diagnóstico
# 6. Verificar aba Network:
#    - Chamada para payment-ops
#    - Resposta completa
```

### Verificar URL
```javascript
// No console do navegador, após redirect:
console.log('URL completa:', window.location.href);
console.log('QR Code da URL:', new URLSearchParams(window.location.search).get('qrcode'));
```

---

## 📊 Checklist de Diagnóstico

- [x] Código backend analisado
- [x] Código frontend analisado
- [x] Documentação do Mercado Pago consultada
- [x] Serviço de QR Code testado
- [x] Instrumentação adicionada
- [ ] Logs coletados em teste real
- [ ] Root cause confirmado
- [ ] Solução implementada
- [ ] Teste de regressão

---

## 💡 Recomendação Final

**Implementar Solução 2 (Armazenar no banco)** porque:
1. ✅ Mais robusto e confiável
2. ✅ QR code fica persistido
3. ✅ Usuário pode voltar à página depois
4. ✅ Não depende de URL ou sessionStorage
5. ✅ Segue padrão da arquitetura atual

---

**Próxima Ação:** Fazer teste manual com instrumentação e coletar logs
