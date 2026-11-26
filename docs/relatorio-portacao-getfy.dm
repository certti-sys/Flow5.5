# Relatório: funcionalidades portadas do Getfy → Flow5.5

> **DOCUMENTO HISTÓRICO — 25/11/2026.** Retrata o estado em 18/11/2026.
> Vários itens marcados abaixo como "não portados" ou "pela metade" foram
> entregues depois: upsell/downsell público, drip content com liberação
> programada **e e-mail de conteúdo liberado**, leitor de PDF com marcações,
> recuperação de carrinho com SMS, conquistas com 5 critérios e tela de admin,
> webhooks de saída com 14 eventos e receptor de teste, páginas legais
> editáveis, opt-out do ranking, e ainda correções de RLS e design system.
> Estado atual e pendências: `docs/relatorio-pendencias-paridade.html` e
> `docs/plano-pendencias-restante.html`.

**Data:** 18/11/2026
**Status:** validação concluída (nenhuma alteração em produção)
**Metodologia:** inventário duplo em paralelo (um levantamento lendo apenas a pasta de referência `Getfy/`, outro lendo apenas o produto atual `src/`, `supabase/`, `docs/`), cruzamento das duas listas e **validação prática** com Puppeteer no localhost + consultas somente-leitura ao banco de produção (`npx supabase db query --remote --read-only`).
**Estado do código no fim:** `tsc --noEmit` limpo, `npm run build` limpo, `git status` limpo, scripts locais de teste removidos.

---

## 1. Resumo executivo

| Situação | Qtd |
|---|---|
| Portadas e validadas (funcionais e iguais ao Getfy) | **16 domínios** |
| Portadas com diferenças (funcionam, mas não idênticas) | **7** |
| Não portadas (gaps confirmados por ausência de código/tabelas) | **11** |
| Itens pela metade dentro do próprio Flow (independentes do Getfy) | **6** |
| Rotas testadas sem crash/error boundary | **28/28** |

---

## 2. ✅ Portadas e validadas (funcionais e iguais ao Getfy)

