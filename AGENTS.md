# Flow5.5 — memória do projeto

Plataforma de cursos e checkout (EduStream / Flow Members). React + Vite no
front, Supabase (Postgres + Auth + Storage + Edge Functions) no back, deploy
para `https://v5.flowmembers.app`.

Este arquivo é o resumo operacional: o que existe, onde fica, como se verifica e
quais decisões já estão fechadas. Detalhe por fase em
`docs/plano-paridade-getfy.dm`; pendências em `docs/relatorio-pendencias-paridade.html`.

---

## 1. Stack e comandos

| Item | Valor |
|---|---|
| Front | React 18 + Vite 7 + TypeScript + Tailwind + shadcn/ui |
| Back | Supabase (ref `pbrdmjcpipuatbnkvekz`, projeto `flow5`, produção) |
| Roteamento | `react-router-dom`, rotas em `src/App.tsx` |
| Dados no front | `@tanstack/react-query` + `supabase` de `src/integrations/supabase/client.ts` |
| Gráficos | recharts |
| PDF | `pdfjs-dist` com worker (`pdf.worker.min.mjs?url`) |

```bash
npm run dev            # Vite (5173; se ocupado, cai pra 5174)
npm run build          # vite build — precisa passar antes de commitar
npm run typecheck      # tsc -p tsconfig.app.json --noEmit (é o que vale)
npm run lint

npm run check:theme    # presets de tema
npm run check:upsell   # upsell/downsell + métodos de pagamento
npm run check:cart     # recuperação de carrinho
npm run check:drip     # drip content
npm run check:pdf      # escada de zoom do leitor
npm run check:annotations # normalização das marcações do PDF

npx supabase db query --remote --read-only --file q.sql   # leitura em prod
npx supabase db push --remote --include-all --yes         # migration em prod
npx supabase functions deploy <nome> --no-verify-jwt --yes
```

> **Atenção:** `npx tsc --noEmit` na raiz não checa nada — o
> `tsconfig.json` tem `"files": []` e só referências, sai com código 0 sem ler
> um arquivo. Use `npm run typecheck`.

`--read-only` roda como `supabase_read_only_user`: sem EXECUTE em funções novas
e rejeita `SET`. Só devolve o **último** statement do arquivo — um statement por
arquivo, ou `json_agg`. Heredoc (`<<'EOF'`) não funciona no pwsh: criar `.sql`
primeiro.

---

## 2. Banco

76 migrations em `supabase/migrations/` (nomes por data, `2026MMDDhhmmss`).
29 edge functions em `supabase/functions/`.

Tabelas centrais:

| Domínio | Tabelas |
|---|---|
| Catálogo | `products`, `courses`, `modules`, `lessons`, `lesson_materials` |
| Vendas | `orders`, `order_items`, `payments`, `coupons`, `coupon_usage` |
| Aluno | `user_progress`, `user_course_access`, `user_course_categories`, `lesson_likes`, `lesson_pdf_annotations` |
| Gamificação | `achievements`, `user_achievements`, `xp_transactions`, `levels` |
| Funil | `cart_leads`, `cart_recovery_settings`, `email_logs`, `whatsapp_logs` |
| Integrações | `integrations`, `webhook_endpoints`, `webhook_deliveries`, `gateway_credentials` |
| Aparência | `theme_settings`, `platform_settings`, `carousels` |

Config de checkout mora em `products.checkout_config` (JSONB): aparência,
blocos de conteúdo, gateways por método, `payment_methods`, resumo, timer,
`thank_you`, `upsell`/`downsell`, `redirect_after_purchase`, SEO.

Cron (`cron.job`, 8 jobs): `cart-recovery` (*/5), `dispatch-webhooks`,
`dispatch-notifications`, `dispatch-integrations`, `dispatch-campaigns` (todos
1 min), `purge-cart-leads` (03:15), `purge-system-logs` (03:25),
`retention-cron` (21:00 UTC).

### Funções de segurança

- `has_role(user_id, role)` — toda policy de admin usa esta; nunca `user_roles` direto no front.
- `get_order_public(order_id)` — RPC pública (`SECURITY DEFINER`) que devolve o pedido para as páginas pós-compra sem login. Rota pública só existe por causa dela.
- `get_course_release_map(user)` / `get_course_release_map_for(user, course)` — agenda do drip; a variante `_for` recebe o user explícito e só a service role executa (edge usa service role, `auth.uid()` seria null).
- `claim_order_upsell(order_id)` — marca `metadata.upsell_shown` e devolve `true` uma vez por pedido pago.
- `build_order_webhook_payload`, `enqueue_webhook_deliveries`, `enqueue_refund_deliveries` — emissão de webhook nunca desfaz pagamento: tudo dentro de `exception when others → raise warning`.

