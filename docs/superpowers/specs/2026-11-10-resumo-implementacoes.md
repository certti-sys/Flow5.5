# Memória de Implementações — Projeto Flow5.5

**Data:** 2026-11-10  
**Projeto:** C:\Zapo API\Flow5.5  
**Produção Supabase:** flow5 (ref: pbrdmjcpipuatbnkvekz)

Este documento resume tudo o que foi implementado, o estado atual e o que ainda falta fazer. Serve de memória para futuras sessões.

---

## 1. Padronização dos Sidebars (Aluno e Admin)

**Status:** Concluído

O sidebar do admin foi unificado ao do aluno (referência de design).

### Alterações em `src/components/admin/AdminSidebar.tsx`
- **Fundo/borda:** de `bg-white/5 border-white/10` para `bg-sidebar/95 border-white/[0.1]`
- **Item ativo:** `bg-primary text-primary-foreground shadow-md` (igual ao aluno)
- **Item inativo:** `text-white/50 hover:text-white hover:bg-white/5`
- **Ícones:** sem cor própria (herdam do item); não trocam mais de cor no hover
- **Texto do item:** removido `text-white/50` fixo e `text-primary` no hover/ativo
- **Labels de grupo:** `text-[10px] font-bold uppercase tracking-widest text-white/40 px-3`
- **Logo:** imagem 32px `rounded-lg object-cover`, `font-bold text-base tracking-tight`
- **Rodapé/Sair:** `p-2`, hover `text-destructive hover:bg-destructive/10`
- **Link "Área do Aluno":** segue neutral do restante, sem mudança de cor no hover
- **Imports removidos:** `Settings` (não usado), `isActive` do componente base (conflitante)
- **Admin mantém:** seções Acadêmico, Comercial, Comunicação, Sistema, Aparência
- **Admin NÃO recebeu:** bloco de avatar/XP (específico do aluno)

**Verificação:** `tsc` sem erros, `vite build` ok.

---

## 2. Topo da Sidebar — Perfil + Gamificação Compacta

**Status:** Concluído

Aprovado pelo usuário: "Perfil + gamificação compacta (Recomendado)".

### Área do aluno (`src/components/ClientSidebar.tsx`)
- Card horizontal: avatar (44px) à esquerda, nome em destaque, email secundário, botão de recolher à direita
- Gamificação compacta dentro do card: `🏆 Nível 1 · 0/100 XP · 🔥 0d` + barra fina de XP
- Estado recolhido: só o avatar (40px) + botão circular de expandir na borda direita
- Novos ícones importados: `ChevronLeft`, `ChevronRight`
- `toggleSidebar` adicionado ao `useSidebar()` desestruturado

### Admin (`src/components/AdminSidebar.tsx`)
- Mesmo card de topo: avatar, nome, email (fallback "Administrador")
- Mesmo comportamento de recolher/expandir
- Sem gamificação (específica do aluno)
- Novos ícones importados: `ChevronLeft`, `ChevronRight`
- Query de perfil adicionada (`profiles.name, avatar_url`)

**Detalhes do card:** `rounded-2xl bg-white/5 border-white/[0.08]`, avatar com `ring-primary/20`

**Verificação:** `tsc` sem erros, `vite build` ok.

---

## 3. Correção da Persistência do Layout (`platform_settings`)

**Status:** Concluído (causa raiz corrigida, valor de produção ajustado pelo usuário via painel)

### Causa raiz
- Tabela `platform_settings` tinha 8 registros ativos
- Query usava `.maybeSingle()` → falha quando há mais de uma linha
- App caía no `defaultSettings` (`navigation_layout: 'horizontal'`)
- Layout aparecia por ~3s (cache localStorage) e "voltava sozinho"
- Com `settings` nulo, cada save inseria nova linha → duplicatas cresciam

### Correção no banco (produção)
- Migration `20261110000000_fix_platform_settings_singleton.sql` aplicada via `npx supabase db push --remote --yes`
- Mantido registro canônico `e49ef093-6acf-497e-ae26-91316772c4cd` (mais antigo, com banner/login)
- Duplicatas removidas
- Índice único parcial criado: `platform_settings_single_active_idx` (impede novas duplicatas)
- Verificado: 1 registro total, 1 ativo

