# Plano de implementação — paridade Getfy × Flow5.5

**Data:** 18/11/2026
**Escopo:** 8 itens apontados como "parciais" ou "com diferenças" no relatório de portabilidade.
**Decisões fechadas:** sem gamificação por faturamento, estorno automático no gateway, funil de vendas completo, CAPTCHA e multi-tenant fora de escopo.
**Base:** leitura do código de referência (`Getfy/`) e do produto atual (`src/`, `supabase/`), mais dados de produção (consultas somente-leitura).

---

## 0. Diagnóstico consolidado (o que falta, exatamente)

| # | Item | Hoje no Flow | Falta para igualar o Getfy |
|---|---|---|---|
| 1 | Webhooks de saída | 5 eventos; fila + HMAC + retry (5 tentativas, backoff 30s→2h) prontos; **0 endpoints** criados | 8 eventos novos + `bearer_token` opcional + reenvio manual + teste de endpoint |
| 2 | E-mail marketing | Transacional (`send-email`), 28 linhas em `email_logs`, histórico com "Em breve" | Tabelas de campanha, segmentação, agendamento, pausa/retomada, fila, tracking de abertura/clique, recuperação de carrinho |
| 3 | Área do aluno | Módulos/aulas, progresso, comentários threading, materiais | Curtir aula, anotação por aula, "continuar assistindo" no dashboard |
| 4 | Gamificação | XP/streak/conquistas por **aulas**; tabela `achievements` **vazia** | ~~Conquistas por faturamento~~ **(decisão: não implementar)**. Só falta o seed das conquistas por aula/streak, que estão sem nenhum registro |
| 5 | Certificados | Desligado por padrão nos 2 níveis ✅; **bug "Invalid Date"** (linha 54) | `completion_percent` configurável + fix da data |
| 6 | Reembolsos | Só evento `order.refunded` via webhook | Solicitação do aluno, janela por produto, aprovação/rejeição no admin, revogação de acesso |
| 7 | Segurança checkout | Rate limit nas edges | Honeypot + limite de pedidos pendentes por IP/e-mail + reuso de PIX pendente. *(CAPTCHA/Turnstile: segunda etapa)* |
| 8 | Funil de vendas | UTM em localStorage + pixels | **Funil completo**: visita → iniciou form → preencheu → pagou, + abandono, + recuperação automática por e-mail/WhatsApp, + painel |

---

## FASE 1 — Correções rápidas (baixo risco, alto valor)

> Objetivo: zerar os bugs observados e fechar lacunas de 1 arquivo. Sem migration estrutural.

### 1.1 Fix: "Invalid Date" nos certificados
- **Arquivo:** `src/pages/admin/CertificatesDashboard.tsx:54`
- **Causa:** `new Date(cert.id)` — usa o UUID como data.
- **Fix:** `new Date(cert.issued_at ?? cert.created_at).toLocaleDateString("pt-BR")`
- **Aceite:** lista mostra a data real de emissão; certificados antigos sem `issued_at` caem em `created_at`.

### 1.2 Certificado por % de conclusão
- **Migration:** `alter table courses add column certificate_min_percent integer not null default 100 check (between 1 and 100)`
- **Front (aluno):** `LessonSidebar.tsx:119` — troca `progressPercentage === 100` por `progressPercentage >= (course.certificate_min_percent ?? 100)` e exibe "faltam X%".
- **Front (admin):** campo no modal de curso (`src/components/admin/*Course*`) + `IssueCertificateModal` passa a listar cursos com percentual ≥ configurado.
- **Banco:** trigger `issue_certificate_guard` valida o percentual no insert (hoje só valida `certificates_enabled`).
- **Aceite:** curso a 100% com exigência 100 continua igual; exigência 80 libera em 80%.

### 1.3 Webhooks de saída: completar o catálogo
- **Front:** `src/components/admin/webhook/WebhookOutbound.tsx:26` — `OUTBOUND_EVENTS` de 5 → 13, mapeando os eventos do Getfy:
  `order.pending`, `order.paid`, `access.ready`, `order.failed`, `order.canceled`, `order.refunded`, `payment.pix_generated`, `payment.boleto_generated`, `cart.abandoned`, `subscription.created`, `subscription.renewed`, `subscription.canceled`, `subscription.past_due`.
