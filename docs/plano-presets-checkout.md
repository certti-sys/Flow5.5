# Plano — aba "Presets" no admin do checkout

Estudo do sistema de presets do `Checkout_Pro_v1.2` e plano de adaptação.
Referência: `Checkout_Pro_v1.2/src/lib/themes.ts` (1623 linhas),
`Checkout_Pro_v1.2/src/hooks/useBranding.tsx`,
`Checkout_Pro_v1.2/src/pages/BrandingPage.tsx`.

---

## 1. Como o Checkout_Pro faz

### 1.1 Estrutura de dados

`ThemePreset` é um objeto com **dois mapas de variáveis CSS**, um por modo:

```ts
export interface ThemePreset {
  id: string;                          // "supabase", "spotify", ...
  name: string;                        // "Supabase", "Spotify", ...
  light: Record<string, string>;       // { "--background": "oklch(...)", ... }
  dark: Record<string, string>;
}
export const THEMES: ThemePreset[] = [ /* 18 presets */ ];
```

18 presets (`themes.ts:8-1623`):

| id | nome | radius | fonte |
|---|---|---|---|
| `default` | Padrão (Slate) | 0.5rem | — |
| `supabase` | Supabase | 0.5rem | Outfit |
| `claude` | Claude (Antropic) | 0.5rem | — |
| `vscode` | Visual Studio Code | 0rem | — |
| `spotify` | Spotify | 0.25rem | Lato |
| `vercel` | Vercel | 0.5rem | Geist |
| `neo-brutalism` | Neo Brutalism | 0px | DM Sans |
| `modern-minimal` | Modern Minimal | 0.375rem | — |
| `material-design` | Material Design | 1rem | — |
| `claymorphism` | Claymorphism | 1.25rem | — |
| `marvel` | Marvel | 0rem | Outfit |
| `twitter` | Twitter | 1.3rem | Open Sans |
| `slack` | Slack | 0.5rem | Lato |
| `notebook` | Notebook | 0.625rem | Architects Daughter |
| `nature` | Nature | 0.5rem | Montserrat |
| `mono` | Mono | 0rem | Geist Mono |
| `graphite` | Graphite | 0.35rem | Montserrat |
| `retro-arcade` | Retro Arcade | 0.25rem | Outfit |

Tokens por preset (~28 chaves em cada modo): `--background`, `--foreground`,
`--card`, `--card-foreground`, `--popover`, `--popover-foreground`,
`--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`,
`--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`,
`--destructive`, `--destructive-foreground`, `--border`, `--input`, `--ring`,
`--radius`, `--auth-*` (6, só da tela de login), `--sidebar*` (8).
Alguns presets trazem `--font-sans`.

**Importante:** o preset muda **cor + raio de borda + fonte**. Não muda
layout, espaçamento nem estrutura — `--spacing` está na lista de remoção mas
nenhum preset o define.

### 1.2 Como aplica

`applyBrandingColor()` em `useBranding.tsx:74`:

1. Limpa todas as variáveis inline do `:root` e remove o `<style id="branding-overrides">`.
2. Cria um `<style>` com `:root { ...light }` e `html.dark, .dark { ...dark }`,
   cada declaração com `!important`.
3. Se o modo for "Workspace" (legado), em vez do preset só sobrescreve
   `--primary`, `--sidebar-primary` e `--ring` com a cor HEX convertida
   para OKLCH (`hexToOklch`, `useBranding.tsx:48`).
4. Roda em `useLayoutEffect`, antes do paint.

Persistência: colunas `active_preset`, `branding_mode` e `primary_color` na
tabela de branding do workspace.

### 1.3 UI

`BrandingPage.tsx:279-390`: grid `sm:grid-cols-2` de cards. Cada card mostra
nome + **dois mini-previews lado a lado** (light e dark), desenhados com
`div`s de 2-3px pintados com `theme.light["--background"]`,
`theme.light["--primary"]`, `theme.light["--border"]` etc. Selecionado ganha
`border-primary ring-1`. Também tem `PRESET_HERO_COLORS` (cor de fundo da
tela de login por preset) e `PRESETS_COLORS` (8 swatches HEX para o modo
legado).

---

## 2. Diferença crítica para o nosso projeto

O Checkout_Pro aplica o preset **globalmente, no `:root`, com `!important`**.
Nós não podemos copiar isso:

| | Checkout_Pro | Flow 5.5 |
|---|---|---|
| Escopo | plataforma inteira | por produto (`products.checkout_config`) |
| Formato | OKLCH | HSL (`h s% l%`) — o Tailwind usa `hsl(var(--x))` |
| Onde aplica | `:root` + `!important` | variáveis inline no `:root` via `applyThemeToCSSVariables` |
| Tema claro/escuro | classe `.dark` no `<html>` | atributo `data-checkout-theme` no `<body>` |
| Já existe | aba Personalização (global) | aba Geral → "Cores e botão" (por produto) |

Consequências:

- **Não** usar `!important` no `:root`: o tema da plataforma
  (`ThemeProvider`/`useTheme`) escreve variáveis inline ali e o admin inteiro
  ficaria com as cores do preset do checkout.
