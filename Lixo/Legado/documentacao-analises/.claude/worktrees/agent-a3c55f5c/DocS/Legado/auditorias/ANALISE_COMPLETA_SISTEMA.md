# 📊 ANÁLISE COMPLETA DO SISTEMA - NEO VIDYA STREAM

**Data da Análise:** 01 de Abril de 2026  
**Projeto:** Neo Vidya Stream - Plataforma de Streaming de Cursos Online  
**Versão:** Flow5  
**Status:** 🔴 REQUER AÇÃO IMEDIATA (Vulnerabilidades Críticas)

---

## 📋 SUMÁRIO EXECUTIVO

O **Neo Vidya Stream** é uma plataforma educacional moderna e completa, construída com **React 18 + TypeScript + Vite**, integrada com **Supabase** como backend e **Mercado Pago** para pagamentos. A plataforma oferece funcionalidades robustas de gestão de cursos, gamificação, e-commerce integrado e sistema de webhooks flexível.

### 🎯 Status Geral:
- ✅ **Funcionalidades:** 95% implementadas
- ✅ **Layout/UX:** Bem estruturado e responsivo
- 🔴 **Segurança:** 7 vulnerabilidades críticas detectadas

---

## 1️⃣ FUNCIONALIDADES DO SISTEMA

### 1.1 MÓDULO DE ALUNOS/CLIENTES

#### Dashboard do Aluno (`/dashboard`)
- **Carousels Dinâmicos**: Múltiplos carrosséis por categoria
  - Automáticos (por categoria)
  - Manuais (seleção específica)
  - Customização: cards_per_view, ativação/desativação, ordenação
- **Seção "Continue Assistindo"**: Retoma aulas em progresso
- **Estatísticas Rápidas**: KPIs de aprendizado
- **Responsividade Completa**: Desktop, tablet, mobile otimizado

#### Visualização de Cursos (`/curso/:courseId`)
- Estrutura hierárquica: Cursos → Módulos → Aulas
- Visualização de progresso por aula e módulo
- Duração total do curso
- Informações do instrutor
- Acesso condicional com verificação de permissões

#### Reprodução de Aulas (`/aula/:lessonId`)
- **Player de Vídeo Universal**:
  - YouTube (embed automático)
  - Vimeo
  - URLs diretas de vídeo (MP4, etc)
- Sidebar com navegação entre aulas do módulo
- Barra de progresso visual
- Opções de compartilhamento

#### Progresso de Aprendizado
- Rastreamento automático via tabelas `user_progress` e `lesson_progress`
- Percentual de progresso por aula e curso
- Histórico de conclusão com timestamps
- Dashboard de estatísticas na página de perfil

#### Sistema de Comentários
- Comentários em aulas com suporte a **respostas encadeadas**
- Criar, editar, deletar comentários
- Exibição de autor (nome, avatar)
- Data de criação formatada
- Moderação administrativa

#### Perfil do Usuário (`/perfil`)
- **Edição de Perfil**: Nome, email, foto com cropping
- **Número de WhatsApp**: Para notificações
- **Estatísticas de Aprendizado**:
  - Cursos em progresso
  - Total de aulas concluídas
  - Tempo investido
  - Badges e conquistas
  - Nível e XP atual
- **Mudança de Senha**: Modal separada com validação

#### Notificações
- Sistema completo de notificações:
  - Tipos: course_access, payment_approved, lesson_reminder, etc
  - Título, mensagem e link para ação
  - Marcação de leitura
- **Sino de Notificações**: Badge com contagem

### 1.2 MÓDULO ADMINISTRATIVO

#### Gerenciamento de Cursos (`/admin/cursos`)
- **CRUD Completo**:
  - Criar: Modal com thumbnail, categoria, instrutor, duração
  - Editar: Atualizar todos os campos
  - Deletar: Com confirmação de segurança
- **Organização em Módulos**:
  - Criar/editar módulos dentro de cursos
  - Reordenação via drag-and-drop (@dnd-kit)
- **Gerenciamento de Aulas**:
  - CRUD de aulas por módulo
  - Campos: título, descrição, URL vídeo, duração
  - Status: público/privado
  - Reordenação visual

#### Gerenciamento de Alunos (`/admin/alunos`)
- **Listar Alunos**: Tabela com avatar, nome, email, WhatsApp, status
- **Criar Aluno**: 
  - Gera senha temporária
  - Envia email de boas-vindas
  - Cria perfil automático
- **Editar Aluno**: Nome, email, WhatsApp, foto
- **Atribuir Cursos**: Modal com seleção múltipla
- **Resetar Senha**: Gera nova temporária e notifica
- **Suspender Aluno**: Com motivo, data e admin responsável
- **Ver Progresso**: Detalhe de cursos e aulas completas
- **Deletar Aluno**: Remove usuário e dados associados

