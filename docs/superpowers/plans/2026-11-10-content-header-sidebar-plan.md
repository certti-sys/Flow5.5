# Plano — Barra superior (ContentHeader) no modo sidebar

Data: 2026-11-10

## O que o usuário pediu

Na imagem da área do aluno (sidebar ativo):
1. **Verde (manter):** busca (lupa), notificações (sino) e avatar/menu do usuário — nas laterais da barra.
2. **Vermelho (remover):** itens centrais "Cursos · Perfil · Ranking · Admin" — já existem no sidebar, são duplicados.
3. **Barra superior:** ficar transparente quando o sidebar estiver **ativo/aberto**; só aparecer (fundo visível) quando o sidebar estiver **desativado/recolhido**.

## Regra de negócio a implementar

O `ContentHeader` só é usado no modo sidebar (`ClientLayout` área do aluno + `AdminLayout` área admin). No layout horizontal já se usa `Navbar`, que não muda.

No `ContentHeader`, já temos `state` do `useSidebar()`:
- `state === 'collapsed'` → sidebar recolhido (ícones apenas) = "desativado visualmente" → barra **aparece** com fundo visível.
- `state !== 'collapsed'` (aberto) = "sidebar ativo" → barra **transparente** (sem fundo, sem blur, sem borda) e **sem os itens centrais vermelhos**.

Itens verdes (busca, notificação, avatar) continuam existindo em ambos os estados.

## Arquivos a modificar

1. `src/components/ContentHeader.tsx`
   - Ler `state` do `useSidebar()` (já importado).
   - Calcular `isSidebarOpen = state !== 'collapsed'`.
   - Classe do `<header>`:
     - Sidebar aberto: `bg-transparent backdrop-blur-none border-none` (transparente).
     - Sidebar recolhido: `bg-background/95 backdrop-blur-md border-b border-white/[0.1]` (atual).
   - Remover a **Coluna 2** (itens centrais vermelhos) completamente quando `isSidebarOpen`.
   - Manter Coluna 1 (toggle sidebar, logo colapsado, breadcrumbs) e Coluna 3 (busca, notificações, avatar) em ambos os estados.

## Rollback (se algo der errado)

Reverter `src/components/ContentHeader.tsx` para a versão anterior:
- `<header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-white/[0.1]">`
- Restaurar a Coluna 2 completa (NavItems Cursos/Perfil/Ranking/Admin).

Não há alterações de banco, nem de rotas, nem de outros componentes. O rollback é apenas reverter este único arquivo.

## Verificação após implementar

- `npx tsc -p tsconfig.app.json --noEmit` (filtrado por ContentHeader) sem erros.
- `npx vite build` com sucesso.
- Inspeção visual:
  - Sidebar aberto (área do aluno): barra superior transparente sobre o fundo da página, sem os 4 itens centrais, com busca/notificação/avatar nas laterais.
  - Sidebar recolhido: barra com fundo visível como antes.
  - Área admin (sidebar sempre ativo): mesma transparência e sem itens centrais.
  - Layout horizontal (Navbar): inalterado.
