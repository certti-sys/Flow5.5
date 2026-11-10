# Design System FlowMembers - Área Administrativa

**Autor:** Manus AI

## 1. Introdução

Este Design System tem como objetivo estabelecer um conjunto de padrões e diretrizes para a interface da área administrativa do FlowMembers. A padronização visa garantir consistência visual, melhorar a experiência do usuário e otimizar o processo de desenvolvimento, especialmente ao utilizar a IDE Antigravity, evitando inconsistências e modificações fora do padrão. As cores não serão abordadas neste documento, pois o sistema já possui um mecanismo de personalização próprio.

## 2. Princípios de Design

Os seguintes princípios guiarão o desenvolvimento e a evolução da interface da área administrativa:

*   **Clareza:** A informação deve ser apresentada de forma direta e compreensível, sem ambiguidades.
*   **Consistência:** Elementos visuais e interações devem se comportar de maneira previsível em todo o sistema.
*   **Eficiência:** A interface deve permitir que os usuários completem suas tarefas de forma rápida e com o mínimo de esforço.
*   **Acessibilidade:** O sistema deve ser utilizável por pessoas com diversas habilidades e necessidades.
*   **Escalabilidade:** O Design System deve ser flexível o suficiente para acomodar futuras expansões e novas funcionalidades.

## 3. Tipografia

A escolha da tipografia é crucial para a legibilidade, especialmente em um ambiente de dark mode. Recomenda-se o uso de fontes sans-serif, que são geralmente mais legíveis em telas digitais. As fontes devem ter um bom contraste com o fundo escuro e tamanhos adequados para diferentes níveis de informação.

### 3.1. Fontes Recomendadas

Para garantir uma boa leitura e consistência, sugerimos as seguintes fontes:

*   **Inter:** Uma fonte sans-serif projetada para telas de computador, conhecida por sua alta legibilidade e otimização para interfaces de usuário [1].
*   **Roboto:** Uma fonte sans-serif amplamente utilizada e otimizada para legibilidade em diversas telas, sendo uma excelente escolha para cabeçalhos e corpo de texto [2].
*   **Open Sans:** Outra opção sans-serif com excelente legibilidade, especialmente em tamanhos menores [1].

### 3.2. Escala Tipográfica

Uma escala tipográfica consistente ajuda a estabelecer uma hierarquia visual clara. Abaixo, uma sugestão de escala baseada em tamanhos de fonte comuns para interfaces administrativas:

| Uso             | Tamanho (px) | Peso da Fonte | Line-height (em) | Carta-spacing (em) |
| :-------------- | :----------- | :------------ | :--------------- | :----------------- |
| Título Principal | 32           | Bold          | 1.2              | -0.02              |
| Título de Seção | 24           | Semi-Bold     | 1.3              | -0.01              |
| Subtítulo       | 18           | Medium        | 1.4              | 0                  |
| Corpo de Texto  | 16           | Regular       | 1.5              | 0                  |
| Texto Auxiliar  | 14           | Regular       | 1.5              | 0.01               |
| Legendas        | 12           | Regular       | 1.6              | 0.02               |

## 4. Componentes

Os componentes são os blocos de construção da interface. A padronização de seus estilos e comportamentos é essencial para a consistência.

### 4.1. Botões

Botões devem ter estados claros (normal, hover, ativo, desabilitado) e variações para diferentes ações (primário, secundário, perigo).

*   **Forma:** Cantos arredondados (ex: `border-radius: 0.375rem;` ou `6px`).
*   **Tamanhos:** Pequeno, Médio, Grande.
*   **Tipografia:** `Corpo de Texto` com `Semi-Bold`.

### 4.2. Cards

Cards são usados para agrupar informações relacionadas. Devem ter um espaçamento interno consistente e uma sombra sutil para indicar elevação em dark mode.

*   **Forma:** Cantos arredondados (ex: `border-radius: 0.5rem;` ou `8px`).
*   **Sombra:** Uma sombra sutil que não seja muito intrusiva no tema escuro.
*   **Espaçamento Interno:** Consistente para todos os cards.

### 4.3. Navegação Lateral (Sidebar)

A navegação lateral deve ser clara, com estados de item selecionado e hover bem definidos.

*   **Largura:** Fixa ou responsiva, dependendo da necessidade.
*   **Itens:** Ícone + Texto, com espaçamento adequado.
*   **Estado Ativo:** Destaque visual claro para o item selecionado (ex: fundo com cor de destaque).

### 4.4. Formulários

Campos de entrada, seletores e outros elementos de formulário devem ter um estilo unificado.

*   **Campos de Texto:** `border-radius` consistente, `padding` interno e `border` sutil.
*   **Estados:** Foco, erro, sucesso.

## 5. Espaçamento e Layout

Um sistema de espaçamento baseado em uma grade (grid) ou em uma escala modular garante consistência e harmonia visual. Recomenda-se o uso de uma escala baseada em múltiplos de 4px ou 8px.

### 5.1. Escala de Espaçamento

| Variável | Valor (px) | Uso Comum                                   |
| :------- | :--------- | :------------------------------------------ |
| `space-xs` | 4          | Espaçamento entre ícones e texto            |
| `space-sm` | 8          | Espaçamento entre elementos pequenos        |
| `space-md` | 16         | Espaçamento entre componentes               |
| `space-lg` | 24         | Espaçamento entre seções                    |
| `space-xl` | 32         | Margens de página, grandes blocos de conteúdo |

## 6. Ícones

Os ícones devem ser consistentes em estilo (linha, preenchido, etc.) e tamanho. Recomenda-se o uso de uma biblioteca de ícones unificada.

*   **Biblioteca:** Font Awesome, Material Icons ou uma biblioteca de ícones personalizada.
*   **Tamanhos:** 16px, 20px, 24px.

## 7. Acessibilidade

A acessibilidade é fundamental para garantir que todos os usuários possam interagir com o sistema. Algumas diretrizes importantes incluem:

*   **Contraste de Cores:** Garantir que o texto e os elementos interativos tenham contraste suficiente com o fundo, especialmente em dark mode [3].
*   **Navegação por Teclado:** Todos os elementos interativos devem ser acessíveis e operáveis via teclado.
*   **Textos Alternativos:** Fornecer descrições para imagens e elementos não textuais.
*   **Tamanhos de Fonte Ajustáveis:** Permitir que os usuários ajustem o tamanho da fonte.

## Referências

[1] [Dashboard Design Lab: Week 4 — Fonts & Typography](https://ericbalash.medium.com/dashboard-design-lab-week-4-fonts-typography-5ab031e7290e)
[2] [24 Best Fonts for Websites in 2026](https://www.figma.com/resource-library/best-fonts-for-websites/)
[3] [Dark Mode Font Readability: Best Practices & Tips](https://raisproject.com/dark-mode-font-readability/)