| # | Funcionalidade | Igual ao Getfy? | Validação executada |
|---|---|---|---|
| 1 | **8 gateways** (Mercado Pago, Stripe, Asaas, PushinPay, Pagar.me, PayPal, Efí, CajuPay) | ✅ mesmos 8 drivers do Getfy (o Getfy ainda menciona Spacepag nos docs, mas o driver não existe lá) | Teste de conexão no `GatewayConfigModal`; ativação por gateway e por método; cobrança bloqueada quando gateway está desativado (edge `payment-ops`) |
| 2 | **Webhook de entrada PSP — nunca confia no corpo** | ✅ mesma regra do Getfy (`Jobs/ProcessPaymentWebhook.php → reconfirmGatewayStatus`) | Payloads falsos enviados às edge functions em produção: Stripe → **400 "missing signature"**; Mercado Pago → **reconsultou a API e recusou** (`payment lookup failed`); Asaas/Efí/PayPal → recusados por credencial não configurada; Pagar.me/CajuPay/PushinPay → id inexistente ignorado |
| 3 | **Webhooks de saída assinados** (fila durável + retry) | ⚠️ infra igual, catálogo menor: **5 eventos** (order.paid, order.refunded, order.canceled, order.failed, order.expired) × **13 eventos do Getfy** | `pg_cron` `dispatch-webhooks` **ativo a cada minuto**; fila `webhook_deliveries` drenando (0 pendentes); HMAC `X-Flow-Signature` no código; hub `/admin/webhooks` com abas SAÍDA / HISTÓRICO E LOGS / REGRAS DE ACESSO / SAÚDE DE DADOS / AVANÇADO |
| 4 | **Cupons** (% ou fixo, produto alvo, valor mínimo, limite de usos, janela de validade) | ✅ regras idênticas: Getfy `Coupon::applyTo()` ↔ Flow edge `validate-coupon` | Ao vivo no checkout: `50OFF` (restrito a "Curso Vide Coding") → **recusado** com toast no curso CSS e **127,00 → 63,50** no produto certo; `30OFF` (global) → **97,00 → 67,90** com toast "Cupom aplicado! Desconto: R$ 29.10" |
| 5 | **Order bump** | ✅ | Checkout real do Curso Vide Coding: "APROVEITE ESSA OFERTA EXCLUSIVA 30% OFF … R$ 127,00 riscado → **R$ 88,90** + Clique para adicionar" |
| 6 | **Contador de urgência (timer)** | ✅ configurável por produto, como no Getfy | Banner sticky "Oferta expira em 14:56" **decrementando** (14:56 → 14:54); some quando `timer.enabled=false`; sem erros de console |
| 7 | **Checkout por slug público + página única + compra como visitante** | ✅ | `/c/curso-css` e `/checkout/711d760c…` renderizam idênticos; formulário de visitante (nome/e-mail/CPF/celular), PIX/cartão/boleto, imagens de gateway (`/images/gateways/pix.svg`, `boleto.png`, `card-method.png`, `cards/*`), garantia e "Ambiente Criptografado" |
| 8 | **Cupom no checkout (UI + AJAX)** | ✅ | Campo "Cupom de desconto" + botão Aplicar chamando `POST /functions/v1/validate-coupon` |
| 9 | **Certificados: desligado por padrão nos dois níveis, bloqueio só na emissão** | ✅ regra portada | Produção: `platform_settings.certificates_enabled = false` **e** os 5 cursos com `certificates_enabled = false`; modal de emissão lista **0 cursos** e exibe "Cadastre ao menos um aluno e um curso antes de emitir certificados" (+ trigger recusa o insert); **2 certificados já emitidos continuam visíveis** em `/certificado/:id` |
| 10 | **Alunos: CRUD, export/import CSV com acesso a cursos** | ✅ (Getfy: `AlunosController::import`) | Export ao vivo: `alunos-2026-11-18.csv` com BOM UTF-8, separador `;`, cabeçalho pt-BR (`name;email;whatsapp;status;member_since;courses;courses_names`) e nomes de cursos |
| 11 | **Notificações: sino in-app com audiência/agendamento + WhatsApp + push + e-mail** | ⚠️ parcial (ver §3) | 3 crons ativos no banco (`dispatch-notifications`, `dispatch-integrations`, `dispatch-webhooks`, todos `* * * * *`); **2 inscrições push reais** (`push_subscriptions`); fila `notification_deliveries` zerada (drenando) |
| 12 | **Integrações: Utmify, Spedy (NF), Integrax SMS, Meta CAPI, pixels Meta/X/TikTok/Google Ads/GA4/GTM/script** | ✅ (Cademi não faz falta: o Flow é o próprio LMS) | `dispatch-integrations` ativo a cada minuto; fila `integration_deliveries` zerada; hub `/admin/integracoes` com catálogo e teste de conexão |
| 13 | **PWA + Web Push (VAPID)** | ✅ | `public/manifest.webmanifest` + `public/sw.js` presentes; `VITE_VAPID_PUBLIC_KEY` no `.env`; nginx responde 404 real para `sw.js/manifest` (não cai no `index.html`); hook `usePushNotifications` com inscrição real |
| 14 | **Segurança: CSP + headers de resposta** | ✅ parcial (ver §3) | `nginx.conf`: CSP com allowlist de gateways/pixels/players, HSTS com preload, X-Frame-Options SAMEORIGIN, X-Content-Type-Options, Referrer-Policy strict-origin-when-cross-origin, Permissions-Policy |
| 15 | **Builder de checkout, admin de order bumps, carrosséis, personalização, gateways, integrações, webhooks, monitoring** | ✅ | Smoke completo: **28/28 rotas** do produto abrem sem error boundary, sem crash e sem spinner preso |
| 16 | **Área do aluno: módulos/aulas, progresso, comentários com threading, materiais, XP/streak/conquistas/ranking** | ⚠️ parcial (ver §3) | Rotas OK; validações de sessões anteriores: 4/4 conclusão de aula, 6/6 comentários, 7/7 player de vídeo, 12/12 páginas de curso |

---