### Correção no código (`src/hooks/usePlatformSettings.tsx`)
- Query agora: `.order('created_at', { ascending: true }).limit(1).maybeSingle()`
- Mesmo que recrie duplicatas, não falha mais
- `ClientLayout.tsx`: usa cache localStorage enquanto carrega, depois valor do servidor

**Verificação:** Build ok (`✓ built in 20.54s`), tsc sem erros nos arquivos alterados.

**Pendente:** Usuário deve salvar "Menu Lateral" no painel Aparência > Layout para gravar `navigation_layout = 'sidebar'` no registro canônico.

---

## 4. Correção do Ranking (PGRST202 — função `get_leaderboard_v2` ausente)

**Status:** Concluído

### Causa raiz
- `src/pages/Leaderboard.tsx:51` chama `supabase.rpc("get_leaderboard_v2", { period_type })`
- Nenhuma migration do projeto definia essa função
- Produção não tinha nenhuma função com "leaderboard" no nome
- PostgREST retornava `PGRST202: Could not find the function`

### Correções aplicadas

**Migration 1:** `supabase/migrations/20261110010000_create_get_leaderboard_v2.sql`
- Criou `public.get_leaderboard_v2(period_type text DEFAULT 'global')`
- `SECURITY DEFINER`, `search_path = ''` (RLS de `profiles` restringe leitura)
- Global: usa `user_stats.total_xp`
- Semanal/Mensal: deriva das aulas concluídas no período × 50 XP
- `NOTIFY pgrst, 'reload schema'`
- Revoke de `anon`, grant para `authenticated` e `service_role`

**Migration 2:** `supabase/migrations/20261110010001_backfill_user_stats_and_restrict_leaderboard.sql`
- Backfill idempotente: 50 XP por aula concluída, nunca reduz XP/nível existentes
- Cria `user_stats` só para quem tem aula concluída
- Resultado: Leandro = 300 XP, Nível 4 (6 aulas concluídas)
- Revogou EXECUTE de `anon` na função

**Verificação:**
- Função existe: `security_definer = true`
- Permissões: authenticated=true, anon=false, service_role=true
- Chamada REST retornou dados nos 3 períodos (global, weekly 150, monthly 300)

---

## 5. Padronização de Espaçamento Lateral das Páginas

**Status:** Concluído

Padrão definido: `container mx-auto p-4 sm:p-6` (mesmo do Admin Dashboard, destaque verde no print do usuário).

### Componente criado
- `src/components/layout/PageContainer.tsx` — wrapper único com `container mx-auto p-4 sm:p-6`

### Páginas do aluno (envelopadas por PageContainer)
- `src/pages/Lesson.tsx` — banner full-bleed preservado; container só no conteúdo
- `src/pages/Profile.tsx`
- `src/pages/Leaderboard.tsx` (erro e loading também envolvidos)
- `src/pages/Course.tsx` (banner + main content)
- `src/pages/CourseInfo.tsx` (removeu `max-w-6xl` interno)

### Páginas admin (removido apenas `max-w-7xl mx-auto` do wrapper raiz)
17 páginas: CertificatesDashboard, Comments, Coupons, Courses, Customers, EmailSettings, Gateways, MonitoringSettings, Notifications, OrderBumps, Orders, Products, SalesDashboard, Students, ThemeCustomization, WebhookHub, WhatsAppSettings

### AdminLayout (`src/components/admin/AdminLayout.tsx`)
- Ambos os wrappers (`container mx-auto p-4 sm:p-6` e `container mx-auto p-6`) substituídos por `PageContainer`

### Exceções mantidas (sem alteração)
- `src/pages/Dashboard.tsx` (carrossel do aluno — full-width)
- Login, Checkout, CertificateView, NotFound (contextos standalone/documento)
- Carrosséis, DesignSandbox, Placeholder, Dashboard admin (já estavam corretos)

**Verificação:** `tsc` sem erros nos arquivos alterados; `vite build` ok (`✓ built in 20.69s`); zero ocorrências de `max-w-7xl` nas páginas admin.

