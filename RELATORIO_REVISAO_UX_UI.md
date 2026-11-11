# Relatório de Revisão de UX/UI — EduStream (Flow5.5)

**Projeto:** Flow5.5 — Plataforma EAD EduStream
**Escopo:** Revisão completa de UX/UI (páginas públicas, área do aluno, painel admin e checkout)
**Data:** 10/11/2026
**Método:** Auditoria automatizada em navegador (Puppeteer + Chrome, usuários de teste `aluno-teste@edustream.app` e `admin-teste@edustream.app`), análise de código contra as *Web Interface Guidelines* (Vercel), verificação de banco (Supabase) e testes em viewport mobile 375px.
**Ambiente:** Dev server `http://localhost:5173`, 26 rotas testadas (login, 3 do aluno, 22 do admin).

---

## 1. Resumo Executivo

| Métrica | Valor |
|---|---|
| Rotas auditadas (desktop 1440px) | 26 |
| Rotas auditadas (mobile 375px) | 8 |
| Problemas encontrados | 27 |
| — P0 Críticos (funcionalidade quebrada em silêncio) | 4 |
| — P1 Maiores (UX/a11y com impacto real) | 9 |
| — P2 Menores (polimento) | 14 |
| Fluxos com toast de sucesso/erro | ~40 arquivos |
| Fluxos com confirmação antes de excluir | 17 arquivos |
| Fluxos destrutivos SEM confirmação | 8 |
| Páginas sem tratamento de erro de carregamento | 15 |

**Veredito geral:** A queixa registrada — *"não existem notificações de erro, alerta, confirmações de ações, de nada nesse sistema"* — é **parcialmente confirmada e agora tem causa raiz documentada**. As **mutações** (criar/editar/apagar) têm boa cobertura de toasts (~40 arquivos) e 17 fluxos já usam `AlertDialog`/`ConfirmDeleteDialog`. O problema real está em três frentes:

1. **Falhas de carregamento são 100% silenciosas** — 15 páginas não possuem estado de erro; quando uma query falha, o usuário vê zeros, listas vazias ou um estado "Nenhum item encontrado" enganoso. **Três queries estão falhando de verdade agora** (uma delas aponta para uma tabela que nunca existiu no banco).
2. **8 ações destrutivas apagam sem confirmação** (cupom, categoria, mapeamentos de webhook etc.) e nenhum fluxo oferece "desfazer".
3. **Erros de configuração explodem no console sem nunca chegar ao usuário** — o CSP bloqueia o Stripe em *todas* as páginas e o `X-Frame-Options` em `<meta>` é inválido.

---

## 2. Achados Críticos (P0)

### P0-1. Módulo de Certificados consulta tabela que não existe no banco
A tabela `certificates` **não existe** no banco (verificado em `information_schema`; nenhuma das 21 migrations a cria). Toda a UI do módulo foi construída sobre ela:

- `src/pages/Profile.tsx:73` — perfil do aluno (404 em produção)
- `src/pages/admin/CertificatesDashboard.tsx:106` — painel admin (404)
- `src/components/LessonSidebar.tsx:37,49` — sidebar da aula
- `src/pages/Course.tsx:96,109` — página do curso
- `src/pages/CertificateView.tsx:352` — visualização do certificado

**Sintoma para o usuário:** nada. A página mostra "Nenhum Certificado Encontrado" como se o aluno não tivesse certificados — quando na verdade a query quebrou. É o exemplo perfeito da percepção "o sistema não me avisa de nada".
**Correção:** criar a migration da tabela `certificates` (com RLS) ou desabilitar o módulo até existir.

### P0-2. Falhas de carregamento silenciosas em 15 páginas (núcleo da queixa)
Páginas **sem estado de erro** — query falha = tela "normal" com dados vazios:

- Admin: `CertificatesDashboard`, `Comments`, `Dashboard`, `EmailSettings`, `Gateways`, `Notifications`, `SalesDashboard`, `WebhookHub`, `WhatsAppSettings`, `ThemeCustomization`
- Aluno: `Dashboard`, `CourseInfo`, `Profile`, `CertificateView`, `ThankYou`