- Presets precisam ser **HSL**, não OKLCH. Converter os 18 presets de
  OKLCH → HSL é aritmética reversível e verificável.
- A aplicação deve ser **escopada no checkout público**, exatamente como o
  tema claro já faz hoje (`body[data-checkout-theme="light"]` em
  `src/index.css:114`).

---

## 3. Arquitetura proposta

### 3.1 Tipo + catálogo

Novo arquivo `src/types/checkout-presets.ts`:

```ts
export interface CheckoutPreset {
    id: string;
    name: string;
    /** Tokens do modo escuro. */
    dark: Partial<Record<CheckoutThemeToken, string>>;
    /** Tokens do modo claro. */
    light: Partial<Record<CheckoutThemeToken, string>>;
}

export const CHECKOUT_PRESETS: CheckoutPreset[] = [ ... ];
export const findPreset = (id?: string | null) =>
    CHECKOUT_PRESETS.find((p) => p.id === id) ?? null;
```

Tokens cobertos (subconjunto do preset original que existe no nosso CSS):
`--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`,
`--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`,
`--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`,
`--accent-foreground`, `--destructive`, `--destructive-foreground`,
`--border`, `--input`, `--ring`, `--radius`, `--font-sans`.
Os `--auth-*` e `--sidebar*` ficam de fora (são do painel, não do checkout).

### 3.2 Config

Em `src/types/checkout-config.ts`, dentro de `appearance`:

```ts
appearance: {
    ...
    theme: CheckoutTheme;
    /** Preset aplicado. `null`/ausente = usa as cores manuais de hoje. */
    preset: string | null;
    /** Fonte do checkout. `null` = Geist (padrão atual). */
    font: string | null;
}
```

`normalizeCheckoutConfig` valida contra o catálogo e cai em `null` quando o id
não existe (produto antigo, preset removido).

### 3.3 Aplicação no CSS

Em `src/index.css`, um bloco por preset **escopado no checkout**:

```css
/* Presets do checkout. Cada bloco vence o :root por especificidade de
   atributo, sem !important, e não encosta no painel. */
body[data-checkout-theme="dark"][data-checkout-preset="spotify"] { --primary: 141 73% 42%; ... }
body[data-checkout-theme="light"][data-checkout-preset="spotify"] { ... }
```

Isso exige mudar o tema escuro de "ausência de atributo" para
`data-checkout-theme="dark"` explícito — mudança pequena, mas com impacto no
rollback (ver §6).

Alternativa mais barata, sem tocar no CSS: um `<style>` injetado por
componente, igual ao Checkout_Pro, porém com seletor
`body[data-checkout-theme]` em vez de `:root`. Elimina 36 blocos de CSS
estático, mas paga com JS em runtime.

**Recomendação:** CSS estático. 18 presets × 2 modos = 36 blocos gerados
uma vez; zero JS no caminho crítico; o `data-checkout-preset` só alterna qual
bloco vale. Para não escrever 36 blocos à mão, gerar o CSS por script local
(`tmp-gen-presets.mjs`) e colar o resultado em `index.css`.

### 3.4 Fonte

O `index.html` carrega só Inter + Geist. Adicionar as fontes usadas pelos
presets: Outfit, Lato, DM Sans, Open Sans, Architects Daughter, Montserrat,
Geist Mono. Todas no Google Fonts, um `<link>` só com `display=swap`.

**Atenção CSP** (`index.html:4`): `style-src` libera `fonts.googleapis.com` e
`font-src` libera `fonts.gstatic.com` — já funciona, não precisa mexer.

### 3.5 Admin — nova aba "Presets"

Em `src/pages/admin/CheckoutBuilder.tsx`:

- `TabsTrigger value="presets"` entre "Geral" e "Conteúdo".
- `TabsContent`: grid `sm:grid-cols-2 lg:grid-cols-3` de cards.
- Cada card: nome + dois mini-previews (light/dark) + botão "Aplicar".
- Card "Nenhum (cores manuais)" como primeira opção, selecionado por padrão
  nos produtos que já existem.
- Ao aplicar: grava `appearance.preset`, e **preenche** os campos de cor
  manuais (`buy_button_color`, `background_color`) com os valores do preset
  para que o admin veja o que está usando e possa ajustar depois.
- Aviso de que o preset não sobrescreve cor manual já definida — a cor
  manual ganha (é o comportamento atual em `Checkout.tsx:892`).

### 3.6 Compatibilidade

- `appearance.preset` ausente → comportamento idêntico ao de hoje.
- `normalizeCheckoutConfig` nunca joga erro, sempre cai em `null`.
- Os 3 produtos em produção (`design-ui-ux-avancado`, `fundamentos-do-react`,
  `python-para-data-science`) ficam sem preset até o admin escolher.

---

## 4. Esforço

