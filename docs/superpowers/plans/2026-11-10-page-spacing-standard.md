# Padrão de espaçamento lateral — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Padronizar o gutter/largura de todas as páginas internas no mesmo container do Admin Dashboard (`container mx-auto p-4 sm:p-6`), sem tocar no Dashboard do aluno, Login, Checkout, Certificado e 404.

**Architecture:** Um componente `PageContainer` passa a ser a única fonte de verdade do wrapper de página. Páginas do aluno usam `PageContainer` diretamente; páginas admin já são envolvidas pelo `AdminLayout`, então apenas removem o `max-w-7xl mx-auto` interno que as estreitava.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS (`container` customizado: center, padding 2rem, 2xl 1400px) + Vite.

**Spec:** `docs/superpowers/specs/2026-11-10-page-spacing-standard-design.md`

## Global Constraints

- Classes padrão: `container mx-auto p-4 sm:p-6` (idêntico ao AdminLayout desktop/mobile).
- Não alterar `src/pages/Dashboard.tsx` (carrossel), `Login`, `Checkout`, `CertificateView`, `NotFound`.
- Preservar `pb-20`/`pb-24` e animações (`motion.div`, `initial`/`animate`) de cada página.
- Não é repositório git: não há etapa de commit.
- Verificação de tipos: `npx tsc -p tsconfig.app.json --noEmit` (o comando sai com código 1 por erros pré-existentes não relacionados; filtrar pelos arquivos alterados).
- Build: `npx vite build` deve terminar com `✓ built`.

## Review Focus

- Tabelas admin mais largas: verificar que o overflow horizontal continua dentro do wrapper da tabela, sem scroll na página.
- Banner full-bleed de `Course.tsx`: o fundo deve continuar de ponta a ponta; apenas o conteúdo interno usa o container.
- `Leaderboard`: os estados de loading e erro não podem ficar desalinhados do conteúdo normal.
- Padding duplicado: nenhuma página deve manter `px-4 md:px-6 lg:px-8` junto do `PageContainer`.
- Mobile: gutter deve ser `p-4` (16px), igual ao admin mobile.

---

### Task 1: Criar `PageContainer` e usá-lo no `AdminLayout`

**Files:**
- Create: `src/components/layout/PageContainer.tsx`
- Modify: `src/components/admin/AdminLayout.tsx` (linhas ~90 e ~107)

**Interfaces:**
- Produces: `PageContainer({ children, className }: { children: ReactNode; className?: string })` — renderiza `<div className={cn("container mx-auto p-4 sm:p-6", className)}>`.

- [ ] **Step 1: Criar o componente**

```tsx
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return <div className={cn("container mx-auto p-4 sm:p-6", className)}>{children}</div>;
}
```

- [ ] **Step 2: Substituir os dois wrappers do AdminLayout**

Trocar:
```tsx
<div className="container mx-auto p-4 sm:p-6">{children}</div>
<div className="container mx-auto p-6">{children}</div>
```
por `<PageContainer>{children}</PageContainer>` e importar o componente.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | Select-String -Pattern "PageContainer|AdminLayout"`
Expected: nenhuma linha.

---

### Task 2: Aplicar `PageContainer` na área do aluno

**Files:**
- Modify: `src/pages/Lesson.tsx` (wrapper em ~623)
- Modify: `src/pages/Profile.tsx` (wrapper em ~176)
- Modify: `src/pages/Leaderboard.tsx` (raiz, header em ~162, conteúdo em ~191, loading ~144, erro ~133)
- Modify: `src/pages/Course.tsx` (~187 e ~271)
- Modify: `src/pages/CourseInfo.tsx` (~73 e remover `max-w-6xl` em ~85)

**Interfaces:**
- Consumes: `PageContainer` da Task 1.

- [ ] **Step 1: `Lesson.tsx`**

No `motion.div` raiz, trocar `className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-8 pb-20 space-y-6"` por `className="pb-20 space-y-6"` e envolver o `motion.div` com `<PageContainer>`.

- [ ] **Step 2: `Profile.tsx`**