## 3. ⚠️ Portadas com diferenças (funcionam, mas não são iguais ao Getfy)

| Funcionalidade | Diferença em relação ao Getfy |
|---|---|
| **Gamificação / conquistas** | Getfy: conquistas por **faturamento** (metas de 10k a 5M, `config/conquistas.php`). Flow: conquistas por **XP/aulas concluídas** (`achievements`, `check-achievements`). É uma feature diferente, não a mesma portada |
| **E-mail marketing (campanhas)** | Getfy: campanhas com filtro de destinatários (todos/produtos), pausa/retomada/cancelamento, recuperação de carrinho e pedido pendente por e-mail/SMS. Flow: só **transacional** (templates + teste de envio via Brevo/SMTP), **fora da fila durável** (só WhatsApp e push são enfileirados) e histórico de disparos com empty state "Em breve" |
| **Webhooks de saída** | 5 eventos vs 13 do Getfy; **0 endpoints configurados** em produção (pipeline pronto: fila + cron + HMAC + retry, mas sem destinatário real para teste ponta a ponta) |
| **Checkout avançado (tracking de funil)** | Getfy rastreia visitas, preenchimento de campos, país e UTM por visita (`CheckoutTrackingController`). Flow captura **UTM** (`src/lib/tracking.ts`) e dispara pixels, mas não tem funil de campos nem Geo-IP/moeda (preço só em R$) |
| **Reembolsos** | Getfy: tela de aprovação/rejeição com `RefundService` + revogação de acesso + janela configurável. Flow: apenas o **evento `order.refunded` via webhook remove o acesso** — não há fluxo administrativo de reembolso |
| **Segurança do checkout** | Getfy: honeypot + `PreventCheckoutAbuse` + limite de pedidos pendentes por IP/e-mail (+ Turnstile só em `.env.example`). Flow: **rate limit nas edge functions** (`rate-limiter.ts`, tabela `rate_limits`), mas **sem honeypot/anti-abuse de checkout** |
| **Certificados** | Emitidos pelo admin ou por resgate do aluno a 100% (`LessonSidebar`), sem **% de conclusão configurável** como no Getfy (`canIssueCertificate`). **Bug observado:** a data do certificado aparece como **"Invalid Date"** na lista do admin (`/admin/certificados`) |

---

## 4. ❌ Não portadas (gaps confirmados por ausência de código, migrations ou tabelas)

1. **Afiliados, parceiros e co-produção** — comissões, split produtor/afiliado/co-produtor, hold de liberação, saque/payout, painel do parceiro. Nenhuma tabela `commission/payout/affiliate` nas migrations.
2. **Upsell/Downsell pós-compra** — só texto na UI ("Estratégias de Upsell…"), nenhum fluxo.
3. **Drip content** — liberação de aula por dias, data fixa, % de progresso ou módulos prévios: **nenhum campo `release_*`** nas migrations.
4. **Assinaturas recorrentes** — tabela `subscriptions` existe no banco, mas **0 linhas e nenhuma leitura em `src/`** (não funcional).
5. **Carrinho multi-produto** — checkout é produto único (o order bump é o único "item extra" possível).
6. **API REST v1 / API Applications** — checkout hospedado por token (`/api-checkout/{token}`), API key, docs interativas: inexistente no Flow.
7. **Sistema de plugins** e **equipe/permissões com UI de auditoria** — `audit_logs` só é escrito pelas edges (`create-user` etc.); não há tela de equipe/roles como a do Getfy.
8. **Financeiro** — saldo, chave PIX, solicitação/aprovação de saque; **relatórios com export de compradores/abandonos do Meta**; aprovação manual de pedido.
9. **Prova de venda pública** (`GET /verify/{code}`), **renovação de assinatura por token**, **magic link / login sem senha**, **multi-tenant** (3 estratégias de URL: path, subdomínio, domínio custom).
10. **Área de membros rica** — likes, notas, anotações em PDF, comunidade (posts), loja interna: o Flow tem apenas comentários em aula.
11. **Recuperação de carrinho e pedido pendente** por e-mail/SMS (comandos agendados do Getfy).

---