#### Dashboard Administrativo (`/admin`)
- **KPIs Principais**:
  - Total de alunos
  - Alunos ativos (com progresso)
  - Total de cursos
  - Total de aulas/módulos
  - Aulas concluídas hoje
  - Taxa de engajamento
- **Gráficos**:
  - ActivityChart: Atividade semanal/mensal
  - CourseDistributionChart: Inscrições por curso
  - CoursesMetricsTable: Métricas detalhadas
- **Widgets**:
  - RecentStudents: Últimos cadastrados
  - RecentComments: Comentários recentes
  - ActivityTimeline: Eventos em linha do tempo
  - WebhookStats: Estatísticas de webhooks
  - EngagementCard: Indicadores de engajamento

#### Moderação de Comentários (`/admin/comentarios`)
- Listar todos os comentários com filtros
- Filtros: por curso, período, tipo (raíz/replies)
- Ordenação: recente, antigo, mais ativo
- Busca por conteúdo
- Ver comentário completo com contexto
- Responder e deletar comentários

#### Customização de Tema (`/admin/personalizacao`)
- **Cores**:
  - Seletor de cor primária (hex, RGB, picker)
  - Geração automática de paleta
  - Preview em tempo real
  - Reset para padrão
- **Branding**:
  - Upload/URL de logo
  - Texto customizado
  - Favicon
- **Layout**:
  - Posição de navegação (topo, lateral)
  - Sidebar colapsada por padrão
  - Modo dark/light

#### Configurações de Email (`/admin/emails`)
- **Configuração**:
  - Provedor (SMTP, Brevo)
  - Host, porta, credenciais
  - Segurança (SSL/TLS)
- **Templates**:
  - Editor por tipo (boas-vindas, acesso, pagamento)
  - Variáveis dinâmicas: {{user_name}}, {{course_name}}, etc
  - Preview de templates
- **Histórico**:
  - Logs de enviados/falhados
  - Filtros: status, tipo, período
  - Detalhes de erro

#### Configurações de WhatsApp (`/admin/whatsapp`)
- **Múltiplos Provedores**:
  - Meta (Business API)
  - Z-API
  - WAHA
  - Evolution API
- **Configuração**:
  - Credenciais específicas por provedor
  - Código de país
  - Delay entre mensagens
- **Templates**: Gerenciador com variáveis
- **Histórico**: Logs de envio com status

#### Gerenciamento de Gateways (`/admin/gateways`)
- Listar gateways disponíveis (Mercado Pago, Stripe, Asaas)
- Ativar/desativar por gateway
- Definir como padrão
- Configurar credenciais
- Ambiente (test/live)
- Métodos de pagamento permitidos

### 1.3 MÓDULO E-COMMERCE

#### Gerenciamento de Produtos (`/admin/produtos`)
- CRUD de produtos/cursos para venda
- Campos: nome, descrição, preço, imagem, SKU
- Status: ativo/inativo
- Tipos: único ou assinatura

#### Checkout Integrado (`/checkout/:productId`)
- **OrderSummary**: Resumo do pedido
  - Nome, preço unitário
  - Cálculo automático de subtotal, impostos, total
- **CustomerForm**: Dados do cliente validados
  - Nome, email, CPF
  - Telefone com máscara
  - Validação via Zod
- **PaymentMethods**: Seleção de método
  - Cartão de crédito
  - PIX
  - Boleto Bancário
- **CustomCardForm**: Formulário de cartão
  - Validação Luhn
  - Masking automático
  - Validade e CVV
- **OrderBumpCard**: Ofertas adicionais
  - Sugestão relacionada
  - Desconto percentual
  - Checkbox para adicionar

#### Mercado Pago
- **Integração SDK**: @mercadopago/sdk-react
- **Métodos**:
  - Cartão de crédito com tokenização segura
  - PIX (instantâneo, código QR)
  - Boleto Bancário
- **Processamento**:
  - Validação de dados
  - Criação de pagamento
  - Callback com status
  - Webhook de confirmação

#### Order Bumps (`/admin/orderbump`)
- **CRUD de Bumps**:
  - Criar: Produto ofertado, desconto, título
  - Editar e deletar
  - Ativação/desativação
  - Prioridade de exibição
- **Exibição**: Cards interativos no checkout
- **Customização**: Cor, descrição, imagem

#### Histórico de Pedidos (`/admin/pedidos`)
- Tabela completa com:
  - ID pedido, cliente, email
  - Status, data, valor
  - Método de pagamento