Caso em produção hoje: `src/pages/admin/SalesDashboard.tsx:165` — `const { data } = await supabase.from("payments")...` **ignora o `error`** (não desestrutura). A query de vendas retorna 400 do PostgREST e o Dashboard de Vendas mostra "Total de Vendas: 0" sem qualquer aviso.

**Correção:** padronizar tratamento `error` em todas as queries (react-query já expõe `error` — falta renderizar) + toast/estado de erro visual. Ver detalhes no Roadmap.

### P0-3. CSP bloqueia o Stripe em todas as páginas
- `index.html:12` — `script-src` do CSP **não inclui `https://js.stripe.com`** (inclui Mercado Pago).
- `@stripe/stripe-js` **v9.4.0** injeta o script na importação do módulo (o pacote tem build `pure` exatamente para evitar isso).
- `src/App.tsx` importa todas as páginas **estaticamente** (sem `React.lazy`), então `Checkout → StripeCardElement → @stripe/stripe-js` entra no bundle de *toda* rota.

**Resultado medido:** erro de console `Loading the script 'https://js.stripe.com/dahlia/stripe.js' violates the following Content Security Policy...` em **100% das 26 páginas testadas**. Se um gateway Stripe for ativado, **o checkout quebra** — e o usuário não veria nada além de um spinner.

**Correção:** adicionar `https://js.stripe.com` ao `script-src` do CSP **e** importar `@stripe/stripe-js/pure` (ou carregar o SDK só no checkout).

### P0-4. `X-Frame-Options` dentro de `<meta>` (inválido)
- `index.html:16` — `<meta http-equiv="X-Frame-Options" content="SAMEORIGIN">` gera erro de console em toda navegação. Esse header só funciona via resposta HTTP.
**Correção:** remover do `index.html`; configurar no host (Vercel/nginx) ou usar `frame-ancestors 'self'` no CSP.

---

## 3. Achados Maiores (P1)

### P1-1. Ações destrutivas sem confirmação (parte da queixa)
Fluxos que apagam com um clique, sem `AlertDialog`:

| Local | Ação |
|---|---|
| `src/pages/admin/Coupons.tsx:220` | Excluir cupom (botão lixeira chama `handleDelete` direto) |
| `src/components/admin/CategoryManagerModal.tsx:109` | Excluir categoria de curso |
| `src/components/admin/webhook/StatusMappingsEditor.tsx` (remover mapeamento) | Excluir mapeamento de status |
| `src/components/admin/webhook/FieldMappingEditor.tsx` (remover) | Excluir mapeamento de campo |
| `src/components/admin/webhook/PlatformConfigModal.tsx:108` | Excluir plataforma |
| `src/components/admin/webhook/ConfigureMappingsWizard.tsx` | Exclusões no wizard |
| `src/components/admin/webhook/DataHealthPanel.tsx` | Conceder/revogar acesso (irreversível em lote) |
| `src/components/admin/AssignCoursesModal.tsx` | Desatribuição de cursos em massa |

Para comparação, **já existem bons exemplos** no projeto: `Courses`, `Orders`, `Products`, `Customers`, `Carousels`, `OrderBumps`, `Lesson` e `ConfirmDeleteDialog.tsx` (componente reutilizável pronto). Basta aplicar o mesmo padrão nos fluxos acima. Nenhum fluxo oferece **desfazer** (undo) — recomendação das Web Interface Guidelines para ações destrutivas.

### P1-2. Botões de ícone sem nome acessível (WCAG 4.1.2)
Leitor de tela anuncia "botão" sem dizer o que faz. Medido no navegador: **11 botões** só na página `/admin/cursos`.

