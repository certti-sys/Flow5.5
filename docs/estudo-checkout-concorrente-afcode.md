# Estudo — Checkout do concorrente (afcode.com.br) vs Flow 5.5

Data: 2026-11-22
Escopo: análise de layout, organização de informação e orientação de dados em desktop (1440), tablet (834) e mobile (390). Nada foi alterado no código.
Método: renderização real com Chrome headless, leitura de DOM, `getBoundingClientRect`, `getComputedStyle`, cálculo de contraste WCAG e captura em página inteira. Sem inferência por imagem.

- Concorrente: `https://afcode.com.br/checkout?p=fbe0bba6-3c5a-446a-b2a2-738f1b7fb384` — produto "AutoFlow – Licença Mensal", R$ 67,90 → R$ 10,00 no Pix.
- Nosso: `https://v5.flowmembers.app/c/fundamentos-do-react` — R$ 97,00.

---

## 1. Números medidos

| Métrica | afcode | Flow 5.5 |
|---|---|---|
| Container máximo | 1024 px (`max-w-5xl`) | 1152 px (`max-w-6xl`) |
| Grid desktop | 3 colunas → form 653 px / resumo 315 px | 12 colunas → form 640 px / resumo 448 px |
| Altura página desktop | 3040 px | 1860 px |
| Altura página mobile | 4210 px | 2525 px |
| Altura dos inputs | 46 px | 40 px (desktop) / 44 px (mobile) |
| Fonte dos inputs | 14 px | 14 px |
| Altura do CTA | 44 px (573 px de largura) | 40 px desktop / 48 px mobile |
| Contraste do CTA | 4,98:1 (branco em `#008140`) | **3,13:1** (`#17171C` em `#7C3AED`) — reprova AA |
| Resumo da compra | card 315×229, sticky | card 448×~646, sticky |
| Barra de escassez | sticky no topo, 44 px, sempre visível | existe componente, **desligado em produção** |
| Sticky footer mobile | não tem | campo `mobile_sticky_footer` existe no tipo, **código não usa** |
| Campos no formulário | 4 | 4 |
| Order bumps visíveis | 5 simultâneos | 1 |
| Cupom | não aparece | visível, mas **depois do CTA no mobile** |

---

## 2. Estrutura de cada um

### afcode (desktop)
```
[barra sticky vermelha — contador 14:54]          44px, largura total
┌─────────────────────────────────────┬──────────────────┐
│ banner hero 640×~440                │ Resumo da compra │
│ card do produto (thumb+nome+preço)  │  item  R$ 67,90  │
│ Seus dados (4 campos)               │  Pix   -R$ 57,90 │
│   tel + CPF em 2 colunas            │  Total R$ 10,00  │
│ OPORTUNIDADE ÚNICA (5 bumps)        │  Compra segura   │
│ Escolha a forma de pagamento        │                  │
│   Pix | Cartão                      │ (sticky)         │
│ [PAGAR]  ← verde, largura da coluna │                  │
└─────────────────────────────────────┴──────────────────┘
rodapé: selos + "afCode está processando este pagamento
para o vendedor Fernando Machado" + Termos de Compra
```

### afcode (mobile)
```
barra sticky do contador
banner
card do produto (nome + preço)      ← repete antes do form
RESUMO DA COMPRA                    ← antes do formulário
Seus dados
bumps (5, empilhados)
Escolha a forma de pagamento
[PAGAR]
selos / rodapé
```

### Flow 5.5 (mobile)
```
header EduStream + "Ambiente Seguro"
banner
Seus dados
Meios de pagamento
Dados do Cartão
order bump (1)
[Pagar R$ 97,00]
cupom de desconto                   ← depois do CTA
Compra Segura / Fundamentos do React / Total  ← depois do CTA
bullets (liberação imediata, garantia, formas de pagamento)
rodapé
```

---

## 3. O que o concorrente faz melhor

### 3.1 Resumo compacto e sempre à vista (desktop)
315 px de largura e 229 px de altura, sticky. Mostra só: nome do item, linha de desconto do método de pagamento, total grande em verde e uma nota de "compra segura". Nosso resumo ocupa 448 px e 646 px de altura porque empilha cupom + card de produto + total + 3 bullets.