- **Banco:** `enqueue_webhook_deliveries` (migration `20261113000000`, linha ~153) — adiciona `pending` ao `case`; `enqueue_refund_deliveries` já cobre `refunded`.
- **Payload:** `build_order_webhook_payload` já devolve o essencial; acrescentar `payment_method` e `pix_qr_code`/`boleto_url` quando existirem em `payments`.
- **Fora de escopo imediato:** `cart.abandoned` e `subscription.*` só passam a ocorrer quando existirem carrinho (item 4.4) e assinaturas — o catálogo fica pronto, os eventos são emitidos quando a feature existir.
- **Aceite:** endpoint criado recebe `order.paid` na confirmação de pagamento; admin consegue marcar os 13 eventos.

### 1.4 Webhooks: reenvio manual + teste de endpoint
- **Front:** `WebhookOutbound.tsx` — botão "Reenviar" na linha do log (já existe ícone `RotateCcw`) chamando edge; botão "Testar" no endpoint.
- **Edge `dispatch-webhooks`:** aceitar `{ action: "retry", deliveryId }` (admin-only) e `{ action: "test", endpointId }` que envia payload sintético.
- **Aceite:** log com `failed` volta a `pending` e é reentregue; "Testar" mostra status HTTP de retorno no toast.

**Esforço Fase 1:** ~1 dia. **Risco:** baixo (1 migration de 1 coluna + 1 trigger).

---

## FASE 2 — Notificações: e-mail fora da fila + histórico

> Objetivo: fechar o buraco de confiabilidade (hoje e-mail é disparo direto: se o provedor falhar, o e-mail se perde).

### 2.1 E-mail entra na fila durável
- **Migration (`20261118150000_email_queue.sql`):** `email_logs` ganha `attempts`, `next_attempt_at`, `sent_at` + índice parcial `where status='queued'`. O `CHECK` de `status` já aceitava `queued` desde a criação da tabela.
- **A fila é `email_logs`, não `notification_deliveries`:** aquela tabela exige `notification_id` (FK) e `user_id` — e-mail de comprador visitante não tem nenhum dos dois. `email_logs` já nasceu como registro de envio de e-mail; só faltava o estado "ainda não saiu".
- **Edge:** lógica de render/entrega extraída para `_shared/email.ts` (`renderEmail`, `deliverEmail`, `loadEmailSettings`, `isTypeEnabled`); fila em `_shared/email-queue.ts` (`enqueueEmail`, `dispatchPendingEmails`, backoff 2 min → 2 h, 5 tentativas, falha permanente vira `failed` na hora).
- **Chamadores:** `payment-ops` (boas-vindas do visitante), `create-user`, `check-achievements`, `retention-cron`, `webhook-payment` trocaram `fetch(send-email)` por `enqueueEmail`. `send-email` continua existindo só para envio avulso/teste do painel.
- **Aceite:** derrubar o provedor e ver a linha ficar `queued` com `error_message`/`attempts`, sendo retentada; nada se perde.

### 2.2 Histórico de disparos real
- **Front:** `EmailSettings.tsx` e `WhatsAppSettings.tsx` — empty state "Em breve" trocado por texto real (as tabelas já eram alimentadas por `email_logs`/`whatsapp_logs`). Badge novo `Na fila (n)` para `status='queued'`, com o motivo no tooltip.
- **Segurança:** a policy `Authenticated all access` de `email_logs` (`using(true)` para qualquer logado, incluindo DELETE) virou `has_role(auth.uid(),'admin')` só-leitura.
- **Aceite:** a aba "Logs" mostra os registros existentes e os novos, com o estado da fila.

**Pendência conhecida:** `whatsapp_logs` mantém a mesma policy `Authenticated all access` — qualquer aluno logado lê telefones de todos os compradores. Corrigir junto da fase de mensageria.

**Esforço Fase 2:** ~1,5 dia. **Risco:** médio (mexe no caminho de envio; precisa de teste com provedor em staging).

---

## FASE 3 — E-mail marketing (campanhas)

> Espelha `EmailCampaign`/`EmailCampaignSend` do Getfy, adaptado ao padrão de fila durável do Flow.