- `src/pages/admin/Courses.tsx:362-382` — Editar (`Edit`), Excluir (`Trash2`), Expandir (`ChevronDown`) por curso + ações de módulo/aula em `CourseModuleAccordion`
- `src/pages/admin/Coupons.tsx:217,220` — editar/excluir cupom
- `src/pages/admin/Students.tsx:139` — ação por aluno
- `src/pages/admin/Notifications.tsx:323` — excluir notificação

**Correção:** adicionar `aria-label` (ou `title` como já feito em `Comments.tsx:346-353`).

### P1-3. Contraste do estado ativo da navegação (WCAG AA falha)
Medido no navegador: fundo do corpo `rgb(23,23,28)`; item ativo usa `bg-primary` (dourado `rgb(184,150,71)`) com texto branco = **2,80:1** (mínimo AA: 4,5:1).

- `src/components/ClientSidebar.tsx:213` — item ativo da sidebar do aluno
- `src/pages/admin/Courses.tsx:270,284` — abas de filtro ativas ("Todos", categorias)

**Correção:** escurecer o dourado do estado ativo ou usar texto escuro sobre dourado.

### P1-4. Tipografia abaixo do mínimo legível
- **31 ocorrências** de `text-[10px]`/`text-[11px]` + `text-[9px]` em badges (`Courses.tsx:329`).
- Pior caso combinado: `ClientSidebar.tsx:164` — e-mail do usuário em **10px** com `text-white/40` (pequeno **e** de baixo contraste).

Guideline: nunca abaixo de 12px para texto informativo.

### P1-5. Sem `prefers-reduced-motion`
`src/index.css` não declara `@media (prefers-reduced-motion: reduce)` — o app usa animações contínuas (`animate-ping`, `animate-glow`, `animate-fade-in-up`, transições longas). Usuários com sensibilidade a movimento não têm como desligar.
**Correção:** bloco global reduzindo `animation-duration`/`transition-duration` para ~0,01ms.

### P1-6. Zero code-splitting — bundle monolítico
`src/App.tsx:12-40` (e seguintes) importa ~30 páginas estaticamente. Primeira visita carrega o grafo inteiro (inclui SDKs de pagamento). Com `React.lazy` + `Suspense` por rota, o inicial cai drasticamente e o P0-3 do Stripe se torna irrelevante fora do checkout.

### P1-7. Duas bibliotecas de toast montadas
`src/App.tsx:67` monta o `Toaster` legado (shadcn/use-toast) **e** o Sonner. Todo o app usa `sonner` diretamente; o legado é peso morto e inconsistência potencial. Remover.

### P1-8. Toasts visualmente idênticos para sucesso e erro
`src/components/ui/sonner.tsx:13-21` — classNames únicos para todos os tipos (sem `richColors`/ícones por severidade). Erro e sucesso parecem iguais à distância. **Correção:** habilitar `richColors` ou ícones (✕/✓) por tipo.

### P1-9. Erros tratados apenas com `console.*`
- `src/components/ImageCropper.tsx:66` — processamento de imagem falha em silêncio
- `src/pages/admin/SalesDashboard.tsx:143,165` — `data` sem `error`
- Padrão recorrente: `console.error` em vez de feedback ao usuário

---

## 4. Achados Menores (P2)

