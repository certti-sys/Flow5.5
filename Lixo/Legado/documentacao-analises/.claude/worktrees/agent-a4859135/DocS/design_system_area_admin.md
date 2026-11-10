# Design System para Área Administrativa

## Objetivo
Padronizar a interface administrativa da aplicação para reduzir inconsistências visuais, melhorar legibilidade e orientar a IDE Antigravity a gerar interfaces mais previsíveis, consistentes e fáceis de manter.

Este design system foi pensado para funcionar com um sistema próprio de personalização de cores. Por isso, as regras abaixo **não dependem de uma paleta fixa**, e sim de estrutura, tipografia, espaçamento, hierarquia, comportamento e padrões de componentes.

---

## 1. Princípios do sistema

### 1.1 Clareza antes de efeito visual
A área administrativa deve priorizar leitura, escaneabilidade e ação rápida.

### 1.2 Consistência antes de criatividade
A Antigravity deve seguir blocos previsíveis. Sempre que houver dúvida entre duas abordagens, escolher a que mais repete o padrão existente.

### 1.3 Densidade controlada
Dashboard administrativo pode ter muitas informações, mas nunca deve parecer apertado ou caótico.

### 1.4 Componentização rígida
Toda tela deve ser composta por blocos reutilizáveis, com nomes, tamanhos e comportamentos definidos.

### 1.5 Cor como camada opcional
A cor reforça estado e identidade, mas não deve ser o principal elemento de organização da interface.

---

## 2. Diagnóstico visual com base nas referências

Os modelos enviados mostram um padrão forte em comum:

- navegação lateral bem definida
- cabeçalho simples e funcional
- cards com bordas suaves
- espaçamento amplo
- blocos organizados em grid
- tipografia limpa e hierarquia clara
- gráficos e métricas com protagonismo
- poucos tamanhos visuais competindo entre si

No print atual do sistema, a estrutura base já existe, mas o que precisa ser corrigido é o nível de padronização entre:

- títulos
- métricas
- cards
- gráficos
- barra lateral
- filtros
- áreas de ação
- respiros entre seções

O objetivo do novo design system não é redesenhar tudo do zero. É **criar regras fixas para o que já existe**, reduzindo improviso visual.

---

## 3. Estrutura visual base da aplicação

### 3.1 Layout padrão
Toda tela administrativa deve seguir esta estrutura:

1. **Sidebar fixa**
2. **Topbar funcional**
3. **Área principal com grid de conteúdo**
4. **Cards padronizados**
5. **Seções com títulos e ações secundárias**

### 3.2 Largura e respiro
- largura máxima do conteúdo principal: `1440px`
- padding lateral da área principal: `24px`
- padding superior e inferior: `24px`
- espaçamento entre seções grandes: `24px`
- espaçamento entre cards no grid: `16px`

### 3.3 Grid
Usar grid de 12 colunas como padrão estrutural.

Regras práticas:
- cards pequenos: 3 colunas
- cards médios: 4 a 6 colunas
- gráficos principais: 8 colunas
- blocos auxiliares: 4 colunas
- tabelas grandes: 12 colunas

---

## 4. Tipografia

A tipografia precisa ser o pilar central do sistema, porque é ela que impede a sensação de desordem.

### 4.1 Fonte recomendada
Escolher apenas **uma família tipográfica sans-serif** para todo o sistema.

Boas opções:
- Geist
- Inter
- Manrope
- Plus Jakarta Sans

### 4.2 Recomendação principal
**Geist** como padrão principal.

Motivos:
- visual ultra-moderno, premium e sofisticado
- excelente legibilidade em dashboards e tabelas
- espaçamento e kerning otimizados para sistemas web
- total consistência entre área administrativa e do cliente

### 4.3 Escala tipográfica

#### Título de página
- tamanho: `28px`
- peso: `600`
- line-height: `36px`

#### Título de seção
- tamanho: `20px`
- peso: `600`
- line-height: `28px`

#### Título de card
- tamanho: `16px`
- peso: `600`
- line-height: `24px`

#### Texto principal
- tamanho: `14px`
- peso: `400`
- line-height: `22px`

#### Texto secundário
- tamanho: `13px`
- peso: `400`
- line-height: `20px`

#### Legenda / meta informação
- tamanho: `12px`
- peso: `500`
- line-height: `18px`

#### Números de destaque
- tamanho: `32px`
- peso: `700`
- line-height: `36px`

#### Métricas compactas
- tamanho: `24px`
- peso: `700`
- line-height: `28px`

### 4.4 Regras tipográficas
- evitar usar mais de 5 tamanhos de fonte na mesma tela
- evitar peso 800 ou 900
- não usar texto muito claro com contraste baixo
- labels e metas devem ser discretos, mas legíveis
- números financeiros devem usar alinhamento consistente

---

## 5. Espaçamento

O espaçamento deve ser baseado em uma escala fixa de 4 pontos.

### 5.1 Escala
- `4`
- `8`
- `12`
- `16`
- `20`
- `24`
- `32`
- `40`
- `48`

