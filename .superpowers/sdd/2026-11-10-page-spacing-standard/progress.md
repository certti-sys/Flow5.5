# SDD ledger — plan: docs/superpowers/plans/2026-11-10-page-spacing-standard.md

Nota de setup: o diretório não é um repositório git, então não há worktree,
commits nem os scripts `task-start`/`task-done` baseados em git. O plano é
executado inline com verificação por `tsc` + `vite build` + inspeção visual.

Ruling: sem testes automatizados de layout (o projeto não possui suíte de
testes de UI); a verificação de cada tarefa é type-check, build e comparação
visual — custo se errado: regressão visual não detectada até a inspeção manual.

## Progresso

Task 1: complete — PageContainer criado e AdminLayout migrado; tsc sem erros nos arquivos.
Task 2: complete — Lesson, Profile, Leaderboard, Course e CourseInfo usando PageContainer; tsc sem erros nesses arquivos.
  Ruling: Leaderboard loading/erro também foram envolvidos no PageContainer (o plano dizia só remover max-w) — evita desalinhamento entre estados — custo se errado: nenhum visual relevante.
  Ruling: Course preserva o banner full-bleed e aplica PageContainer apenas ao conteúdo interno — mantém o design do hero — custo se errado: banner deixa de ser edge-to-edge.
Task 3: complete — 17 páginas admin sem max-w-7xl; verificado que não restou ocorrência.
Task 4: complete — vite build: ✓ built in 20.69s; Dashboard do aluno sem alterações.

## Final review

Final review: self-review (no subagent tool — free model limit reached).

Achados: nenhum Critical/Importante/Minor.
- Sem container/padding duplicado.
- JSX aninhado corretamente em todos os arquivos editados.
- Zero `max-w-7xl` restante nas páginas admin.
- Exceções (Dashboard aluno, Login, Checkout, CertificateView, NotFound) intactas.
- Banner full-bleed do Course preservado.
- `cn("container mx-auto p-4 sm:p-6", className)` resolve corretamente.

Evidence: tsc filtrado por arquivo alterado = sem erros; vite build = ✓ built in 20.69s; grep confirma exceções e ausência de max-w-7xl admin.

---

## Tarefa adicional: ContentHeader transparente + remoção de itens centrais no modo sidebar

Conforme plano em `docs/superpowers/plans/2026-11-10-content-header-sidebar-plan.md`.

**Alteração em `src/components/ContentHeader.tsx`:**
- Adicionado `isSidebarOpen = open` (usando `open` do contexto em vez de `state`, mais confiável).
- `<header>` fica `bg-transparent! backdrop-blur-none! border-none` quando o sidebar está aberto, e `bg-background/95 backdrop-blur-md border-b border-white/[0.1]` quando recolhido.
- Coluna 2 (itens centrais Cursos/Perfil/Ranking/Admin) só é renderizada quando o sidebar está **recolhido**; desaparece quando aberto (não duplica o sidebar).
- Coluna 1 (toggle, logo, breadcrumbs) e Coluna 3 (busca, notificações, avatar) permanecem em ambos os estados.
- Ícone do toggle muda entre PanelRight (expandir) e PanelLeft (recolher) conforme o estado.
- Importado `PanelRight` do lucide-react.

**Rollback:** reverter `src/components/ContentHeader.tsx` à versão anterior (fundo visível + coluna central sempre visível). Não há alterações de banco, rotas ou outros componentes.

**Verificação:**
- `tsc -p tsconfig.app.json --noEmit` filtrado por ContentHeader: sem erros.
- `vite build`: ✓ built in 23.28s.

---

## Tarefa adicional: System design padrão na página Ranking

**Alteração em `src/pages/Leaderboard.tsx`:**
- O header custom inline foi substituído por `AdminHeader` (padrão do system design, mesmo usado em Dashboard, Profile, Lesson).
- O título "Ranking Global/Semanal/Mensal" agora vem do `title` do AdminHeader.
- A descrição "Compare seu progresso..." vem do `description`.
- As tabs Semanal/Mensal/Global foram movidas para a prop `filters` do AdminHeader.
- `showSearch={false}` (consistente com as outras páginas aluno).
- Removidas classes de padding manuais duplicadas (`py-8 mt-6`) — o `PageContainer` já fornece o gutter padrão `p-4 sm:p-6`.
- Adicionada importação de `AdminHeader` e `PageContainer` (já existente).
- `space-y-8` adicionado ao PageContainer para espaçamento entre header e conteúdo.

**Rollback:** reverter `src/pages/Leaderboard.tsx` para o header inline custom. Não há alterações de banco.

**Verificação:**
- `tsc -p tsconfig.app.json --noEmit` filtrado por Leaderboard: sem erros.
- `vite build`: ✓ built in 21.80s.