RLS: nenhuma tabela com policy "Authenticated all access" genérica depois da
`20261119130000_rls_lockdown.sql`. Leitura de perfil público por view
(`20261119131000`).

---

## 3. Edge functions

Chamadas do front precisam de `X-Requested-With: XMLHttpRequest` (CSRF, o client
já manda em todas). Origem fora de `_shared/cors.ts` → 403.

| Edge | Papel |
|---|---|
| `payment-ops` | Cria cobrança (todos os gateways), consulta status, reembolso, `parentOrderId` do upsell |
| `*-webhook` (8) | Recebem PSP; **nunca** confiam no corpo — reconsultam o gateway |
| `validate-coupon` | Cupom no checkout (público) |
| `create-user`, `delete-user`, `reset-user-password` | Admin; reset tem rate limit **por admin** (20/15 min) |
| `lesson-file-url` | Valida acesso + drip e assina PDF do bucket privado por 10 min |
| `lesson-progress` | Marca aula concluída com guarda dura de drip no servidor |
| `cart-recovery` | Funil de abandono (e-mail, WhatsApp, SMS via IntegraX) |
| `send-email`, `send-whatsapp`, `send-campaign`, `campaign-track` | Mensageria |
| `dispatch-*`, `retention-cron`, `check-achievements`, `check-course-access`, `sys-health` | Jobs |

`payment-ops` é a **única** implementação de cobrança. Qualquer fluxo novo
(upsell, bump, recompra) reusa ela em vez de falar com gateway.

---

## 4. Decisões fechadas

Não reabrir sem motivo novo:

1. **Presets de tema** — 18 presets em `src/types/theme-presets.ts`, catálogo em
   `Admin → Personalização → Presets`; gravados em `theme_settings.preset` via
   `save_active_theme(...)`. Preset vence cor manual. Checkout público é
   isolado do preset global por `body.checkout-scope` (`src/index.css`).
2. **Checkout é config manual por produto.** Nada de preset global vazando.
3. **Upsell/downsell** em `products.checkout_config.upsell`, sem tabela nova.
   `normalizeUpsell` desliga `upsell.enabled` sem oferta válida e
   `downsell.enabled` sem produto.
4. **Páginas pós-compra são texto puro** (headline/subtitle/body/image/video),
   nunca HTML — evita XSS. Interpolação `{nome}`/`{produto}` em
   `src/lib/post-purchase.ts`.
5. **Order bumps**: 1 pedido + N `order_items` (`kind = 'order_bump'`), nunca
   pedido separado.
6. **Aceitar upsell** = checkout normal com `?parent=<pedido>`;
   `payment-ops` valida que o pai está pago e grava
   `metadata.parent_order_id` + `metadata.kind`. Atribuição, não permissão.
7. **Métodos de pagamento** por produto em `payment_methods: {card,pix,boleto}`,
   todos `true` por padrão; `normalizeCheckoutConfig` garante ≥1 ativo; a edge
   recusa método desligado mesmo via API.
8. **Drip**: âncora = `user_course_access.granted_at` (fallback
   `user_course_categories.created_at`); sem âncora **não bloqueia**; aula
   travada = `max(aula, módulo)`; admin nunca bloqueia; `is_public` não isenta;
   fuso fixo `America/Sao_Paulo` (`ponytail:` marcado no SQL). Cálculo só em SQL.
9. **PDF**: bucket privado `lesson-files`, `content` guarda o caminho (não URL),
   `file_meta {size,name}`, URL assinada de 10 min por `lesson-file-url`. Upload
   com nome aleatório. Save de materiais apaga do bucket o que deixou de ser
   referenciado.
10. **Marcações no PDF**: 1 linha por (aluno, material), `payload` JSONB com
    todos os highlights, coordenadas normalizadas 0..1 sobre a página, cores
    `yellow|green|pink`, teto 500, autosave 450 ms, duplo clique apaga, privado
    do aluno (admin não lê).
11. **Progresso do leitor**: só "chegou na última página" → conclui. Sem
    progresso parcial, sem retomar página, sem persistir zoom.
12. **Reset de senha**: rate limit por admin (não por IP — `x-forwarded-for`
    muda atrás do balanceador). Aluno sem conta em `auth.users` → 404 explícito.