## 5. 🟡 Itens pela metade dentro do próprio Flow (independentes do Getfy)

1. **`video-proxy`** — edge function completa (YouTube/Vimeo/Panda/Bunny/vturb/Drive), **zero chamadas em `src/`** (órfã).
2. **`retention-cron`** — completa (avisa streak em risco), mas **nenhum `cron.schedule`** — só 3 jobs no ar, este não é um deles.
3. **Meta Cloud API do WhatsApp** — UI marcada "Em breve" (`WhatsAppSettings.tsx:40`).
4. **Histórico de disparos** (e-mail/WhatsApp) — empty state "Em breve" (`EmailSettings.tsx:534`, `WhatsAppSettings.tsx:452`).
5. **Componentes órfãos** — `XPCounter`, `StreakIndicator`, `LevelBadge`, `AchievementBadge`, `ContactCard`, `ProgressOverview`, `QuickStats`, `RecentActivity`, `StatCard`, `CourseProgressItem` nunca importados; `Placeholder.tsx` importado mas sem rota; `Admin.tsx` e `Index.tsx` sem rota.
6. **`/admin/sandbox`** — rota existe mas não aparece no `AdminSidebar`.

---

## 6. Números das validações executadas

| Validação | Resultado |
|---|---|
| Smoke de rotas (Puppeteer, sessão admin) | **28/28 OK** — nenhum error boundary, crash ou spinner preso |
| Checkout público (`/c/:slug` + `/checkout/:id`) | PASS — preço, PIX/cartão/boleto, imagens de gateway, cupom, garantia |
| Cupom com escopo de produto (recusa + aplicação) | PASS — 127,00 → 63,50; 97,00 → 67,90 |
| Order bump no checkout real | PASS — 30% OFF renderizado com preço riscado |
| Contador de urgência (ligado/desligado) | PASS — decrementa, sticky, some quando off |
| Export CSV de alunos | PASS — BOM, `;`, cabeçalho pt-BR, cursos por aluno |
| Bloqueio de emissão de certificado | PASS — 0 cursos elegíveis, aviso exibido, certificados existentes seguem visíveis |
| Webhooks de entrada com payloads falsos (produção) | PASS — 5/5 barrados ou rejeitados por reconsulta/id inexistente |
| Crons de produção (`pg_cron`) | PASS — 3 jobs ativos a cada minuto |
| Filas duráveis (webhook/notification/integration) | PASS — 0 pendentes (dreno funcionando) |
| PWA (manifest + sw + VAPID) | PASS |
| `tsc --noEmit` / `npm run build` | limpos |

---

## 7. O que NÃO pôde ser testado (e por quê)

| Item | Motivo |
|---|---|
| Compra real ponta a ponta (gateway → webhook → acesso) | Produção tem **0 pedidos**; criar cobrança real exige consentimento e toca PSP |
| Envio real de e-mail / WhatsApp / push | Enviaria mensagens reais a usuários — só com aval explícito |
| Import de CSV de alunos | Escreveria usuários reais no banco (exige consentimento, como em testes anteriores) |
| Webhook de saída ponta a ponta | Nenhum endpoint configurado (`webhook_endpoints = 0`) |
| Habilitar timer/order bump em outros produtos | Escrita em `products.checkout_config` (produção) |

---

## 8. Prioridades sugeridas (para a revisão)

1. **Conversão (maior impacto):** upsell/downsell, drip content, recuperação de carrinho/pedido pendente.
2. **Receita recorrente:** assinaturas (tabela já existe, vazia).
3. **Growth:** afiliados/parceiros/comissões, campanhas de e-mail, webhook de saída com mais eventos + endpoint real.
4. **Correções pontuais:** bug "Invalid Date" na lista de certificados; agendar `retention-cron`; decidir o destino de `video-proxy`; histórico de disparos de e-mail/WhatsApp.
5. **Segurança:** honeypot/anti-abuse no checkout (paridade com o Getfy).

---

*Gerado por validação automatizada (Puppeteer + consultas somente-leitura). Pasta `Getfy/` e `Lixo/` usadas apenas como referência, sem alterações.*