| # | Achado | Local |
|---|---|---|
| P2-1 | Imagens sem `width`/`height` (risco de CLS) — 7/7 no dashboard, 3/3 em cursos | geral |
| P2-2 | Overlay de clique em `div` sem handler de teclado | `src/components/YouTubePlayer.tsx:295` |
| P2-3 | Dois `h1` na mesma página | `src/pages/Dashboard.tsx` (hero + "Meu Dashboard") |
| P2-4 | Hero lido como "Inspire-se,Aprenda,Cresça." (spans block sem espaço; leitor de tela lê colado) | `src/components/HeroBanner.tsx:50-54` |
| P2-5 | Gradiente do hero termina em `white/60` (contraste limítrofe no fim do degradê) | `src/components/HeroBanner.tsx:53` |
| P2-6 | Badge do hero em 10px | `src/components/HeroBanner.tsx:41` |
| P2-7 | `AvatarImage` sem `alt` | `EditProfileModal.tsx:291`, `Navbar.tsx:230`, `RecentStudents.tsx:55` |
| P2-8 | Alvos de toque < 40px (paginação do ranking com 28px de altura; elementos de 8px; links de 20px) | `Leaderboard`, `Dashboard` |
| P2-9 | `autoFocus` em campo de busca | `src/components/SearchBar.tsx:61` (aceitável se for modal; validar) |
| P2-10 | Mensagens de validação inline sem `aria-live` (leitor de tela não anuncia) | formulários em geral |
| P2-11 | Typo em dado seed: curso "Cirando Bots" | banco (seed) |
| P2-12 | Sem estilo `::selection` customizado (opcional, polish) | `src/index.css` |
| P2-13 | `email_settings` com múltiplas linhas ativas dispara 406/PGRST116 todo load (tratado no código, mas indica dado duplicado) | `src/hooks/useEmailSettings.ts:48-52` |
| P2-14 | `checkout` acessível via menu admin aponta página quase vazia (465 chars de texto) | `/admin/checkout` |

---

## 5. O que está funcionando bem (validado em teste real)

- ✅ **Toast de erro no login funciona** — senha errada exibe "Email ou senha incorretos" (Sonner, `z-index 999999999`, fixed). Login com sucesso também notifica.
- ✅ ~40 arquivos com `toast.success`/`toast.error` em mutações (CRUD de cursos, aulas, cupons, clientes, pedidos, gateways, tema, perfil…).
- ✅ 17 fluxos já usam `AlertDialog`/`ConfirmDeleteDialog` antes de excluir (Cursos, Pedidos, Produtos, Clientes, Carrosséis, Order Bumps, Comentários, Lesson…).
- ✅ Login com validação Zod inline, mostrar/ocultar senha e diálogo de recuperação de senha.
- ✅ Todos os inputs testados têm `<label>` (0 sem label em 26 páginas).
- ✅ Sem overflow horizontal em mobile 375px (todas as 8 rotas testadas); admin tem sidebar em Sheet com botão de menu acessível.
- ✅ `viewport` sem `maximum-scale` (zoom não bloqueado).
- ✅ `focus-visible` presente (16 regras CSS); `outline-none` sempre acompanhado de `ring`.
- ✅ `loading="lazy"` nas imagens do dashboard; quase zero `transition-all` (2 usos pontuais).
- ✅ `prefers-reduced-motion` existe dentro do sonner (não no app).

---

## 6. Roadmap de Correções

### Entrada principal — Notificações, alertas e confirmações (queixa do usuário)

> **Problema:** o sistema não comunica falhas (queries quebradas mostram estados vazios enganosos), 8 ações destrutivas apagam sem confirmação, erros de infraestrutura ficam só no console e toasts não diferenciam severidade.

**Fase 1 — Quick wins (1–2 dias)**
1. `index.html`: adicionar `https://js.stripe.com` ao CSP; remover `<meta http-equiv="X-Frame-Options">`.
2. Adicionar `aria-label` nos botões de ícone (P1-2).
3. Aplicar `ConfirmDeleteDialog` em Coupons e CategoryManagerModal (P1-1, casos de maior risco).
4. Remover `Toaster` legado do `App.tsx`; habilitar `richColors` no Sonner (P1-7/P1-8).

**Fase 2 — Sistema de feedback (3–5 dias) — prioridade máxima**
1. Criar migration da tabela `certificates` (ou ocultar o módulo) → elimina 404s silenciosos (P0-1).
2. Corrigir a query de `payments` em `SalesDashboard.tsx:165` (embed/FK inválida) e desestruturar `error` (P0-2).
3. Padronizar estados de erro: componente `<ErrorState>` (ícone + mensagem + botão "Tentar novamente") para usar com o `error` do react-query em **todas** as 15 páginas mudas (P0-2).
4. Interceptor global: qualquer erro Supabase inesperado → `toast.error` com mensagem amigável (cobre o resto dos fluxos).
5. Confirmar as 8 ações destrutivas restantes (P1-1) e avaliar "desfazer" nas exclusões recentes.