### 5.2 Regras práticas
- entre ícone e texto: `8px`
- entre título e subtítulo: `4px` ou `8px`
- padding interno de card: `20px` ou `24px`
- entre grupos dentro do card: `16px`
- entre cards no dashboard: `16px`
- entre blocos maiores: `24px` ou `32px`

---

## 6. Bordas, superfícies e profundidade

### 6.1 Border radius
Definir poucos raios e repetir sempre:
- cards principais: `16px`
- inputs e botões: `12px`
- elementos compactos: `10px`
- pills e badges: `999px`

### 6.2 Bordas
- usar borda sutil para separar elementos
- não depender apenas de sombra para definir container
- espessura padrão: `1px`

### 6.3 Sombra
Sombras devem ser discretas.

Padrão:
- usar sombra leve apenas em cards, dropdowns e modais
- evitar glow exagerado
- evitar múltiplas sombras competindo entre si

---

## 7. Sidebar

### 7.1 Estrutura
A sidebar deve ser previsível e estável.

Composição:
- logo
- agrupamentos de navegação
- item ativo
- item simples
- área inferior com ações secundárias

### 7.2 Regras visuais
- largura recomendada: `240px` a `264px`
- ícones sempre com o mesmo tamanho
- altura dos itens: `40px` a `44px`
- padding horizontal do item: `12px` a `14px`
- item ativo com destaque de fundo, nunca apenas por cor do texto

### 7.3 Comportamento
- no desktop, sidebar fixa
- no tablet, modo recolhível
- sempre manter consistência de grupos e ordem

---

## 8. Topbar

### 8.1 Estrutura recomendada
- título ou breadcrumb
- campo de busca opcional
- filtros globais
- notificações
- avatar / menu do usuário

### 8.2 Regras
- altura: `64px` a `72px`
- não lotar com botões demais
- ações globais à direita
- filtros de contexto próximos ao conteúdo que afetam

---

## 9. Cards

Os cards serão a base do sistema. Se eles estiverem bem definidos, a Antigravity tende a repetir corretamente.

### 9.1 Estrutura padrão de card
1. cabeçalho
2. conteúdo principal
3. meta informação ou ação secundária

### 9.2 Variações oficiais

#### Card de métrica
Usado para faturamento, vendas, ticket médio, conversão.

Estrutura:
- label
- valor principal
- variação ou status
- contexto opcional

#### Card de gráfico
Usado para barras, linha, área, heatmap.

Estrutura:
- título
- filtro opcional
- gráfico
- legenda opcional

#### Card de lista
Usado para pedidos, clientes, eventos, atividades.

Estrutura:
- título
- ação secundária
- lista de itens

#### Card de tabela
Usado para dados estruturados.

Estrutura:
- título
- filtros ou ações
- tabela
- paginação

### 9.3 Regras universais para cards
- padding interno padrão: `24px`
- cabeçalho sempre presente
- não misturar muitos tipos de informação no mesmo card
- máximo de uma ação principal por card
- usar altura mínima consistente por categoria

---

## 10. Botões

### 10.1 Hierarquia
Definir apenas 3 níveis:
- primário
- secundário
- fantasma

### 10.2 Tamanhos
- pequeno: `32px`
- médio: `40px`
- grande: `48px`

### 10.3 Regras
- borda arredondada consistente
- ícone opcional sempre antes do texto ou isolado
- evitar mais de 2 botões fortes competindo na mesma área

---

## 11. Inputs e filtros

### 11.1 Padrão
Todos os campos devem seguir o mesmo container visual.

### 11.2 Alturas
- input padrão: `40px`
- input denso: `36px`
- input grande: `48px`

### 11.3 Regras
- label acima do campo quando contexto exigir
- placeholder nunca substitui label importante
- filtro de período, status e busca devem ter estilo unificado

---

## 12. Tabelas

### 12.1 Estrutura
- cabeçalho com peso 600
- linhas com altura consistente
- zebra opcional leve
- ações alinhadas à direita

### 12.2 Medidas
- altura de linha: `44px` a `52px`
- padding horizontal das células: `12px` a `16px`

### 12.3 Regras
- nunca usar mais de 2 níveis de destaque por linha
- status em badge padronizada
- números alinhados à direita
- textos longos com truncamento e tooltip

---

## 13. Gráficos

### 13.1 Regras de uso
- cada gráfico deve responder uma pergunta clara
- evitar excesso de linhas, legendas e rótulos ao mesmo tempo
- usar títulos objetivos

### 13.2 Padrão visual
- grid sutil
- eixo discreto
- legenda compacta
- tooltip consistente
- cantos e espessuras padronizados

### 13.3 Tipos permitidos
- barras para comparação
- linha para evolução temporal
- área para tendência agregada
- donut apenas para proporções simples
- heatmap só quando houver leitura real de intensidade

---

## 14. Estados visuais

Todo componente deve prever os estados:
- default
- hover
- focus
- active
- disabled
- loading
- empty
- error
- success