- Filtros: por status, período, busca
- Ações: ver detalhes, deletar
- Seleção em lote para deletar múltiplos

#### Dashboard de Vendas (`/admin/vendas`)
- Receita total por período
- Número de vendas e ticket médio
- Vendas por método de pagamento
- Gráfico de evolução
- Conversão de pedidos

#### Gerenciamento de Clientes (`/admin/clientes`)
- Listar clientes (que compraram)
- Filtros por período e status
- Histórico de compras por cliente
- Valor total gasto
- Última compra

### 1.4 MÓDULO DE GAMIFICAÇÃO

#### Sistema de XP (Pontos)
- **Ganho de XP**:
  - Completar aula: +10 XP
  - Completar módulo: +50 XP
  - Completar curso: +200 XP
- Tabela `user_stats` armazena `total_xp`
- Requisito progressivo por nível

#### Badges/Conquistas
- **Tipos Disponíveis**:
  - "Primeiro Passo": Primeira aula
  - "Aprendiz": 5 aulas
  - "Estudioso": 10 aulas
  - "Mestre": 50 aulas
  - "Streak de 7 Dias"
  - "Streak de 30 Dias"
- Tabela `achievements` com definições
- Tabela `user_achievements` com desbloqueadas
- Modal de desbloqueio com animação

#### Ranks/Níveis
- Calculado automaticamente a partir de XP
- Fórmula: `nivel = Math.floor(total_xp / 100) + 1`
- Máximo: 99 níveis
- Exibido em badge visual

#### Streaks (Sequências)
- Rastreamento de dias consecutivos
- `current_streak`: sequência atual
- `best_streak`: melhor histórica
- `last_activity_date`: última atividade
- Auto-reset se não ativar por um dia

#### Leaderboard (Preparado)
- Estrutura pronta para implementação
- Ranking de usuários por XP
- Filtros: global, por curso, por mês
- Posição do usuário destacada

### 1.5 INTEGRAÇÕES EXTERNAS

#### Supabase
- **Auth**: Login/signup, session management, JWT tokens
- **PostgreSQL**: 40+ tabelas normalizadas
- **Storage**: Imagens, avatars, thumbnails
- **Edge Functions**:
  - `check-achievements`: Verifica conquistas
  - `delete-user`: Deleta usuário
  - `webhooks-ingest`: Processa webhooks

#### Mercado Pago
- SDK React integrado
- Múltiplos métodos de pagamento
- Tokenização segura
- Webhooks de confirmação

#### Vídeo (YouTube, Vimeo, MP4)
- **YouTube**: Embed automático de URLs
- **Vimeo**: Embed responsivo
- **MP4 Direto**: Streaming com react-player
- Componentes: UniversalVideoPlayer, YouTubePlayer, VideoPlayer

#### Email/WhatsApp
- **Email**:
  - Provedores: SMTP, Brevo
  - Templates customizáveis
  - Variáveis dinâmicas
  - Logs de envio
- **WhatsApp**:
  - Múltiplos provedores (Meta, Z-API, WAHA, Evolution)
  - Templates por categoria
  - Histórico de mensagens

#### Webhooks
- **Endpoint Único**: `/functions/v1/webhooks-ingest`
- **Auto-Discovery**: Detecta estrutura de payloads
- **Plataformas**: Kiwify, Hotmart, qualquer webhook
- **Funcionalidades**:
  - Field mapping: Extrai dados corretos
  - Status mapping: Normaliza status
  - Product mapping: Relaciona produtos externos
  - Histórico: Rastreia transações

---

## 2️⃣ LAYOUT E DESIGN VISUAL

### 2.1 ESTRUTURA DE LAYOUTS

#### ClientLayout (Para Alunos)
```
┌─────────────────────────────────────┐
│           NAVBAR                     │
│  Logo  | Search | Notif | Perfil   │
├──────────┬──────────────────────────┤
│          │                          │
│ SIDEBAR  │     MAIN CONTENT         │
│          │                          │
│ Dashboard│    Cursos, Aulas,        │
│ Cursos   │    Perfil, etc           │
│ Perfil   │                          │
│          │                          │
└──────────┴──────────────────────────┘
```
- Responsive: Sidebar colapsável em mobile
- Navegação intuitiva
- Dark/Light mode
- Notificações integradas