13. **Vídeo**: sempre embed. Sem MP4 direto nem upload de arquivo.
14. **Webhook/trigger de saída nunca desfaz pagamento ou acesso.**
15. **Carrinho abandonado**: textos e intervalos globais em
    `cart_recovery_settings`; SMS por IntegraX, desligado por padrão.
16. **Conquistas por faturamento**: não implementar (decisão do usuário).
17. **Multi-tenant, CAPTCHA/Turnstile**: fora de escopo.
18. **Fases 14 e 15** do plano e **desconto PIX** ficam para a segunda fase.
19. **Preset nunca declara `--destructive-foreground` nem
    `--sidebar-primary-foreground`** — os dois são derivados do fundo em
    `buildPresetVariables` com `readableForeground`. 17 dos 18 presets não
    declaravam e caíam no branco do `:root`: 10 reprovavam AA no botão
    destrutivo e 14 na sidebar. Foreground declarado à mão volta a divergir
    quando a cor muda.
20. **Preset só aplica o mapa `dark`.** O mapa `light` de cada preset existe no
    tipo mas não é lido (`buildPresetVariables` usa `preset.dark`); o único
    tema claro do produto é o do checkout, em `body[data-checkout-theme="light"]`.
    Não reintroduzir `darkMode: ["class"]` — não existe bloco `.dark`.
21. **Design system é dívida, não pendência.** Codemod de `white/black`
    (3.285), cores cruas (1.169) e `text-[Npx]` (1.089) é reescrita visual sem
    ganho funcional e com risco no checkout, que está fechado. Só fazer se
    houver redesign. Os bugs funcionais e de acessibilidade da auditoria foram
    corrigidos; o que sobrou está em
    `docs/relatorio-pendencias-paridade.html` §13 e §14.
22. **Contraste é validado em todos os pares, não só no CTA.**
    `check-theme-presets.mjs` percorre 11 pares fg/bg por preset (198 no total)
    e exige AA ≥ 4.5. `readableForeground` deriva o texto e, em fundos de faixa
    média onde branco e preto dão ~4.2, varre a luminância até passar. Preset
    que declara foreground que reprova é substituído; o que passa é mantido.
23. **Nada de dado sensível no console do checkout.** Payment-ops, token de
    cartão, CVV e CPF nunca são logados — só `console.error` para falha real.
    O QR PIX é gerado localmente (`qrcode`) quando o gateway não devolve
    base64; o `copy_paste` nunca vai para serviço de terceiro.

---

## 5. Verificação

Nunca validar por imagem. Sempre por DOM/toast/console/rede.

Puppeteer: `puppeteer-core@25.17.0` **não** está no `package.json` (instalado
com `--no-save`, some no próximo `npm install`); Chrome em
`C:/Program Files/Google/Chrome/Application/chrome.exe`;
`import puppeteer from 'puppeteer-core'`.

Login de teste no banco: `POST /auth/v1/admin/generate_link`
(`type: 'magiclink'`) → `POST /auth/v1/verify` com `{type:'magiclink',
token_hash}`. **GET** em `/auth/v1/verify` cai no SPA e devolve HTML.

Auth do front fica em **cookie** `sb-<ref>-auth-token` (`CookieStorage` em
`src/integrations/supabase/client.ts`), não localStorage.

Contas: `leandroaz@gmail.com` (admin, senha `bidu57lex`),
`leandroalzevedo@gmail.com` (aluno), `cert.ti@gmail.com`.

Curso de teste `Design UI/UX Avançado` = `550e8400-e29b-41d4-a716-446655440003`;
aula liberada `5f0d23a2-6c8c-443b-83dc-d182b32bb59b`; aula travável
`07dc60e5-95e2-42e0-8006-660c4a05a33e`. Rotas: aula `/aula/:lessonId`, curso
`/curso/:courseId`, admin `/admin/cursos`.

---

## 6. Higiene do repositório

- Scripts locais (`tmp-*`, probes, PNGs, logs) **nunca** commitados — já estão
  no `.gitignore` (`tmp-*`, `audit-*.mjs`, `verify-*.mjs`, `*-out.txt`).
- `Getfy/` e `Lixo/` são só referência (gitignored).
- Mudança de banco em produção exige confirmação explícita do usuário antes
  (`db push` sem `--yes` falha de propósito quando roda em modo agente).
- Documentação entregue como HTML standalone em `docs/` quando for relatório.