### 14.1 Regra crítica
A Antigravity não deve inventar estados visuais novos. Cada componente precisa ter seu estado previamente definido.

---

## 15. Ícones

### 15.1 Padrão
- usar apenas uma biblioteca
- tamanho padrão: `16px`, `18px`, `20px`
- espessura consistente

### 15.2 Regra
Ícone é apoio, não protagonista.

---

## 16. Tokens de design

Como o sistema tem personalização própria de cores, o ideal é trabalhar com **tokens semânticos**, e não valores fixos espalhados.

### 16.1 Tokens obrigatórios

#### Tipografia
- `font.family.base`
- `font.size.xs`
- `font.size.sm`
- `font.size.md`
- `font.size.lg`
- `font.size.xl`
- `font.weight.regular`
- `font.weight.medium`
- `font.weight.semibold`
- `font.weight.bold`

#### Espaçamento
- `space.1 = 4`
- `space.2 = 8`
- `space.3 = 12`
- `space.4 = 16`
- `space.5 = 20`
- `space.6 = 24`
- `space.8 = 32`

#### Radius
- `radius.sm = 10`
- `radius.md = 12`
- `radius.lg = 16`
- `radius.full = 999`

#### Tamanho
- `size.sidebar`
- `size.topbar`
- `size.input.md`
- `size.button.md`
- `size.card.padding`

#### Superfície
- `surface.base`
- `surface.card`
- `surface.elevated`
- `border.default`
- `border.strong`

#### Texto
- `text.primary`
- `text.secondary`
- `text.muted`
- `text.inverse`

#### Feedback
- `state.success`
- `state.warning`
- `state.error`
- `state.info`

---

## 17. Regras para a Antigravity

Estas regras devem ser tratadas como instruções fixas para geração de interface.

### 17.1 Regras obrigatórias
- usar sempre grid de 12 colunas
- usar apenas os componentes documentados
- nunca criar variações não aprovadas de card, botão, input ou tabela
- respeitar a escala tipográfica definida
- respeitar a escala de espaçamento definida
- priorizar legibilidade e contraste
- evitar excesso de elementos decorativos
- manter sidebar, topbar e cards dentro dos padrões oficiais
- repetir estruturas em vez de reinventar layouts
- usar títulos curtos e labels objetivas

### 17.2 Regra de ouro
**Se um componente ou layout já existe no design system, ele deve ser reutilizado em vez de recriado.**

---

## 18. Padrão recomendado para dashboard administrativo

### 18.1 Ordem visual
1. título da página
2. filtros globais
3. cards de KPI
4. gráfico principal
5. gráficos secundários ou listas
6. tabela detalhada

### 18.2 KPIs principais
Usar cards pequenos com:
- label curta
- valor em destaque
- indicador de contexto

### 18.3 Área analítica principal
Sempre reservar o maior bloco visual para o gráfico ou tabela mais relevante da tela.

---

## 19. Checklist de consistência

Antes de aprovar qualquer tela, validar:

- a fonte é a padrão oficial?
- os tamanhos de texto seguem a escala?
- os cards usam o mesmo padding?
- os títulos seguem a mesma hierarquia?
- os botões seguem os 3 níveis definidos?
- os inputs têm mesma altura e raio?
- a sidebar segue a largura oficial?
- há respiro suficiente entre blocos?
- as informações estão agrupadas corretamente?
- o layout parece sistema, e não landing page?

---

## 20. Direção prática para seu sistema atual

Para o seu caso, eu recomendo a seguinte linha de implementação:

### Fase 1
Congelar a estrutura atual e padronizar:
- tipografia
- espaçamento
- cards
- sidebar
- topbar
- botões
- inputs

### Fase 2
Padronizar módulos de dados:
- tabelas
- badges de status
- filtros
- KPIs
- gráficos

### Fase 3
Transformar tudo em biblioteca de componentes e tokens para a Antigravity consumir.

---

## 21. Recomendação final

O caminho mais seguro não é buscar um visual muito artístico. É criar um sistema administrativo com estas características:

- sóbrio
- legível
- modular
- previsível
- escalável
- baseado em componentes
- independente de cor fixa

A referência mais adequada entre os prints enviados é a combinação entre:
- estrutura densa e organizada dos dashboards escuros
- clareza e respiro do modelo claro
- foco em cards bem definidos e hierarquia tipográfica forte

Seu sistema atual pode evoluir muito sem recomeçar do zero. O ponto central é transformar o que hoje está solto em um conjunto de regras fixas.

---

## 22. Próximo passo recomendado

Criar imediatamente estes artefatos:

1. **Primitivos do design system**
   - tipografia
   - espaçamento
   - radius
   - elevação
   - tokens semânticos

2. **Componentes base**
   - button
   - input
   - select
   - badge
   - card
   - table
   - sidebar item
   - topbar action

3. **Templates oficiais**
   - dashboard de vendas
   - listagem com tabela
   - tela de detalhes
   - tela com formulário
   - tela com gráficos e filtros

4. **Prompt de governança para a Antigravity**
   - instruções fixas para impedir variações fora do padrão

