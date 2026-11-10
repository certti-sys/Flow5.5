# Semana 2 — Estabilização e Homologação do Mercado Pago

**Data:** 2026-04-19  
**Autor:** Claude  
**Versão:** 1.0  
**Status:** Aguardando revisão final do usuário

---

## Sumário Executivo

Esta spec redefine a Semana 2 do roadmap original para refletir o estado real do projeto. Em vez de abrir novos gateways imediatamente, a prioridade passa a ser estabilizar e homologar 100% o fluxo já existente do Mercado Pago em sandbox.

O objetivo é transformar o checkout atual em um fluxo confiável ponta a ponta, cobrindo disparo do submit, tokenização, criação do pagamento, persistência do pedido, retorno síncrono, webhook e validação operacional de cartão, Pix e boleto.

---

## 1. Contexto Atual

O projeto já possui uma base funcional parcial para Mercado Pago:

- Checkout público com integração do SDK em [src/pages/checkout/Checkout.tsx](../src/pages/checkout/Checkout.tsx)
- Seleção de meios de pagamento em [src/components/checkout/PaymentMethods.tsx](../src/components/checkout/PaymentMethods.tsx)
- Operação backend centralizada em [supabase/functions/payment-ops/index.ts](../supabase/functions/payment-ops/index.ts)
- Tela administrativa de gateways em [src/pages/admin/Gateways.tsx](../src/pages/admin/Gateways.tsx)
- Tipos do módulo de pagamentos em [src/types/payment.ts](../src/types/payment.ts)

Também já foi confirmado pelo usuário que:

- Mercado Pago está configurado hoje com API de teste
- Nem cartão de teste nem Pix estão funcionando
- Ao clicar em comprar, não acontece nada visualmente no checkout

Isso indica que a primeira meta da Semana 2 não é expandir arquitetura, e sim remover bloqueios do fluxo atual até obter homologação completa.

---

## 2. Problema que a Semana 2 Resolve

A base de pagamento existe, mas ainda não é confiável operacionalmente. O estado atual sugere pelo menos uma destas falhas:

1. submit do formulário não está disparando corretamente;
2. validação do formulário está bloqueando de forma silenciosa;
3. tokenização do cartão não está sendo alcançada;
4. chamada da Edge Function `payment-ops` não está sendo executada;
5. configuração sandbox do Mercado Pago está inconsistente;
6. retorno do pagamento ou persistência do pedido está incompleto.

A Semana 2 resolve isso sem redesign amplo e sem novos gateways.

---

## 3. Objetivo da Semana 2

Homologar o Mercado Pago ponta a ponta em sandbox, mantendo a estrutura existente e aplicando apenas as correções mínimas necessárias para que o checkout funcione com previsibilidade.

Ao final da semana, o projeto deve permitir:

- iniciar o pagamento a partir do checkout sem bloqueio silencioso;
- exibir feedback visual claro em erro ou sucesso;
- processar cartão de teste, Pix e boleto com comportamento consistente;
- persistir pedidos corretamente no banco;
- refletir status coerente no retorno do checkout e no webhook;
- deixar o admin capaz de validar a configuração usada.

---

## 4. Escopo Aprovado

### Incluído

- análise do código existente antes de modificar;
- estabilização do submit do checkout;
- estabilização do fluxo de cartão, Pix e boleto do Mercado Pago;
- revisão do contrato entre frontend e `payment-ops`;
- validação da configuração administrativa e credenciais sandbox;
- homologação funcional ponta a ponta;
- checklist real de testes de sandbox.

### Excluído

- adicionar Stripe, Asaas ou qualquer novo gateway;
- refatorar toda a arquitetura de pagamentos;
- redesign de checkout fora do necessário para feedback e operação;
- introduzir novas features comerciais da Semana 3.

---

## 5. Princípios de Implementação

1. **Preservar a base existente.** O código atual já representa investimento feito e deve ser aproveitado.
2. **Corrigir por evidência.** Toda mudança deve nascer de comportamento observado no frontend, logs da função, resposta do SDK ou estado do banco.
3. **Fechar o fluxo antes de expandir.** Sem Mercado Pago homologado, novos gateways só aumentariam risco.
4. **Feedback visível obrigatório.** Erro silencioso no checkout é inaceitável.
5. **Homologação por meio de pagamento.** Cartão, Pix e boleto devem ser validados separadamente.

---

## 6. Arquitetura da Semana 2

A Semana 2 será conduzida em quatro camadas, nesta ordem:

### Camada A — Disparo do Checkout

Responsável por garantir que o clique em comprar realmente acione o fluxo.

Pontos de inspeção principais:
- botão submit em `Checkout.tsx`;
- integração entre `Form`, `react-hook-form` e `handlePaymentSubmit`;
- erros de validação silenciosos;
- bloqueios de estado (`isProcessing`, dependências não carregadas, chave pública ausente).

Resultado esperado:
- o clique em comprar sempre gera um efeito observável: processamento, erro visível ou avanço do fluxo.

### Camada B — Tokenização e Chamada Backend

Responsável por garantir que, após o submit, o checkout alcance o backend corretamente.

Pontos de inspeção principais:
- criação de token do cartão via SDK do Mercado Pago;
- resolução de `payment_method_id`, `issuer_id` e parcelas;
- chamada de `supabase.functions.invoke('payment-ops')`;
- coerência entre payload enviado pelo frontend e schema aceito pela função.

Resultado esperado:
- o frontend monta payload válido e o backend recebe a operação corretamente.

### Camada C — Sandbox Mercado Pago

Responsável por validar o comportamento real do provedor.

Pontos de inspeção principais:
- RPC de chave pública;
- credenciais admin de gateway;
- métodos permitidos;
- resposta da API sandbox para cartão, Pix e boleto.