**Fase 3 — Acessibilidade e polimento (1 semana)**
1. Corrigir contraste do estado ativo (dourado mais escuro / texto escuro) (P1-3).
2. Elevar fontes mínimas para ≥12px (P1-4).
3. `prefers-reduced-motion` global (P1-5).
4. `alt` nos avatares, alvos de toque ≥44px, `aria-live` nas validações (P2-7/8/10).

**Fase 4 — Performance (1 semana)**
1. `React.lazy` por rota (P1-6) + `@stripe/stripe-js/pure`.
2. `width`/`height` nas imagens (CLS).
3. Auditar duplicatas em `email_settings` (P2-13).

### Status de implementação

**Fase 1 — CONCLUÍDA** ✅ (verificada com teste automatizado E2E: login real, cliques, toasts e leitura de DOM)

1. ✅ **CSP unificado nos três pontos de definição** (P0-3 ampliado): `index.html` (meta), `vite.config.ts` (header do dev server) e `vercel.json` (header de produção). *Causa raiz descoberta na correção:* o dev server enviava um **header** CSP antigo e o browser aplica a interseção header+meta — editar só o meta não bastava. Adicionados `https://js.stripe.com` (script/frame), `https://api.stripe.com` e `https://*.stripe.com` (connect), além de hosts do MercadoPago que faltavam no meta. O `vercel.json` também bloqueava `sdk.mercadopago.com` (script) e imagens Bunny/`mediadelivery` (img) **em produção** — corrigido.
2. ✅ **P0-4:** `<meta http-equiv="X-Frame-Options">` removido (é ignorado pelo browser). Proteção de framing real garantida via headers HTTP: `X-Frame-Options: SAMEORIGIN` + `frame-ancestors 'self'` adicionado ao CSP de dev e produção. `frame-ancestors` saiu do meta (ignorado por spec; gerava warning no console).
3. ✅ **P1-2:** `aria-label` em todos os botões de ícone das áreas testadas (cursos/módulos/aulas/cupons/alunos/notificações, sino, lupa, limpar busca, mostrar/ocultar senha). Botões sem nome acessível: **0** (antes: 2 por página admin + 1 no login).
4. ✅ **P1-1 (maior risco):** `ConfirmDeleteDialog` em Cupons e Categorias. Teste E2E: diálogo abre → **cancelar** não dispara toast nem exclui → **confirmar** dispara toast de sucesso e remove o registro.
5. ✅ **P1-7/P1-8:** `Toaster` legado removido do `App.tsx`; `useWhatsAppSettings` migrado para sonner (12 toasts); `richColors` + `closeButton` ativados — toast de erro agora tem `data-type="error"` e fundo vermelho.
6. ✅ Verificação final: **0 violações de CSP** (antes: `js.stripe.com` bloqueado em 100% das páginas), console com 1 erro de recurso em toda a sessão, `tsc --noEmit` sem erros.

**Fase 2 — CONCLUÍDA** ✅ (verificada com E2E que **força falhas de rede** para provar que o erro aparece — antes a falha era silenciosa)

