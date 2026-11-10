# Padrão de espaçamento lateral das páginas internas

Data: 2026-11-10
Status: aprovado

## Intenção

Unificar o espaçamento lateral de todas as páginas internas do sistema usando o
Admin Dashboard como referência visual (print com destaque verde): conteúdo
centralizado em um `container` de no máximo 1400px, com gutter lateral de ~32px
e padding vertical de 24px no desktop.

Hoje cada página define o seu próprio wrapper (`max-w-7xl`, `max-w-6xl`,
`max-w-5xl`, `px-4`/`px-6`/`px-8`), o que produz larguras e gutters diferentes.

## Referência exata

`src/components/admin/AdminLayout.tsx`:

```
container mx-auto p-6            (desktop)
container mx-auto p-4 sm:p-6     (mobile)
```

`container` está configurado em `tailwind.config.ts` com `center: true`,
`padding: 2rem` e `2xl: 1400px`.

## Objetivos

- Mesmo gutter e mesma largura máxima em todas as páginas internas.
- Uma única fonte de verdade reutilizável, para evitar nova divergência.
- Manter o comportamento responsivo do admin (`p-4 sm:p-6`).

## Não objetivos

- Alterar o Dashboard do aluno (carrossel), que permanece em largura total.
- Alterar Login, Checkout, Certificado e 404 (contextos standalone/documento).
- Redesenhar componentes internos, cores, cards ou hierarquia visual.
- Mudar o espaçamento vertical interno entre seções de cada página.

## Abordagem escolhida

Criar `src/components/layout/PageContainer.tsx`:

```tsx
<div className={cn("container mx-auto p-4 sm:p-6", className)}>
  {children}
</div>
```

Aplicação:

1. **Área do aluno** — trocar o wrapper externo por `PageContainer` em:
   - `src/pages/Lesson.tsx`
   - `src/pages/Profile.tsx`
   - `src/pages/Leaderboard.tsx` (inclui estados de loading e erro)
   - `src/pages/Course.tsx`: banner externo continua full-bleed; o conteúdo do
     banner e o `<main>` passam a usar `PageContainer`
   - `src/pages/CourseInfo.tsx`: remover `max-w-6xl` interno
2. **Admin** — remover apenas o `max-w-7xl mx-auto` do wrapper raiz das 17
   páginas listadas abaixo. O `container` já vem do `AdminLayout`.
3. **AdminLayout** — passar a usar `PageContainer` (sem mudança visual).
4. **Dashboard do aluno** — sem alterações.
5. `src/App.tsx` — sem alterações de rota.

### Páginas admin que perdem `max-w-7xl`

`CertificatesDashboard`, `Comments`, `Coupons`, `Courses`, `Customers`,
`EmailSettings`, `Gateways`, `MonitoringSettings`, `Notifications`,
`OrderBumps`, `Orders`, `Products`, `SalesDashboard`, `Students`,
`ThemeCustomization`, `WebhookHub`, `WhatsAppSettings`.

`Carousels`, `DesignSandbox`, `Placeholder` e `Dashboard` já ocupam o container.

## Restrições

- Preservar `pb-20`/`pb-24` de cada página.
- Preservar animações (`motion.div`) e classes internas.
- Não criar scroll horizontal; tabelas continuam com seus wrappers de overflow.
- `PageContainer` deve aceitar `className` para casos como o banner do curso.

## Riscos

- Tabelas admin ficam mais largas (era o objetivo). Overflow interno já existe.
- Páginas com previews (Email/WhatsApp) ficam mais largas; conteúdo interno
  mantém suas larguras próprias.

## Verificação

- `npx tsc -p tsconfig.app.json --noEmit` filtrado pelos arquivos alterados.
- `npx vite build`.
- Inspeção visual: Admin Dashboard x Admin Cursos x Aula x Perfil x Ranking x
  Curso devem compartilhar o mesmo gutter; Dashboard do aluno inalterado.
