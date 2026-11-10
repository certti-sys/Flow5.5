# Checklist de Homologação - Mercado Pago Sandbox

## Pré-requisitos

- [ ] Gateway Mercado Pago configurado em `/admin/gateways`
- [ ] Credenciais de teste (access_token e public_key) configuradas
- [ ] Gateway marcado como ativo
- [ ] Produto válido disponível para checkout

## Verificações de Infraestrutura

### 1. RPC Function
- [ ] Migration `20260420032900_create_get_gateway_public_key.sql` aplicada
- [ ] RPC retorna `gateway_id`, `public_key`, `allowed_methods`, `max_installments`
- [ ] Teste: `SELECT * FROM get_gateway_public_key('mercadopago');`

### 2. Backend Token Selection
- [ ] `payment-ops/index.ts` usa apenas `access_token` ou `secret_key`
- [ ] Não tenta usar `public_key` como fallback para API calls
- [ ] Log mostra qual token foi carregado

### 3. Frontend SDK Loading
- [ ] SDK do Mercado Pago carrega via script tag
- [ ] `window.MercadoPago` disponível antes do submit
- [ ] Console mostra "[checkout] MercadoPago SDK loaded successfully"

## Fluxo de Cartão de Teste

### Dados de Teste Mercado Pago
- Cartão: `5031 4332 1540 6351` (Mastercard aprovado)
- Validade: `11/25`
- CVV: `123`
- Nome: `APRO` (aprovação automática)
- CPF: `12345678909`

### Verificações no Checkout

- [ ] Página de checkout carrega sem erros
- [ ] Formulário de cartão aparece quando método "Cartão" selecionado
- [ ] Campos obrigatórios validam corretamente
- [ ] Console mostra "[checkout] Gateway config loaded"
- [ ] Console mostra "[checkout] MercadoPago SDK loaded successfully"

### Verificações no Submit

- [ ] Clicar em "Pagar" dispara loading visual
- [ ] Console mostra "[checkout] submit started"
- [ ] Console mostra "[checkout] Creating card token with data"
- [ ] Console mostra "[checkout] Token response: { hasId: true }"
- [ ] Console mostra "[checkout] Payment method detected"
- [ ] Console mostra "[checkout] Calling payment-ops with payload"

### Verificações no Backend

- [ ] Edge Function `payment-ops` recebe a requisição
- [ ] Log mostra "Action: create_paymentIntent"
- [ ] Log mostra "Gateway credentials loaded"
- [ ] Log mostra "Creating payment intent"
- [ ] Log mostra "Card payment payload prepared"
- [ ] Log mostra "Payment created"

### Verificações de Resposta

- [ ] Backend retorna `status: 'paid'` ou `status: 'pending'`
- [ ] Backend retorna `orderId`
- [ ] Backend retorna `external_id` do Mercado Pago
- [ ] Console mostra "[checkout] payment-ops response"
- [ ] Console mostra "[checkout] Payment completed"

### Verificações de Persistência

- [ ] Registro criado em `orders` com status correto
- [ ] Registro criado em `order_items`
- [ ] Registro criado em `payments` com `external_payment_id`
- [ ] Se aprovado, `orders.status = 'paid'`
- [ ] Se aprovado e produto tem curso, acesso concedido em `user_course_access`

### Verificações de UI

- [ ] Toast de sucesso aparece
- [ ] Redirect para `/checkout/obrigado/{orderId}` acontece
- [ ] Página de obrigado mostra informações corretas

## Cenários de Erro

### Cartão Recusado
- Cartão: `5031 4332 1540 6351`
- Nome: `OTHE` (recusa genérica)
- [ ] Backend retorna `status: 'failed'`
- [ ] Toast de erro aparece com mensagem clara
- [ ] Usuário pode tentar novamente

### SDK Não Carregado
- [ ] Se SDK falhar, erro aparece antes do submit
- [ ] Mensagem: "SDK do Mercado Pago ainda não carregou"

### Token Inválido
- [ ] Se tokenização falhar, erro aparece
- [ ] Mensagem: "Dados do cartão inválidos"

### Gateway Não Configurado
- [ ] Se RPC falhar, erro aparece no carregamento
- [ ] Mensagem: "Erro ao carregar configuração de pagamento"

## Bloqueios Identificados e Corrigidos

### Bloqueio 1: RPC Ausente
- **Problema**: `get_gateway_public_key` não existia no banco
- **Solução**: Criada migration `20260420032900_create_get_gateway_public_key.sql`
- **Evidência**: Frontend consegue carregar `mpPublicKey` e `gatewayId`

### Bloqueio 2: Token Errado no Backend
- **Problema**: Backend tentava usar `public_key` para criar pagamentos
- **Solução**: Removido fallback para `public_key`, usa apenas `access_token` ou `secret_key`
- **Evidência**: Requisições para API do MP usam token correto

### Bloqueio 3: Falta de Logs
- **Problema**: Erros silenciosos sem rastreabilidade
- **Solução**: Adicionados logs em todos os pontos críticos do fluxo
- **Evidência**: Console mostra cada etapa do processo

## Status Final

- [ ] Todos os itens do checklist validados
- [ ] Fluxo de cartão sandbox funciona end-to-end
- [ ] Logs permitem debug de qualquer falha
- [ ] Pronto para homologação manual