| Etapa | Entrega | Esforço |
|---|---|---|
| 1 | `checkout-presets.ts` com 18 presets convertidos para HSL | 0,5 dia |
| 2 | Script de conversão OKLCH→HSL + conferência de contraste AA | 0,5 dia |
| 3 | Blocos CSS em `index.css` (gerados) + `data-checkout-preset` | 0,5 dia |
| 4 | `appearance.preset` + `appearance.font` no tipo e no normalize | 0,25 dia |
| 5 | Aba "Presets" no admin com mini-previews | 1 dia |
| 6 | Fontes no `index.html` | 0,25 dia |
| 7 | Validação Puppeteer (18 presets × 2 modos × 3 telas) | 0,5 dia |

Total: **~3,5 dias**.

---

## 5. Riscos

| Risco | Mitigação |
|---|---|
| 18 presets × contraste AA: vários reprovam sobre branco | Rodar auditoria WCAG automatizada como já foi feito no checkout; ajustar `--primary-foreground` por preset |
| Fontes novas pesam no LCP do checkout | `display=swap` + só carregar a fonte do preset ativo (link dinâmico) |
| `!important` vazando para o painel | Nunca usar `!important`; escopo por atributo no `<body>` |
| Preset OKLCH→HSL perder precisão | Converter e comparar visualmente; HSL cobre o gamut sRGB que usamos |
| Tema escuro muda de "sem atributo" para `dark` explícito | Testar os 3 produtos em produção antes de subir; rollback documentado |

---

## 6. Rollback

Tag antes de começar: `pre-checkout-presets`.

Reverter o código:

```powershell
git revert --no-commit pre-checkout-presets..HEAD
git commit -m "revert: presets do checkout"
git push
```

Reverter só os produtos (sem deploy):

```sql
update products
set checkout_config = checkout_config #- '{appearance,preset}'
                        #- '{appearance,font}'
where checkout_config is not null;
```

Sem `appearance.preset`, `normalizeCheckoutConfig` cai em `null` e o checkout
volta às cores manuais — comportamento anterior intacto.

### Preset global (Personalização → aba Presets)

Desliga o preset sem deploy, mantendo histórico e paleta manual:

```sql
update theme_settings set preset = null where is_active;
```

Reverter o código:

```powershell
git revert --no-commit <commit-do-preset-global>
git commit -m "revert: preset global de tema"
git push
```

Desfazer a coluna (só depois do revert do código):

```sql
alter table theme_settings drop column preset;
-- a RPC volta ao formato de 2 argumentos
create or replace function public.save_active_theme(
  p_primary_color text,
  p_color_palette jsonb
) returns public.theme_settings
language plpgsql security definer set search_path = public as $$
declare result public.theme_settings;
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'Apenas administradores podem salvar o tema';
  end if;

  update public.theme_settings set is_active = false where is_active;

  insert into public.theme_settings (primary_color, color_palette, is_active)
  values (p_primary_color, p_color_palette, true)
  returning * into result;

  return result;
end;
$$;
```

---

## 7. Decisões tomadas

1. **18 presets mantidos**, com os nomes de marca como estão. Renomear fica
   para a segunda fase, se houver problema comercial.
2. **Preset vence a cor manual.** Escolher cor manual em "Cores do Tema"
   desliga o preset (`setSelectedPreset(null)`), então nunca há preset
   "invisível".
3. **Fonte e raio amarrados ao preset**, como no Checkout_Pro. O token é
   `--preset-font` (não `font-family`), para o checkout poder fixar a fonte
   dele sem perder o resto.
4. **Preset global usa sempre a paleta escura** — a plataforma não tem modo
   claro. O checkout público continua escolhendo light/dark pelo
   `appearance.theme` do produto.
5. **Reset existe nos dois lugares.** No checkout, "Padrão do checkout" só
   solta o preset e devolve as cores manuais do produto. Em Personalização,
   "Padrão do sistema" volta para `#f0a505` + paleta original + Geist +
   0.75rem.

## 8. Isolamento do checkout público

O tema da plataforma escreve tokens inline em `:root`, que o checkout
herdaria por cascata. Para o checkout não mudar quando um preset global está
ativo:

- `body.checkout-scope` (em `src/index.css`) redeclara os neutros e aponta
  `--primary`/`--accent`/`--ring` para `--platform-manual-*`, variáveis
  escritas por `applyThemeToCSSVariables` com a paleta manual (não o preset).
- `--preset-font` é fixado no `<body>` do checkout; a fonte do preset global
  não o alcança.
- `--radius-xl/2xl/3xl` do preset são sobrescritos pelo escopo do checkout.

## 9. Sidebar

O preset não traz tokens de sidebar, então `buildPresetVariables` deriva:

| Token | Origem |
|---|---|
| `--sidebar-background` | `--card` (um degrau acima do fundo, como no tema padrão) |
| `--sidebar-foreground` | `--foreground` |
| `--sidebar-border` | `--border` → `--muted` → fundo da sidebar |
| `--sidebar-accent-foreground` | `--accent-foreground` → `--foreground` |
| `--sidebar-primary` / `--sidebar-ring` | `--primary` |
| `--sidebar-accent` | `--accent` |

Ao voltar para o padrão, esses tokens são removidos do `:root` e o `index.css`
volta a valer.


Resultado: preset global ativo troca admin/área de membros/aulas, e o
checkout continua exatamente com o que está configurado no produto.