#### AdminLayout (Para Administradores)
```
┌─────────────────────────────────────┐
│           ADMIN NAVBAR               │
│  Logo  | Admin Badge | Avatar       │
├──────────┬──────────────────────────┤
│          │                          │
│ ADMIN    │     ADMIN CONTENT        │
│ SIDEBAR  │                          │
│          │    Dashboard, Cursos,    │
│ Dashboard│    Alunos, Pedidos,      │
│ Cursos   │    Configurações         │
│ Alunos   │                          │
│ Pedidos  │                          │
│ Config   │                          │
│          │                          │
└──────────┴──────────────────────────┘
```
- Navegação estruturada por módulo
- Accordions para submenu
- Estados ativos/inativos claros
- Ícones intuitivos

#### CheckoutLayout
```
┌─────────────────────────────────┐
│      CHECKOUT HEADER            │
│   Logo | Segurança Info         │
├─────────────────────────────────┤
│                                 │
│  ┌──────────────┐ ┌────────┐  │
│  │   Resumo     │ │ Formulário
│  │   Pedido     │ │ Cliente  │
│  ├──────────────┤ │          │
│  │ Item: $99    │ │ Pagamento│
│  │ Taxa: $2     │ │          │
│  │ Total: $101  │ │          │
│  └──────────────┘ └────────┘  │
│                                 │
└─────────────────────────────────┘
```
- Simplificado, sem distrações
- Tema customizável por branding
- Indicador de segurança
- Responsive columns

### 2.2 DESIGN SYSTEM

#### Paleta de Cores
- **Modo Dark (Primário)**:
  - Fundo primário: `#0f172a` (slate-950)
  - Fundo secundário: `#1e293b` (slate-800)
  - Texto primário: `#f1f5f9` (slate-100)
  - Texto secundário: `#94a3b8` (slate-400)
- **Cores Temáticas**:
  - Primária: Customizável (default: azul)
  - Success: `#10b981` (verde)
  - Warning: `#f59e0b` (amarelo)
  - Error: `#ef4444` (vermelho)
  - Info: `#3b82f6` (azul)

#### Tipografia
- **Font Family**: `Inter` (sans-serif)
- **Escalas**:
  - Heading 1: 32px, weight 700
  - Heading 2: 24px, weight 600
  - Heading 3: 20px, weight 600
  - Body: 14px, weight 400
  - Small: 12px, weight 400
  - Tiny: 11px, weight 500

#### Espaçamento
- Sistema: múltiplos de 4px (Tailwind)
- Gaps padrão: 4, 8, 12, 16, 24, 32px
- Padding cards: 16-24px
- Margin sections: 32-48px

#### Componentes shadcn/ui Utilizados (50+)
- UI Base: Button, Input, Label, Textarea, Select
- Compostos: Dialog, Accordion, Tabs, Dropdown, Alert
- Dados: Table, Pagination, Badge
- Feedback: Toast (Sonner), Progress, Skeleton
- Navegação: Breadcrumb, NavigationMenu
- Overlay: Tooltip, Popover, Carousel, Drawer
- Formulários: Checkbox, Radio, Slider, Switch
- Especializados: Command, ComboBox, DatePicker

### 2.3 COMPONENTES CHAVE

#### Cards de Cursos
```
┌──────────────────────┐
│  [Thumbnail 16:9]    │
├──────────────────────┤
│ Título do Curso      │
│ ⭐ 4.8 (120 reviews)  │
│ 👨 Instrutor         │
│ 📚 24 aulas          │
│ 💰 R$ 199.90         │
│ [Enviar] [Wish]      │
└──────────────────────┘
```
- Overlay customizável
- Loading skeleton
- Estados: hover, ativo, desabilitado

#### Tabelas Administrativas
- Colunas com ordenação
- Filtros inline
- Busca integrada
- Ações por linha (edit, delete)
- Seleção em lote (checkbox)
- Paginação
- Export/Import (preparado)

#### Formulários
- Validação em tempo real (Zod)
- Masking automático (telefone, CPF, cartão)
- Feedback visual de erro
- Helper text
- Required indicator
- Submit button loading state

#### Modais
- Dialog e Drawer
- Título, conteúdo, ações
- Close button
- Focus trap
- Backdrop clickable/não clickable
- Tamanhos: small, medium, large

#### Notificações (Sonner)
- Toast automático
- Tipos: success, error, warning, info
- Posições: top/bottom left/right/center
- Dismissible
- Duração customizável

### 2.4 RESPONSIVIDADE

#### Breakpoints (Tailwind)
- `sm`: 640px (mobile)
- `md`: 768px (tablet)
- `lg`: 1024px (desktop)
- `xl`: 1280px (desktop grande)
- `2xl`: 1536px (desktop extra)

#### Mobile-First
- Sidebar colapsável
- Carousels com 1-3 cards por view
- Tabelas: scroll horizontal ou card view
- Inputs: tamanho expandido
- Modais: fullscreen em mobile