### 3.1 Schema
```sql
email_campaigns(id, name, subject, body_html, filter_config jsonb, status text,
  total_recipients int, sent_count int, failed_count int,
  scheduled_at, sent_at, paused_at, last_error, backoff_until, created_by, created_at, updated_at)
-- status: draft | sending | paused | sent | cancelled
email_campaign_sends(id, campaign_id, recipient_email, recipient_name, user_id,
  status text, -- pending|sent|failed|skipped
  error, sent_at, opened_at, clicked_at, created_at)
email_templates já existe como json em email_settings; promover a tabela própria (opcional)
```
- RLS: admin only.

### 3.2 Segmentação (`filter_config`)
- `{ all_customers: bool, product_ids: uuid[], course_ids: uuid[] }` — o Getfy filtra por produto; no Flow o equivalente natural é **curso** (via `user_course_access`) e **produto comprado** (via `order_items`).
- Preview de destinatários antes de enviar (contagem + amostra), como `previewRecipients` do Getfy.
- **Exclui automaticamente:** `email_opt_outs` e quem já recebeu o mesmo `campaign_id`.

### 3.3 Envio
- **Edge `send-campaign`:** pega lote de 30 pendentes, envia via provider, respeita `backoff_until`, marca `sent/failed`, atualiza contadores; congela em `paused` quando erro de provedor > N.
- **Cron:** novo job `dispatch-campaigns * * * * *` (mesmo padrão dos 3 existentes).
- **Pausa/retomada/cancelamento:** ações no admin que só trocam `status` (o worker respeita).

### 3.4 Tracking
- Pixel 1x1 `GET /functions/v1/campaign-open?id=...` → grava `opened_at`.
- Rewrite de links → `campaign-click?id=...&url=...` → grava `clicked_at` e redireciona.
- **Atenção CSP:** `nginx.conf` precisa liberar a URL da edge em `img-src`/`connect-src` para o pixel (já cobre `*.supabase.co`).

### 3.5 Recuperação de abandono (funil completo)
- **Decisão:** abandono = **visitante preencheu o formulário (nome/e-mail/CPF capturados) e não pagou**. Cobre também quem gerou PIX/boleto e não pagou.
- **Régua única, dois toques** (sem duplicar): a recuperação é agendada a partir de `checkout_sessions` (Fase 5), não de `orders`:
  - `step = 'converted'` → cancela qualquer recuperação pendente.
  - `step = 'form_filled'` e `form_filled_at` > 10 min sem pedido pago → enfileira toque 1 (e-mail).
  - Se continua abandonado após 24 h → toque 2. Depois disso, encerra.
  - Se houver PIX/boleto gerado, o toque inclui o QR/linha digitável (puxa de `payments`).
- **Controle de duplicidade:** `abandonment_recoveries(checkout_session_id, touch int, status, sent_at)` com `unique(checkout_session_id, touch)` — o cron pode rodar quantas vezes quiser que não repete.
- **Canal:** e-mail na 1ª versão; WhatsApp como segundo canal quando a fila da Fase 2 estiver no ar (`notification_deliveries` já tem `channel`).
- **Opt-out:** todo e-mail de recuperação leva link de descadastro; `email_opt_outs(email)` é consultada antes de enfileirar (exigência legal, não opcional).

### 3.6 UI
- `src/pages/admin/EmailCampaigns.tsx` (lista: nome, status, progresso "X/Y", ações pausar/retomar/cancelar)
- `src/pages/admin/EmailCampaignEditor.tsx` (assunto, corpo HTML, seletor de segmento, preview de destinatários, agendar)
- Rota em `App.tsx` + item no `AdminSidebar`.
- Aba dentro de `/admin/emails` (reaproveita o hub existente) é preferível a uma rota nova.

**Esforço Fase 3:** ~4 dias. **Risco:** médio-alto (envio em massa; precisa de throttle e teste controlado).

### 3.7 Aceite da fase
- Criar campanha para "todos os alunos do curso X" → preview mostra a contagem correta.
- Enviar → status vai a `sending`, contadores sobem, `email_logs`/`email_campaign_sends` registram cada envio.
- Pausar no meio → para de enviar; retomar → continua de onde parou; cancelar → não envia mais.
- Abrir/clicar (em ambiente com pixel ativo) → `opened_at`/`clicked_at` preenchidos e refletidos no painel.
- Abandono: preencher formulário, sair → em 10 min aparece na lista de abandonos; toque 1 sai; pagar depois → recuperação cancelada e pedido marcado como recuperado.