Resultado esperado:
- ambiente sandbox consistente e reproduzível para os três meios.

### Camada D — Retorno Operacional

Responsável por fechar o ciclo do pagamento.

Pontos de inspeção principais:
- redirect para página de obrigado;
- exibição de QR code ou ticket quando aplicável;
- atualização de status do pedido;
- consistência entre retorno síncrono e webhook.

Resultado esperado:
- pedido criado, atualizado e visível com status compatível com o resultado do pagamento.

---

## 7. Componentes e Responsabilidades

### 7.1 Checkout público

Arquivo principal: `src/pages/checkout/Checkout.tsx`

Responsabilidades nesta semana:
- garantir submit confiável;
- tornar bloqueios visíveis ao usuário;
- acionar tokenização apenas quando aplicável;
- chamar `payment-ops` com payload coerente;
- redirecionar corretamente após resposta.

### 7.2 Seleção de meios de pagamento

Arquivo principal: `src/components/checkout/PaymentMethods.tsx`

Responsabilidades nesta semana:
- refletir apenas métodos realmente permitidos;
- manter coerência entre método selecionado e campos exigidos;
- não introduzir estado inválido silencioso.

### 7.3 Backend de pagamento

Arquivo principal: `supabase/functions/payment-ops/index.ts`

Responsabilidades nesta semana:
- aceitar payload compatível com o checkout atual;
- criar pedido e item do pedido sem inconsistência;
- encaminhar corretamente para Mercado Pago;
- devolver resposta suficiente para o frontend continuar;
- registrar falhas com clareza suficiente para depuração.

### 7.4 Admin de gateways

Arquivo principal: `src/pages/admin/Gateways.tsx`

Responsabilidades nesta semana:
- permitir validar qual gateway está ativo;
- confirmar se Mercado Pago está configurado como esperado para sandbox;
- reduzir risco de configuração invisível ou divergente.

---

## 8. Fluxo de Dados Esperado

### Cartão

1. usuário preenche dados do cliente e do cartão;
2. checkout valida formulário;
3. frontend cria token pelo SDK do Mercado Pago;
4. frontend chama `payment-ops`;
5. backend cria pedido pendente;
6. backend cria pagamento no Mercado Pago sandbox;
7. frontend recebe resposta e redireciona;
8. pedido reflete status coerente.

### Pix

1. usuário escolhe Pix;
2. checkout envia payload sem token de cartão;
3. backend cria pedido pendente;
4. backend cria cobrança Pix no Mercado Pago;
5. frontend redireciona com QR code disponível;
6. webhook ou retorno atualiza status depois da liquidação.

### Boleto

1. usuário escolhe boleto;
2. checkout envia payload compatível;
3. backend cria pedido pendente;
4. backend recebe `ticket_url` do Mercado Pago;
5. frontend redireciona com link do boleto;
6. status evolui via retorno assíncrono.

---

## 9. Estratégia GSD para a Semana 2

A execução objetiva da semana seguirá esta ordem:

1. **Fazer o clique em comprar reagir visivelmente**
2. **Provar que `handlePaymentSubmit` dispara**
3. **Provar se a tokenização ocorre ou não**
4. **Provar se `payment-ops` recebe a chamada**
5. **Corrigir o primeiro bloqueio real encontrado**
6. **Repetir até cartão sandbox funcionar**
7. **Depois homologar Pix**
8. **Depois homologar boleto**
9. **Fechar webhook e consistência de status**
10. **Registrar checklist de homologação final**

Essa ordem é proposital: primeiro cartão por ter mais variáveis; depois Pix; depois boleto.

---

## 10. Critérios de Sucesso

A Semana 2 só é considerada concluída quando houver evidência fresca de que:

- clicar em comprar sempre produz ação visível no checkout;
- erros de validação são visíveis e compreensíveis;
- cartão de teste processa até o retorno esperado;
- Pix gera QR code ou retorno equivalente esperado;
- boleto gera ticket URL quando aplicável;
- `payment-ops` registra pedido sem inconsistência estrutural;
- status do pedido fica coerente com a resposta recebida;
- a configuração sandbox do gateway está validada;
- existe checklist operacional reproduzível para novos testes.

---

## 11. Riscos e Mitigações

### Risco 1 — Erro silencioso no frontend
**Mitigação:** priorizar instrumentação e feedback visual antes de revisar API externa.

### Risco 2 — Divergência entre frontend e schema backend
**Mitigação:** confrontar payload real do checkout com o schema Zod da função antes de ampliar qualquer lógica.

### Risco 3 — Credenciais ou configuração sandbox inconsistentes
**Mitigação:** validar admin, RPC de chave pública e credenciais reais em uso antes de alterar fluxo.

### Risco 4 — Webhook mascarar problema de criação do pagamento
**Mitigação:** separar claramente criação do pagamento de atualização assíncrona de status.

---

## 12. Resultado Esperado para a Próxima Fase

Ao final desta semana, o projeto não terá mais “integração parcial com Mercado Pago”. Ele passará a ter um gateway principal homologado em sandbox, com caminho claro para produção e base estável para futuras expansões.

Somente depois disso a expansão para novos gateways volta a fazer sentido.

---

## 13. Decisões Confirmadas nesta Spec

- Semana 2 não abrirá novos gateways.
- Mercado Pago será tratado como gateway principal a estabilizar.
- O código existente será analisado e reaproveitado antes de qualquer modificação.
- O foco imediato é resolver o checkout que hoje não reage visualmente ao clique em comprar.
- Homologação será feita por meio: cartão, Pix e boleto.

---

**Status:** spec pronta para revisão do usuário.