Mesmo tratamento do Lesson: wrapper raiz vira `pb-20 space-y-6` dentro de `<PageContainer>`.

- [ ] **Step 3: `Leaderboard.tsx`**

- Envolver o `return` normal com `<PageContainer className="pb-24">` e remover `pb-24` da div interna.
- Remover `max-w-5xl mx-auto` e `px-4 md:px-8` do header e do bloco de conteúdo.
- No estado de erro, remover `max-w-5xl mx-auto` (mantém `p-8` e `mt-8`).
- No skeleton de loading, remover `max-w-7xl mx-auto` (mantém `p-8`).

- [ ] **Step 4: `Course.tsx`**

- `div.relative` do hero (~187): trocar por `<PageContainer className="py-8 md:py-12">` mantendo o conteúdo interno.
- `<main>` (~271): trocar `className="container mx-auto px-4 py-6 md:py-8"` por `<PageContainer className="py-6 md:py-8">`.
- O `div` externo `relative overflow-hidden` do hero permanece full-bleed.

- [ ] **Step 5: `CourseInfo.tsx`**

- `<main className="container mx-auto px-4 py-8">` → `<PageContainer className="py-8">`.
- `<div className="max-w-6xl mx-auto space-y-12 animate-fade-in">` → `<div className="space-y-12 animate-fade-in">`.

- [ ] **Step 6: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | Select-String -Pattern "Lesson|Profile|Leaderboard|Course|CourseInfo"`
Expected: nenhuma linha.

---

### Task 3: Remover o `max-w-7xl mx-auto` interno das páginas admin

**Files (modificar somente a classe do wrapper raiz):**
- `src/pages/admin/CertificatesDashboard.tsx:129`
- `src/pages/admin/Comments.tsx:183`
- `src/pages/admin/Coupons.tsx:127`
- `src/pages/admin/Courses.tsx:235`
- `src/pages/admin/Customers.tsx:188`
- `src/pages/admin/EmailSettings.tsx:166`
- `src/pages/admin/Gateways.tsx:84`
- `src/pages/admin/MonitoringSettings.tsx:95`
- `src/pages/admin/Notifications.tsx:90`
- `src/pages/admin/OrderBumps.tsx:220`
- `src/pages/admin/Orders.tsx:220`
- `src/pages/admin/Products.tsx:124`
- `src/pages/admin/SalesDashboard.tsx:213`
- `src/pages/admin/Students.tsx:260`
- `src/pages/admin/ThemeCustomization.tsx:86`
- `src/pages/admin/WebhookHub.tsx:92`
- `src/pages/admin/WhatsAppSettings.tsx:134`

**Interfaces:**
- Consumes: container já fornecido por `AdminLayout` (Task 1).

- [ ] **Step 1: Remover a restrição**

Em cada arquivo, remover apenas `max-w-7xl mx-auto` da string de classe do wrapper raiz. Manter `space-y-*`, `pb-20`, `animate-fade-in`, `overflow-visible`.

- [ ] **Step 2: Conferir que não sobrou nenhum**

Run: `Get-ChildItem src\pages\admin -Filter *.tsx | Select-String -Pattern "max-w-7xl"`
Expected: nenhuma ocorrência.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc -p tsconfig.app.json --noEmit 2>&1 | Select-String -Pattern "pages/admin"`
Expected: nenhuma linha.

---

### Task 4: Verificação final

- [ ] **Step 1: Build de produção**

Run: `npx vite build`
Expected: termina com `✓ built in ...`.

- [ ] **Step 2: Conferir que o Dashboard do aluno não mudou**

Run: `Select-String -Path src\pages\Dashboard.tsx -Pattern "max-w-7xl|PageContainer"`
Expected: nenhuma ocorrência.

- [ ] **Step 3: Inspeção visual**

Comparar, com sidebar ativa: Admin Dashboard, Admin Cursos, Admin Alunos, Aula, Perfil, Ranking, Curso e Info do Curso. As bordas esquerdas/direitas do conteúdo devem coincidir. O Dashboard do aluno deve continuar full-width.