---

## 6. ContentHeader Transparente no Modo Sidebar

**Status:** Concluído

### Alterações em `src/components/ContentHeader.tsx`
- `isSidebarOpen = open` (usa booleano `open` do contexto, mais confiável que `state`)
- Header `bg-transparent! backdrop-blur-none! border-none` quando sidebar aberto
- Header `bg-background/95 backdrop-blur-md border-b border-white/[0.1]` quando sidebar recolhido
- Coluna 2 (Cursos/Perfil/Ranking/Admin) só renderizada quando sidebar **recolhido**
- Coluna 1 (toggle, logo, breadcrumbs) e Coluna 3 (busca, notificações, avatar) mantidas em ambos os estados
- Ícone do toggle: `PanelRight` (expandir) quando aberto, `PanelLeft` (recolher) quando fechado
- Importado `PanelRight` do lucide-react

**Verificação:** `tsc` sem erros; `vite build` ok (`✓ built in 23.28s`)

---

## 7. System Design Padrão na Página Ranking

**Status:** Concluído

### Alterações em `src/pages/Leaderboard.tsx`
- Header custom inline substituído por `AdminHeader` (padrão do system design)
- `title`: "Ranking Global / Semanal / Mensal"
- `description`: "Compare seu progresso e mantenha sua ofensiva alta..."
- `filters`: tabs Semanal/Mensal/Global (mesmo padrão das outras páginas)
- `showSearch={false}`
- Removidas classes de padding manuais duplicadas (`py-8 mt-6`)
- `space-y-8` adicionado ao `PageContainer`
- Importações adicionadas: `AdminHeader`, `PageContainer` (já existia)

**Verificação:** `tsc` sem erros; `vite build` ok (`✓ built in 21.80s`)

---

## 8. Arquivos de Documentação e Plano Criados

- `docs/superpowers/specs/2026-11-10-page-spacing-standard-design.md` — design doc do espaçamento
- `docs/superpowers/plans/2026-11-10-page-spacing-standard.md` — plano de implementação
- `docs/superpowers/plans/2026-11-10-content-header-sidebar-plan.md` — plano do ContentHeader
- `.superpowers/sdd/2026-11-10-page-spacing-standard/progress.md` — ledger de progresso

---

## 9. O que Ainda Falta Fazer

| Item | Status | Observações |
|------|--------|-------------|
| Gravar `navigation_layout = 'sidebar'` no banco via painel | Pendente | Usuário deve salvar "Menu Lateral" em Aparência > Layout. O banco ainda está com `horizontal` no registro canônico. |
| Verificação visual final (Ctrl+Shift+R) | Pendente | Comparar Admin Dashboard x Admin Cursos x Aula x Perfil x Ranking x Curso — gutter deve coincidir. Dashboard do aluno inalterado. |
| Refinamento: indicador lateral no item ativo | Opcional | Mencionado como refinamento natural (prints 2 e 3). Não foi solicitado formalmente. |
| Fallback de layout em caso de erro na query | Opcional | Sugestão: manter último layout válido do localStorage em vez de cair em `horizontal`. |

---

## 10. Como Executar Verificações

```powershell
# Type-check (filtrado por arquivo alterado, pois tsc sai com 1 por erros pré-existentes)
npx tsc -p tsconfig.app.json --noEmit 2>&1 | Select-String -Pattern "<nome-do-arquivo>"

# Build de produção
npx vite build

# Inspecionar produção (somente leitura)
npx supabase db query --remote --read-only "<sql>" --output json

# Listar migrações aplicadas
npx supabase db query --remote --read-only "select * from supabase_migrations.schema_migrations order by version" --output json
```

---

## 11. Notas Importantes

- **Não é repositório git:** não há commits, branches, worktrees nem `git commit`.
- **Shell PowerShell:** `&&` é inválido; usar `workdir` e comandos separados.
- **Produção:** projeto `flow5`, ref `pbrdmjcpipuatbnkvekz`, região `us-east-1`.
- **CLI autenticada e linked.**
- **Último build bem-sucedido:** `✓ built in 21.80s` (após todas as alterações acima).