---

## FASE 4 — Reembolsos

> Espelha `RefundService` + `RefundRequest` do Getfy.

### 4.1 Schema
```sql
refund_requests(id, order_id, product_id, user_id, status, -- requested|approved|rejected
  reason_code, reason_text, requested_at, reviewed_by, reviewed_at, gateway_refund_id, created_at)
alter table courses add column refund_window_days integer;        -- null = sem reembolso
alter table courses add column refund_enabled boolean default false;
```
- **Status do pedido:** `orders.status` hoje não tem `refunded` (check: draft|pending|paid|failed|canceled|expired). Adicionar `refunded` ao check + ao `statusConfig` de `Orders.tsx` (já tem a entrada visual, só não é alcançável).

### 4.2 Fluxo do aluno
- Botão "Solicitar reembolso" na página do curso (`Course.tsx`), visível só quando: curso tem `refund_enabled`, pedido está `paid`, dentro da janela `refund_window_days` a partir de `paid_at`, e não há solicitação aberta. Mensagem com dias restantes (igual ao Getfy).

### 4.3 Fluxo do admin
- Tela em `/admin/pedidos` (ou nova `/admin/reembolsos`): lista solicitações, aprovar (chama gateway de estorno) ou rejeitar com motivo.
- **Estorno no gateway (decisão: automático):** `payment-ops` ganha `action: "refund"` com suporte por provider — Stripe (`refunds`), Mercado Pago (`/v1/payments/{id}/refunds`), Asaas (`/v3/payments/{id}/refund`), Pagar.me (`/core/v5/charges/{id}/refund`), PayPal (`/v2/payments/captures/{id}/refund`), Efí (`PUT /v2/cob/{txid}` com status devolvido), CajuPay (endpoint de cancelamento).
- **Fallback obrigatório:** provider sem suporte à API de estorno → a aprovação **não** falha silenciosamente: marca `refund_requests.status='approved'` + `gateway_refund_id=null` + campo `manual_refund_required=true`, exibe aviso no painel com link para o gateway e exige confirmação humana do estorno antes de fechar o pedido.
- **Idempotência:** antes de chamar o gateway, checa `gateway_refund_id` existente — clique duplo não estorna duas vezes.
- **Erro do gateway:** a solicitação fica `approved` com `last_error` e botão "Tentar novamente"; o acesso **só é revogado após estorno confirmado**.

### 4.4 Efeitos
- Aprovado → `orders.status='refunded'` → trigger `enqueue_refund_deliveries` (já existe) emite webhook + revoga acesso via `revoke_access_on_refund` (trigger novo em `orders`, análogo ao `grant_order_access`).
- Certificado: revogar ou manter? Getfy mantém o registro e sinaliza. **Proposta:** manter histórico, marcar `revoked_at`.

**Esforço Fase 4:** ~3 dias. **Risco:** médio (dinheiro envolvido; precisa de teste com gateway em sandbox).

---

## FASE 5 — Funil de vendas completo (tracking + abandono + recuperação)

> Espelha `CheckoutSession` (`visit → form_started → form_filled → converted`) e é a **base** da recuperação de abandono. Sem esta fase, "carrinho abandonado" não existe: não há como saber quem preencheu e desistiu.

### 5.1 Schema
```sql
cart_leads(id, product_id, user_id, email, name, phone, cpf, status, stage, stage_started_at,
  abandoned_at, recovered_at, last_activity_at, metadata, created_at, updated_at)
  -- status: open | recovered | dismissed | expired
  -- único por (lower(email), product_id) where status='open'
cart_recovery_settings(id boolean pk, enabled, stage_minutes int[] default '{10,300,1440}',
  channel_email, channel_whatsapp, discount_percent)
```
- Tabela própria, **não** `orders.status='draft'`: `payment-ops` cria um pedido novo a cada tentativa, e um rascunho no preenchimento ficaria órfão duplicando o pedido. Além disso toda leitura de `orders` passaria a ver linha que nunca foi cobrança.
- `ip_hash` não existe: o IP já fica em `orders.metadata.device.ip` e em `cart_leads.metadata.tracking` via UTM; hash ao lado seria duplicação, não privacidade.