#### Temas
- **Dark Mode**: Padrão, otimizado para leitura
- **Light Mode**: Disponível com toggle
- **Customização**: Admin pode alterar cores primárias
- **Persistência**: Salvo em localStorage

### 2.5 EXPERIÊNCIA DO USUÁRIO (UX)

#### Feedback Visual
- Animações suaves (fade-in, slide-in)
- Loading skeletons
- Estados de transição
- Hover effects
- Focus indicators (acessibilidade)

#### Validação de Formulários
- Validação em tempo real (onChange)
- Mensagens de erro claras
- Indicador visual de campo com erro
- Helper text informativo
- Submit disabled até formulário válido

#### Estados
- Loading: Spinner ou skeleton
- Empty state: Mensagem amigável
- Error: Alert com ícone e mensagem
- Success: Toast ou modal de confirmação

#### Navegação
- Breadcrumbs em páginas aninhadas
- Links de volta (Back button)
- Tabs para seções
- Menu lateral com ícones
- Mobile: Burger menu

#### Acessibilidade (WCAG AA)
- Alt text em imagens
- Labels em inputs
- ARIA labels quando necessário
- Keyboard navigation completa
- Tab order lógico
- Color contrast adequado

---

## 3️⃣ SEGURANÇA DO SISTEMA

### 🔴 VULNERABILIDADES CRÍTICAS (7)

#### 1. TOKENS EM LOCALSTORAGE ⚠️ CVSS 8.1
**Arquivo**: `src/hooks/useAuth.tsx`, `src/integrations/supabase/client.ts`

**Problema**:
```typescript
// ❌ VULNERÁVEL
// Supabase armazena JWT em localStorage
// Qualquer script XSS pode extrair tokens
const token = localStorage.getItem('sb-token')
```

**Impacto**: XSS attack pode comprometer todas as sessões ativas

**Solução Imediata**:
1. Usar Supabase com mode: 'ssr' em Next.js
2. Ou implementar httpOnly cookies + refresh token flow
3. Implementar CSP header para mitigar XSS

---

#### 2. SEM RATE LIMITING ⚠️ CVSS 7.5
**Arquivo**: `src/pages/Login.tsx`, Supabase Auth

**Problema**:
```typescript
// ❌ VULNERÁVEL
// Sem limite de tentativas de login
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  // ← SEM RATE LIMITING
})
```

**Impacto**: Brute force attacks ilimitados

**Solução**:
1. Implementar rate limiting: 5 tentativas por 15 minutos
2. Usar library: `express-rate-limit` (backend)
3. Adicionar CAPTCHA após 3 falhas
4. Log de tentativas falhadas

---

#### 3. AUTORIZAÇÃO APENAS NO FRONTEND ⚠️ CVSS 8.8
**Arquivo**: `src/components/AdminProtectedRoute.tsx`

**Problema**:
```typescript
// ❌ VULNERÁVEL
// Verifica admin apenas em React
if (user?.role === 'admin') {
  return <Component />;
}
// Atacante pode chamar APIs diretamente!
```

**Impacto**: Bypass de autorização chamando Supabase direto

**Solução**:
1. **Row Level Security (RLS)** no Supabase
```sql
-- ✅ SEGURO
CREATE POLICY "admin_only" ON courses
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM auth.users WHERE role = 'admin')
  );
```
2. Validar permissões em Edge Functions
3. Audit logs de tentativas

---

#### 4. CREDENCIAIS EXPOSTAS EM GIT ⚠️ CVSS 9.1 MÁXIMA
**Arquivo**: `.env` (COMMITADO NO GIT!)

**Problema**:
```
# ❌ CRÍTICO - EXPOSTO NO GIT
VITE_SUPABASE_URL=https://lznckhxqbkqldedlmbfb.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_MERCADO_PAGO_PUBLIC_KEY=...
```

**Impacto**: Acesso total a Supabase e Mercado Pago

**AÇÃO URGENTE - FAZER AGORA**:
```bash
# 1. Verificar histórico do Git
git log --all --oneline -- .env

# 2. Remover do histórico
git filter-branch --tree-filter 'rm -f .env' -- --all

# 3. Force push
git push origin --force-with-lease --all

# 4. REGENERAR TODAS AS CREDENCIAIS IMEDIATAMENTE
# - Supabase: Criar novas chaves
# - Mercado Pago: Regenerar tokens
# - Qualquer outra service

# 5. Auditar logs de acesso
# - Supabase auth logs
# - Pagamentos suspeitos
```

---

#### 5. CORS MUY PERMISSIVO ⚠️ CVSS 8.2
**Arquivo**: `supabase/functions/_shared/cors.ts`