1. ✅ **P0-1:** migration `20261110225000_create_certificates.sql` cria a tabela `certificates` com o schema exato que o front esperava (`user_id → profiles` — FK que habilita os embeds; `unique(user_id, course_id)` para o anti-duplicação de `Course.tsx`/`LessonSidebar.tsx`). RLS: aluno lê/emite só os próprios; admin gerencia tudo. Aplicada no banco remoto (antes: 404 silencioso em 5 telas).
2. ✅ **P0-2 (query quebrada):** `SalesDashboard` — o embed `profiles!user_id` era **inválido** (`orders.user_id` referencia `auth.users`, não `profiles`), causando 400 do PostgREST e "Total de Vendas: 0" sem aviso. Agora usa `customer_name`/`customer_email` desnormalizados do pedido, e as **5 queries** da página tratam `error`.
3. ✅ **P0-2 (estado visual) + P1-9:** componente `ErrorState` (ícone + título + botão "Tentar novamente", `role="alert"`) aplicado nas páginas do relatório: `CertificatesDashboard`, `Comments`, `Dashboard` (admin e aluno), `EmailSettings`, `Gateways`, `Notifications`, `SalesDashboard`, `WebhookHub`, `WhatsAppSettings`, `Profile`, `CourseInfo`, `CertificateView`, `ThankYou`. `ThemeCustomization` não faz query de rede (usa `localStorage`), então não tem falha a tratar. Hooks `useNotifications`/`useWhatsAppSettings` passaram a expor `isError`/`refetch`.
4. ✅ **Interceptor global:** `QueryCache.onError` no `QueryClient` (`App.tsx`) → `toast.error("Não foi possível carregar alguns dados", { description })` para qualquer query que falhe, com filtro do `PGRST116` (estado vazio legítimo). *Teste:* bloqueando `/rest/v1/payments`, o toast de erro aparece **e** o `ErrorState` renderiza com o botão de retry.
5. ✅ **Confirmações destrutivas (P1-1 completo):** `ConfirmDeleteDialog` adicionado em `FieldMappingEditor` (mapeamento de campo), `StatusMappingsEditor` (mapeamento de status), `PlatformConfigModal` (excluir plataforma), `DataHealthPanel` (revogar acesso), `AssignCoursesModal` e `ConfigureMappingsWizard` (sobrescrever atribuições/mapeamentos — substituição em massa). E2E validado: abre → cancelar não exclui nada → lista permanece intacta.
6. ✅ **Bug de CSP descoberto no teste:** workers `blob:` eram bloqueados (`worker-src` não definido caía em `script-src`). Adicionado `worker-src 'self' blob:` nos três pontos de CSP.
7. ✅ **Bug funcional descoberto:** `WebhookHub` habilitava a query de mapeamentos com `activeTab === 'mappings'`, mas os mapeamentos vivem dentro da aba `advanced` — a lista **nunca** carregava. Corrigido para `'advanced'` (verificado: 2 mapeamentos passaram a aparecer).
8. ✅ Verificação final: **0 violações de CSP**, 0 erros relevantes de console, 0 falsos positivos de `ErrorState` em 10 rotas com dados reais, `tsc --noEmit` sem erros.

---

## 7. Apêndice — Evidências dos testes automatizados

- **Usuários de teste:** `aluno-teste@edustream.app` (aluno) e `admin-teste@edustream.app` (admin), confirmados no Supabase.
- **TESTE login com senha errada:** toast exibido ("Email ou senha incorretos"), URL permanece em `/login`. ✔
- **Erros HTTP capturados em produção do ambiente dev:**
  - `404 /rest/v1/certificates` (6x) — tabela inexistente (P0-1)
  - `400 /rest/v1/payments?select=...order:orders(...)` — query inválida (P0-2)
  - `406 /rest/v1/email_settings` — PGRST116, tratado no código (P2-13)
  - `400 /auth/v1/token` — teste de senha errada (esperado)
- **Console:** `X-Frame-Options` em meta + CSP bloqueando `js.stripe.com/dahlia/stripe.js` repetindo em todas as 26 rotas.
- **CSS:** 16 regras `:focus-visible`, 1 `prefers-reduced-motion` (biblioteca), 2 `transition-all`.
- **Contraste real medido:** fundo `rgb(23,23,28)`; únicos elementos abaixo de 4,5:1 legítimos = estados ativos dourados (2,80:1) e cauda do gradiente do hero.
- **Mobile 375px:** 0px de overflow horizontal em todas as rotas testadas; sidebar admin via Sheet com botão acessível (`ContentHeader.tsx:142`).