### 5.2 Captura
- **RPC `capture_cart_lead(product_id, email, name, phone, cpf, metadata)`**, `security definer`, executável por `anon`/`authenticated`. Chamada direto do PostgREST pelo checkout — sem hop de edge. `status`, `stage` e `recovered_at` não são parâmetros: o visitante não os escolhe.
- **Front:** `Checkout.tsx` — efeito com debounce de 2,5 s sobre `form.watch`: quando nome (≥3) e e-mail são válidos, chama a RPC. `metadata` leva `tracking` (UTM/click ids do `localStorage`), método de pagamento, bumps e cupom. Falha é silenciosa (`console.debug`) — funil não bloqueia compra.
- **Conversão:** trigger `mark_cart_leads_recovered` em `orders` (update de status para `paid`) fecha o lead por e-mail + produto. `exception → raise warning`, nunca desfaz o pagamento.
- **Abandono:** `cart-recovery` (`sweep`, cron `*/5`) marca `abandoned_at` quando `last_activity_at` passou de `stage_minutes[1]` (10 min). Antes disso o lead é `open` sem abandono — quem preencheu e pagou em 3 min não é perda.

### 5.3 Recuperação automática
- **3 estágios** (`stage_minutes`: 10 min, 5 h, 24 h). `stage` = índice do último contato enviado; o cron compara `stage_started_at` + `stage_minutes[stage]`.
- **Canais:** e-mail sempre pela fila durável (`email_logs`, tipo `custom`), WhatsApp opcional via `send-whatsapp`. Templates padrão codificados; admin pode trocar a mensagem no contato manual.
- Lead parado 7 dias após o último estágio vira `expired`.

### 5.4 Painel — `/admin/carrinho-abandonado`
- Cards: em aberto, recuperados (com valor salvo), valor em risco, taxa de recuperação.
- Barra de configuração: funil ativo, canal e-mail, canal WhatsApp (grava em `cart_recovery_settings`).
- Tabela: cliente (nome/e-mail/telefone), produto e preço, estágio do funil, status, data do abandono.
- **Contato por lead:** link direto `wa.me` com mensagem pronta, botão de e-mail, e diálogo para envio avulso (WhatsApp ou e-mail) via `cart-recovery` ação `manual`. Contato manual reinicia `stage_started_at` — quem acabou de receber mensagem não leva outra do robô no minuto seguinte.
- Botão "Processar agora" roda o `sweep` na hora, sem esperar o cron.

### 5.5 Webhook `cart.abandoned`
- Entra no catálogo (`WebhookOutbound.tsx`), grupo "Funil".
- Emitido por `enqueue_cart_abandoned_webhook(lead_id)`, chamado pelo `sweep` — não por trigger: abandono é resultado de janela de tempo, não de escrita.
- Payload: `lead_id`, `product_id`, `product_name`, `customer{name,email,phone}`, `stage`, `abandoned_at`, `checkout_url`, `metadata`.

**Esforço Fase 5:** ~4 dias. **Risco:** baixo (analítico; nada bloqueia venda). **Feito.**

---

## FASE 6 — Segurança do checkout

> Espelha `CheckoutAbuseGuard` + `config/checkout_security.php`.

### 6.1 Honeypot
- **Front:** `CustomerForm.tsx` — campo invisível (`name="website"`, fora da tela, `tabIndex=-1`, `autoComplete="off"`, `aria-hidden`).
- **Edge `payment-ops`:** se vier preenchido → responde 200 com `orderId` falso **sem criar pedido** (não revelar o bloqueio ao bot).

### 6.2 Limites por IP/e-mail (valores do Getfy como padrão)
| Regra | Valor |
|---|---|
| Pedidos pendentes por IP/hora | 25 |
| Pedidos pendentes por e-mail/hora | 15 |
| Janela de lookback | 1 h |
| Reuso de PIX pendente (lookback) | 120 min (QR válido 25 min) |