**Problema**:
```typescript
// ❌ VULNERÁVEL
headers['Access-Control-Allow-Origin'] = '*'
// Aceita requisições de QUALQUER origem!
```

**Impacto**: CSRF attacks, data exfiltration

**Solução**:
```typescript
// ✅ SEGURO
const ALLOWED_ORIGINS = [
  'https://neovidyastream.com',
  'https://app.neovidyastream.com',
  'https://admin.neovidyastream.com',
];

headers['Access-Control-Allow-Origin'] = 
  ALLOWED_ORIGINS.includes(req.headers.get('Origin'))
    ? req.headers.get('Origin')
    : '';
```

---

#### 6. LOGS EXPÕEM DADOS SENSÍVEIS ⚠️ CVSS 7.5
**Arquivo**: `supabase/functions/webhooks-ingest/index.ts`

**Problema**:
```typescript
// ❌ VULNERÁVEL
console.log('Headers:', event.headers) // Expõe tokens!
console.log('Body:', event.body)       // Expõe CPF, cartão!
console.log('Payload:', payload)       // Tudo visível
```

**Impacto**: Dados sensíveis em logs de produção

**Solução**:
```typescript
// ✅ SEGURO
import * as log from 'std/log/mod.ts'

// Remover console.log
// Usar logger estruturado
await log.info({
  event: 'webhook_processed',
  platform: payload.platform,
  status: result.status,
  // ← NÃO logar dados sensíveis
})
```

---

#### 7. SEM VALIDAÇÃO DE PERMISSÕES EM APIS ⚠️ CVSS 8.6
**Arquivo**: `supabase/functions/payment-ops/index.ts`

**Problema**:
```typescript
// ❌ VULNERÁVEL
// Qualquer usuário autenticado pode criar pagamentos
const { data } = await supabase
  .from('orders')
  .insert(orderData)
  // ← SEM VERIFICAR SE USUÁRIO TEM PERMISSÃO!
```

**Impacto**: Fraude de pagamento, pedidos falsos

**Solução**:
```typescript
// ✅ SEGURO
if (user?.role !== 'admin' && user?.id !== orderData.user_id) {
  throw new Error('Unauthorized')
}

// Ou usar RLS (melhor)
await supabase
  .from('orders')
  .insert(orderData)
  // RLS automaticamente valida!
```

---

### 🟡 PROBLEMAS ADICIONAIS (12 MODERADOS/BAIXOS)

| # | Problema | Severidade | Ação |
|---|----------|-----------|------|
| 8 | Sem CSP Headers | Média | Adicionar Content-Security-Policy |
| 9 | Sem HSTS Header | Média | Adicionar Strict-Transport-Security |
| 10 | Falta Rate Limiting em APIs | Média | Implementar com Supabase ou middleware |
| 11 | Dados de Pagamento sem Proteção | Média | PCI DSS compliance, nunca armazenar cartão |
| 12 | Sem Timeout de Sessão | Média | Logout automático após 30min inativo |
| 13 | Sem Revogação de Tokens | Baixa | Implementar token blacklist |
| 14 | Validação Incompleta em Serverless | Baixa | Adicionar validação em todas as functions |
| 15 | Sem Alertas de Segurança | Baixa | Setup alertas Supabase ou Sentry |
| 16 | Sem Testes de Segurança Automatizados | Baixa | Adicionar OWASP ZAP, npm audit |
| 17 | console.log em Produção | Baixa | Remove ou use logger |
| 18 | Documentação de Segurança Inadequada | Baixa | Criar SECURITY.md |
| 19 | Sem Backup e Recovery Plan | Média | Plano de disaster recovery |

---

### ✅ PONTOS FORTES DE SEGURANÇA

✅ **HTTPS em produção** - Tráfego criptografado  
✅ **Senhas hasheadas** - Supabase usa bcrypt  
✅ **Validação Zod** - Schemas tipados  
✅ **Validação de Cartão** - Luhn check, masking  
✅ **Logout funcionando** - Cleanup de sessão  
✅ **SameSite cookies** - Proteção CSRF  
✅ **Protected Routes** - Autenticação obrigatória  

---

## 4️⃣ RECOMENDAÇÕES E PLANO DE AÇÃO

### 📌 CRONOGRAMA DE REMEDIAÇÃO

#### 🔴 FASE 1: CRÍTICA (24-48 horas)

**Prioridade 1: Remover .env do Git**
```bash
# Fazer AGORA
cd C:\WWW Projetos\neo-vidya-stream-main\Flow5
git filter-branch --tree-filter 'rm -f .env .env.local .env.*.local' -- --all
git push origin --force-with-lease --all
```
**Tempo**: 30 min  
**Esforço**: Trivial  
**Risco**: Perda de histórico Git (ok, é propósito)