Efeito: no concorrente o formulário domina a tela (2/3) e o resumo é referência rápida. No nosso os dois disputam espaço.

### 3.2 Preço repetido em 3 pontos no mobile
afcode mostra o valor no card do produto (topo), no resumo (antes do form) e no resumo final. O usuário nunca perde a noção de quanto vai pagar.

Nosso mobile mostra o total **só no botão e no bloco depois dele**. Quem rola rápido chega ao CTA sem ter visto o resumo.

### 3.3 Ordem no mobile: resumo antes do formulário
Concorrente: preço → dados → bumps → pagamento → CTA.
Nosso: dados → pagamento → cartão → bump → CTA → **cupom** → **resumo**.

Duas consequências no nosso:
- o cupom fica **depois** do botão de pagar; para aplicar desconto o usuário precisa rolar de volta ao CTA;
- o resumo de compra aparece depois do CTA, invertendo a lógica de decisão.

### 3.4 CTA com preço no botão? Não — e por quê
afcode usa botão neutro "PAGAR" (44 px, verde, 573 px de largura) e deixa o valor no resumo sticky. Nosso botão carrega o valor ("Pagar R$ 97,00"), o que é bom no mobile (é o único lugar com o preço antes do fim) mas gera string longa e quebra em telas pequenas.

Não é "um é melhor": os dois resolvem o mesmo problema por caminhos diferentes. O problema real nosso é **contraste 3,13:1** — abaixo de AA.

### 3.5 Bumps com affordance de checkbox explícito
Concorrente: moldura tracejada verde, selo "OFERTA ESPECIAL", `-50%`, linha `De R$ 67,90  →  R$ 33,95` com ícone e checkbox `☐ Sim, quero esta oferta!`. Preço final à direita, alinhado ao checkbox.

Nosso: card com gradiente colorido, badge `% OFF`, e rodapé textual `+ Clique para adicionar`. Não há checkbox — o alvo de clique é o card inteiro (bom no mobile) mas a affordance é mais fraca e o estado selecionado só muda texto para `✓ Adicionado ao pedido`.

### 3.6 Bumps antes do pagamento
Concorrente coloca os bumps **entre dados e forma de pagamento**. Nós colocamos **depois dos dados do cartão**. No nosso o usuário já digitou cartão quando a oferta aparece — aumenta atrito e a chance de abandonar.

### 3.7 Método de pagamento como último passo + Pix como default
afcode: Pix primeiro, destacado em verde, com o valor já com desconto no botão (`Pix - R$ 57,90`). Cartão em segundo. O CTA então fecha o fluxo sem mais nada abaixo.

Nosso: `PaymentMethods` default é `credit_card` (`if (allowedMethods.includes('credit_card')) return 'credit_card'`). Não existe desconto por método de pagamento no produto — é feature inexistente, não só ordem.

### 3.8 Rodapé que responde "quem está cobrando"
Texto explícito: "afCode está processando este pagamento para o vendedor Fernando Machado", link de Política de Reembolso e Termos de Serviço, e "Ao continuar, você concorda com os Termos de Compra" **colado no CTA**.

Nosso rodapé tem `<span>Termos de Uso</span>` e `<span>Política de Privacidade</span>` — não são links, sem página, sem aviso de consentimento junto ao botão.

### 3.9 Barra de escassez sempre visível
44 px sticky no topo, vermelho, com ícone de relógio. Fica visível em todos os scrolls (validado em 0 / 1850 / 3266 px).

Nosso `CheckoutTimer` suporta `sticky` mas está desligado em produção. O componente também reinicia o contador quando o `localStorage` expira, o que é honesto — e limita o efeito.

### 3.10 Sem cupom visível
O concorrente não oferece campo de cupom. Menos uma decisão, menos uma saída da página para "procurar cupom". Nós mostramos o campo em destaque no topo da coluna direita no desktop.

---

## 4. O que já fazemos igual ou melhor