- **Implementação:** `checkPendingOrders()` em `_shared/rate-limiter.ts`, **contando `orders`**, não `rate_limits`: o que importa é o pedido que ficou aberto, e recontar requisições puniria quem errou o cartão e tentou de novo.
- **IP:** vem de `orders.metadata.device.ip` (já gravado no insert). **Não existe `orders.ip_hash`** e não foi criada: o IP cru já é usado pela Pixel X, um hash ao lado seria duplicação, não privacidade.
- **PIX criado por minuto (8):** não implementado. O reuso abaixo já limita a criação a ~2 QR por janela de 25 min por e-mail+produto, que é o caso real de flood.
- **Reuso de PIX pendente:** devolve o QR existente (`payments.raw_response`) quando há pedido `pending` do mesmo e-mail+produto, sem cupom nem bump (valor pode ter mudado).
- **Fail-open:** erro no banco não derruba o checkout (mesma regra do limiter de requisições).

**Esforço Fase 6:** ~1,5 dia. **Risco:** médio (se o limite for agressivo, barra cliente legítimo — começar com os valores do Getfy e monitorar).

---

## FASE 7 — Área do aluno e gamificação

### 7.1 Curtir aula + anotação
- **Migration:** `lesson_likes(user_id, lesson_id, created_at, PK(user_id,lesson_id))`; `lesson_notes(user_id, lesson_id, content, updated_at)`.
- **UI:** `Lesson.tsx` — botão de like com contador e bloco "Minha anotação" (salva automático com debounce).
- **Aceite:** like é idempotente; anotação persiste ao trocar de aula.

### 7.2 "Continuar assistindo"
- `Dashboard.tsx` — bloco com a última aula assistida (`user_progress.last_watched_at` já existe) + progresso.

### 7.3 Seed das conquistas existentes
- **Problema:** a tabela `achievements` está **vazia** em produção — o sistema de conquistas existe em código mas nenhuma conquista é desbloqueável hoje.
- **Ação:** seed com critérios por aula/streak (`lessons_completed`, `streak_days`, `daily_lessons` — os três tipos que `check-achievements` já implementa), com `xp_reward` coerente.
- **Não inclui** conquista por faturamento (decisão: fora de escopo).

**Esforço Fase 7:** ~2 dias. **Risco:** baixo.

---

## Ordem recomendada e dependências

```
Fase 1 (fixes)         ────────────────────►  entrega imediata, sem dependência
Fase 7 (área do aluno) ────────────────────►  independente
Fase 6 (segurança)     ◄── orders.ip_hash
Fase 2 (fila e-mail)   ────────────────────►  pré-requisito da Fase 3
Fase 5 (funil)         ────────────────────►  pré-requisito da Fase 3 (abandono)
Fase 3 (campanhas)     ◄── depende de 2 e 5
Fase 4 (reembolsos)    ◄── independente (usa payment-ops refund)
```

**Sequência sugerida:** 1 → 7 → 6 → 2 → 5 → 3 → 4.

Justificativa da troca: a **Fase 5 (funil) passou a ser pré-requisito** da recuperação de abandono — sem saber quem preencheu o formulário e desistiu, não há régua de recuperação. Por isso ela vem antes da 3, e não depois.

**Esforço total estimado:** ~17,5 dias (1 + 2 + 1,5 + 1,5 + 4 + 4 + 3 + 0,5).

---

## Decisões tomadas (fechadas)

| # | Questão | Decisão |
|---|---|---|
| 1 | Conquistas por faturamento | **Não implementar.** Só seed das conquistas por aula/streak que já existem em código |
| 2 | Estorno no gateway | **Automático** nos providers que suportam API de estorno; fallback manual explícito quando não suportar |
| 3 | Carrinho abandonado | **Implementar funil de vendas completo.** Abandono = formulário preenchido sem pagamento (inclui PIX/boleto gerado e não pago) |
| 4 | CAPTCHA/Turnstile | **Segunda etapa** (fora deste plano) |
| 5 | Multi-tenant | **Fora de escopo** |

---

## Nota de segurança / LGPD no funil

O funil grava e-mail, nome, IP (hasheado) e UTM de quem **não** comprou. Isso é dado pessoal de não-cliente:
- `ip_hash` com sal do servidor, nunca IP puro.
- Retenção definida (proposta: 90 dias para sessões não convertidas; convertidas ficam pelo prazo fiscal).
- Todo e-mail de recuperação com link de descadastro funcional (`email_opt_outs`).
- Exclusão a pedido do titular: apagar `checkout_sessions`/`checkout_session_fields` pelo e-mail.