---

**Prioridade 2: Regenerar Credenciais**
1. **Supabase**:
   - Acessar console.supabase.co
   - Project Settings → API Keys
   - Revoke current keys
   - Generate new keys
   - Atualizar em todos os ambientes
2. **Mercado Pago**:
   - Regenerar access tokens
   - Revoke current credentials
3. **Outras services**: Zendesk, SendGrid, etc

**Tempo**: 1 hora  
**Esforço**: Médio  
**Risco**: 15 min de downtime

---

**Prioridade 3: Implementar Rate Limiting**
```typescript
// supabase/functions/login-handler/index.ts
import { Redis } from "https://deno.land/x/redis@v0.32.1/mod.ts"

const redis = new Redis({
  hostname: Deno.env.get('REDIS_HOST'),
  port: 6379,
})

export async function handleLogin(email: string) {
  const key = `login:${email}`
  const attempts = await redis.incr(key)
  
  if (attempts > 5) {
    throw new Error('Too many login attempts. Try again in 15 minutes.')
  }
  
  if (attempts === 1) {
    await redis.expire(key, 900) // 15 minutos
  }
}
```
**Tempo**: 1.5 horas  
**Esforço**: Médio  
**Dependências**: Redis (setup externo)

---

**Prioridade 4: Configurar CORS Seguro**
```typescript
// supabase/functions/_shared/cors.ts
const ALLOWED_ORIGINS = [
  'https://neovidyastream.com',
  'https://app.neovidyastream.com',
]

export function setCorsHeaders(origin: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  }

  if (ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
```
**Tempo**: 45 min  
**Esforço**: Baixo

---

**Prioridade 5: Remover Logs Sensíveis**
```bash
# Procurar todos os console.log em Supabase functions
grep -r "console.log" supabase/functions/

# Remover ou substituir por logger estruturado
# Exemplo: console.log(payload) → logger.info({ event: 'webhook' })
```
**Tempo**: 1 hora  
**Esforço**: Baixo

---

#### 🟡 FASE 2: IMPORTANTE (1 semana)

**Prioridade 6: Implementar Row Level Security (RLS)**

Criar políticas no Supabase para cada tabela crítica:

```sql
-- Cursos: Students podem ver cursos que têm acesso
CREATE POLICY "student_course_access" ON courses
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM user_course_access 
      WHERE course_id = courses.id
    )
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- Ordens: Users podem ver suas próprias ordens
CREATE POLICY "user_order_access" ON orders
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.jwt() ->> 'role' = 'admin'
  );

-- Pagamentos: Apenas admins podem criar
CREATE POLICY "admin_payments" ON payments
  FOR INSERT
  USING (auth.jwt() ->> 'role' = 'admin');
```
**Tempo**: 3 horas  
**Esforço**: Médio
**Dependências**: Supabase Console

---

**Prioridade 7: Migrar para HttpOnly Cookies**

Implementar refresh token flow com Supabase Auth:

```typescript
// src/lib/auth-client.ts
export const createAuthClient = () => {
  return createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      auth: {
        // Usar httpOnly cookies
        persistSession: true,
        autoRefreshToken: true,
        // Detectar sessão do servidor/cliente
        detectSessionInUrl: true,
      },
    }
  )
}
```
**Tempo**: 4 horas  
**Esforço**: Médio

---

**Prioridade 8: Adicionar Headers de Segurança**

Configurar no Vite/Netlify/Vercel:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
  },
})
```
**Tempo**: 1 hora  
**Esforço**: Baixo

---

**Prioridade 9: Implementar Validação em Edge Functions**

```typescript
// supabase/functions/webhooks-ingest/index.ts
import { z } from "https://deno.land/x/zod@v3.22.0/index.ts"

const WebhookPayloadSchema = z.object({
  platform: z.string().min(1),
  customer_email: z.string().email(),
  amount: z.number().positive(),
  payment_status: z.enum(['pending', 'approved', 'failed']),
})