- **Métodos de pagamento em cards de 90 px com ícone** — mesmo padrão, mesma altura, mesma clareza.
- **Dois campos por linha** (CPF + celular) no desktop/tablet, empilhados no mobile — idêntico ao concorrente.
- **"Por que pedimos esse dado?"** — o concorrente tem, nós temos (`CustomerForm` linha 118).
- **Bumps com `% OFF` e preço riscado** — temos, com paleta configurável por bump.
- **Inputs de 44 px no mobile** — atendemos o alvo de toque; o concorrente fica em 46 px no desktop e nós em 40 px lá, diferença irrelevante.
- **Contraste de texto secundário** — nosso `#9F9FA8` sobre `#1E1E24` dá 6,32:1; o concorrente tem 25 falhas AA em 66 textos (o "De R$ 67,90" a 12 px dá 2,54:1).
- **Contador configurável** (texto, cor, minutos, sticky) — o concorrente tem fixo.

---

## 5. Recomendações, por retorno sobre esforço

### P0 — bugs de conversão, baixo esforço

1. **Contraste do CTA**: `#17171C` sobre `#7C3AED` = 3,13:1. Trocar a cor do texto para branco dá 5,70:1, ou clarear/escurecer o fundo. Mexer em `Checkout.tsx` (estilo do `<Button type="submit">`) ou na cor configurada em produção.
2. **Cupom depois do CTA no mobile**: mover o bloco de cupom para dentro do formulário, antes do botão. É só trocar a posição do `<div>` de `CouponInput` (hoje em `lg:col-span-5`).
3. **Resumo antes do CTA no mobile**: usar `order` do grid (`order-1 lg:order-none`) na coluna direita para que no mobile ela suba antes do botão, sem duplicar componente.
4. **Links mortos no rodapé**: `Termos de Uso` e `Política de Privacidade` são `<span>`. Viram `<a>` ou saem.

### P1 — estrutura, esforço médio

5. **Compactar o resumo no desktop**: tirar cupom e bullets de dentro de `OrderSummary`, deixar só item + total + selo. Ganho direto de foco no formulário.
6. **Mover order bumps para antes dos meios de pagamento** (hoje ficam depois dos dados do cartão). Mudança de ordem em `Checkout.tsx`, sem tocar no componente.
7. **Checkbox explícito no bump** (`☐ Sim, quero esta oferta!` + preço à direita) — `OrderBumpCard.tsx` já recebe `selected`; é adicionar um `<input type="checkbox">` visual e alinhar o preço.
8. **Nota "quem está cobrando" + consentimento junto ao CTA**: uma linha acima do botão. Texto vem de config.

### P2 — produto, exige decisão sua

9. **Desconto por método de pagamento (Pix)**: maior alavanca de conversão do concorrente e a que mais custa — precisa de campo no produto, cálculo no servidor e reflexo no gateway. Hoje não existe nada disso.
10. **Pix como método default** quando disponível. Uma linha em `PaymentMethods.tsx`, mas muda comportamento de pagamento — só com sua autorização.
11. **Ligar o contador** (`config.timer.enabled`). Decisão comercial, não técnica.
12. **Preço fixo repetido no topo** (card do produto antes do form no mobile).
13. **Implementar ou remover `mobile_sticky_footer`**: existe em `src/types/checkout-config.ts:63` e `:152`, e nenhum componente lê. Ou vira barra fixa de CTA no mobile, ou sai do tipo para não enganar quem configurar.

---

## 6. Achados de dados em produção (não são código)

- Resumo mostra `Sem Imagem`: `product.image_url` do curso "Fundamentos do React" está nulo.
- `courses.refund_enabled = false` — o produto não tem garantia declarada, e o checkout não exibe nenhuma menção a reembolso. O concorrente exibe "Política de Reembolso" no rodapé.
- Nenhum dos 16 cursos tem outro provedor de vídeo — irrelevante para checkout, registrado só para contexto.

---

## 7. Resumo em uma frase

O concorrente ganha em **ordem de informação no mobile** (preço e resumo antes da decisão, cupom inexistente, CTA fechando o fluxo) e em **densidade do resumo no desktop**; nós ganhamos em **acessibilidade, configuráveis e flexibilidade de bumps**. Os itens 1–4 são correções de baixo custo com efeito direto em conversão.