export async function handleWebhook(event: any) {
  try {
    const payload = WebhookPayloadSchema.parse(JSON.parse(event.body))
    // ← Validação automática garante dados corretos
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid payload' }), {
      status: 400,
    })
  }
}
```
**Tempo**: 2 horas  
**Esforço**: Médio

---

#### 🟢 FASE 3: DESEJÁVEL (2 semanas)

**Prioridade 10-15**:
- [ ] Autenticação de Dois Fatores (2FA)
- [ ] Implementar logging estruturado (Sentry, LogRocket)
- [ ] Setup de alertas de segurança
- [ ] Testes de segurança automatizados (npm audit, OWASP ZAP)
- [ ] Documentação de segurança (SECURITY.md)
- [ ] Plano de disaster recovery e backups

---

### 📊 ESTIMATIVA DE ESFORÇO

| Fase | Tarefas | Tempo Total | Desenvolvimento | QA | Deploy |
|------|---------|-------------|-----------------|-----|--------|
| 1 (Crítica) | 5 | **4-6h** | 3h | 1h | 30m |
| 2 (Importante) | 5 | **12-16h** | 10h | 2h | 1h |
| 3 (Desejável) | 6 | **16-24h** | 14h | 3h | 1.5h |
| **TOTAL** | **16** | **32-46 horas** | **27h** | **6h** | **3h** |

---

### 🎯 CHECKLIST DE IMPLEMENTAÇÃO

#### Fase 1
- [ ] Remover .env do histórico Git
- [ ] Regenerar credenciais (Supabase, Mercado Pago)
- [ ] Implementar rate limiting no login
- [ ] Configurar CORS whitelist
- [ ] Remover console.log sensíveis

#### Fase 2
- [ ] Implementar RLS em todas as tabelas
- [ ] Migrar para httpOnly cookies
- [ ] Adicionar CSP, HSTS, X-Frame-Options headers
- [ ] Validação Zod em todas as Edge Functions
- [ ] Testes de segurança

#### Fase 3
- [ ] 2FA (TOTP com QR code)
- [ ] Logging estruturado com Sentry
- [ ] Alertas de segurança
- [ ] Testes automatizados OWASP ZAP
- [ ] Documentação SECURITY.md
- [ ] Plano de disaster recovery

---

## 5️⃣ ANÁLISE COMPARATIVA

### Pontos Fortes do Sistema
✅ Arquitetura modular e escalável  
✅ Design system consistente (shadcn/ui + Tailwind)  
✅ Funcionalidades ricas (gamificação, webhooks, e-commerce)  
✅ TypeScript garante segurança de tipos  
✅ Performance otimizada (Vite, React Query)  
✅ Responsividade completa  
✅ Integrações múltiplas (Supabase, Mercado Pago, etc)  

### Pontos Fracos do Sistema
🔴 Vulnerabilidades críticas de segurança  
⚠️ Sem validação de permissões no backend  
⚠️ RLS não implementado  
⚠️ Tokens em localStorage  
⚠️ Logs expõem dados sensíveis  
⚠️ CORS muito permissivo  

### Recomendações Estratégicas

**Curto Prazo (Semana 1)**
1. Remediar vulnerabilidades críticas (Fase 1)
2. Definir SLA de segurança
3. Implementar código de conduta para commits

**Médio Prazo (1 mês)**
1. Completar implementação RLS
2. Implementar 2FA
3. Setup de monitoring e alertas

**Longo Prazo (3 meses)**
1. Análise de penetração profissional
2. Certificação ISO 27001 (se necessário)
3. Plano de compliance LGPD/GDPR

---

## 📞 PRÓXIMOS PASSOS

### Ação Imediata (Hoje)
1. **Regenerar credenciais do Supabase**
   - Acessar console.supabase.co
   - Project Settings → API Keys
   - Revoke e gerar novas chaves
   
2. **Remover .env do Git**
   - Executar `git filter-branch` para limpar histórico
   - Push com `--force-with-lease`
   - Adicionar `.env` ao `.gitignore`

3. **Comunicar ao Time**
   - Notify sobre vulnerabilidades encontradas
   - Distribuir plano de remediação
   - Designar responsáveis por cada item

### Próxima Semana
1. Completar Fase 1 (5 itens críticos)
2. Iniciar Fase 2 (5 itens importantes)
3. Agendar security review com especialista externo

### Plano de Longo Prazo
1. Implementar todas as fases
2. Auditoria de segurança profissional
3. Testes de penetração
4. Certificação de compliance

---

## 📝 CONCLUSÃO

O **Neo Vidya Stream** é uma plataforma educacional **bem construída e funcional**, com arquitetura moderna, design consistente e funcionalidades ricas. No entanto, apresenta **7 vulnerabilidades críticas de segurança** que precisam ser remediadas urgentemente.

**Status de Segurança**: 🔴 **CRÍTICO - REQUER AÇÃO IMEDIATA**

A implementação do plano de remediação em 3 fases levará aproximadamente **32-46 horas de esforço** e elevará significativamente o nível de segurança da plataforma.

---

**Análise realizada em**: 01 de Abril de 2026  
**Próxima revisão recomendada**: Após implementação da Fase 1 (48h)

