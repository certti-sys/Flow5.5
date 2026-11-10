# Plano de Ação Imediato - Primeiros 30 Dias

**Data:** 2026-04-18  
**Projeto:** Neo Vidya Stream Evolution  
**Objetivo:** Implementar primeiras features de alto impacto

---

## 🎯 Objetivo dos Primeiros 30 Dias

Implementar **2 features de alto impacto** que aumentem conversão imediatamente:
1. **Sistema de Cupons** (Semana 1-2)
2. **Checkout Avançado** (Semana 3-4)

**Meta:** +15-25% conversão em 30 dias

---

## 📅 Cronograma Detalhado

### Semana 1: Sistema de Cupons (Dias 1-7)

#### Dia 1 (Segunda): Setup e Database
**Tempo:** 4-6 horas

**Manhã (2-3h):**
- [ ] Revisar documentação completa do sistema de cupons
- [ ] Estudar exemplo prático (`2026-04-18-exemplo-pratico-cupons.md`)
- [ ] Identificar arquivos Getfy de referência (opcional)
- [ ] Preparar ambiente de desenvolvimento

**Tarde (2-3h):**
- [ ] Criar migration: `supabase migration new coupons_system`
- [ ] Escrever schema SQL completo:
  - Tabela `coupons`
  - Tabela `coupon_products`
  - Tabela `coupon_usage`
  - Índices
  - RLS policies
- [ ] Aplicar migration: `supabase db push`
- [ ] Verificar no Supabase Studio
- [ ] Commit: `git commit -m "feat(db): add coupons system schema"`

**Entregável:** Database schema completo e funcionando

---

#### Dia 2 (Terça): Edge Function
**Tempo:** 4-6 horas

**Manhã (2-3h):**
- [ ] Criar Edge Function: `supabase functions new validate-coupon`
- [ ] Configurar `deno.json` com dependências (Zod)
- [ ] Implementar validação de input (Zod schema)
- [ ] Implementar lógica de validação:
  - Buscar cupom por código
  - Validar status ativo
  - Validar datas

**Tarde (2-3h):**
- [ ] Continuar lógica de validação:
  - Validar produto
  - Validar valor mínimo
  - Validar limite de uso
- [ ] Calcular desconto (percent/fixed)
- [ ] Implementar error handling
- [ ] Deploy: `supabase functions deploy validate-coupon`
- [ ] Testar via Postman/curl
- [ ] Commit: `git commit -m "feat(api): add coupon validation edge function"`

**Entregável:** Edge Function funcionando e testada

---

#### Dia 3 (Quarta): Tipos e Hook
**Tempo:** 3-4 horas

**Manhã (1.5-2h):**
- [ ] Criar `src/features/coupons/types/index.ts`
- [ ] Definir interfaces:
  - `Coupon`
  - `CouponValidationResult`
  - `CouponFormData`
  - `CouponUsage`
- [ ] Exportar todos os tipos

**Tarde (1.5-2h):**
- [ ] Criar `src/features/coupons/hooks/useCouponValidation.ts`
- [ ] Implementar useMutation (TanStack Query)
- [ ] Chamar Edge Function via `supabase.functions.invoke`
- [ ] Adicionar error handling
- [ ] Testar hook isoladamente
- [ ] Commit: `git commit -m "feat(coupons): add types and validation hook"`

**Entregável:** Tipos TypeScript e hook funcionando

---

#### Dia 4 (Quinta): Componente CouponInput
**Tempo:** 4-5 horas

**Manhã (2-2.5h):**
- [ ] Criar `src/features/coupons/components/CouponInput.tsx`
- [ ] Estrutura básica com shadcn/ui (Input, Button)
- [ ] State management (código do cupom)
- [ ] Integrar hook `useCouponValidation`
- [ ] Loading states

**Tarde (2-2.5h):**
- [ ] Adicionar toast notifications (sucesso/erro)
- [ ] Implementar callback `onApply`
- [ ] Estilização e responsividade
- [ ] Testar no Storybook (se disponível)
- [ ] Commit: `git commit -m "feat(coupons): add CouponInput component"`

**Entregável:** Componente UI funcionando

---

#### Dia 5 (Sexta): Admin CRUD - Parte 1
**Tempo:** 4-6 horas

**Manhã (2-3h):**
- [ ] Criar `src/pages/admin/Coupons.tsx`
- [ ] Setup básico da página
- [ ] Query para listar cupons (TanStack Query)
- [ ] Tabela com shadcn/ui DataTable
- [ ] Colunas: código, tipo, valor, usos, status

**Tarde (2-3h):**
- [ ] Adicionar filtros (status, busca)
- [ ] Adicionar paginação
- [ ] Botões de ação (editar, deletar, ativar/desativar)
- [ ] Commit: `git commit -m "feat(admin): add coupons list page"`

**Entregável:** Listagem de cupons funcionando

---

#### Dia 6-7 (Fim de Semana): Admin CRUD - Parte 2 e Integração
**Tempo:** 6-8 horas

**Sábado (3-4h):**
- [ ] Criar modal de criação/edição
- [ ] Form com react-hook-form + Zod
- [ ] Campos: code, discount_type, discount_value, etc.
- [ ] Seletor de produtos (multi-select)
- [ ] Mutations: create, update, delete
- [ ] Testar CRUD completo

**Domingo (3-4h):**
- [ ] Integrar CouponInput no checkout
- [ ] Atualizar OrderSummary com desconto
- [ ] Salvar coupon_code no order
- [ ] Incrementar uses_count após pagamento
- [ ] Testar fluxo completo (checkout → pagamento → cupom usado)
- [ ] Commit: `git commit -m "feat(coupons): integrate with checkout flow"`

**Entregável:** Sistema de cupons 100% funcional

---

### Semana 2: Testes e Refinamento de Cupons (Dias 8-14)

#### Dia 8 (Segunda): Testes Completos
**Tempo:** 4-6 horas

- [ ] Testar cupom válido (percentual e fixo)
- [ ] Testar cupom expirado
- [ ] Testar cupom esgotado (max_uses)
- [ ] Testar valor mínimo não atingido
- [ ] Testar cupom para produto errado
- [ ] Testar cupom inativo
- [ ] Testar edge cases (cupom vazio, caracteres especiais, etc.)
- [ ] Documentar bugs encontrados

**Entregável:** Lista de bugs e melhorias

---

#### Dia 9 (Terça): Correções e Melhorias
**Tempo:** 4-6 horas

- [ ] Corrigir bugs encontrados
- [ ] Melhorar UX (mensagens de erro mais claras)
- [ ] Adicionar loading skeletons
- [ ] Otimizar queries (índices, cache)
- [ ] Commit: `git commit -m "fix(coupons): bug fixes and improvements"`

**Entregável:** Sistema estável e polido

---

#### Dia 10 (Quarta): Estatísticas e Analytics
**Tempo:** 3-4 horas

- [ ] Adicionar estatísticas no admin:
  - Total de cupons ativos
  - Usos hoje/semana/mês
  - Desconto total concedido
  - Top cupons mais usados
- [ ] Gráficos com Recharts (opcional)
- [ ] Commit: `git commit -m "feat(admin): add coupon statistics"`

**Entregável:** Dashboard de cupons

---

#### Dia 11-14 (Quinta-Domingo): Buffer e Documentação
**Tempo:** Variável

- [ ] Buffer para imprevistos
- [ ] Documentar decisões técnicas
- [ ] Atualizar README
- [ ] Preparar para próxima feature
- [ ] Revisar código (refactoring se necessário)
- [ ] Deploy em staging (se disponível)

**Entregável:** Sistema de cupons em produção

---

### Semana 3: Checkout Avançado - Parte 1 (Dias 15-21)

#### Dia 15 (Segunda): Database e Timer
**Tempo:** 4-6 horas

**Manhã (2-3h):**
- [ ] Adicionar campo `checkout_config` em `products` (jsonb)
- [ ] Estrutura para timer, exit_popup, reviews, sales_notification
- [ ] Migration e deploy

**Tarde (2-3h):**
- [ ] Criar `src/features/checkout-advanced/components/CheckoutTimer.tsx`
- [ ] Countdown em tempo real (useEffect + setInterval)
- [ ] Customizável (cores, texto, posição)
- [ ] Sticky ou inline
- [ ] Commit: `git commit -m "feat(checkout): add countdown timer"`

**Entregável:** Timer funcionando

---

#### Dia 16 (Terça): Exit Popup
**Tempo:** 4-6 horas

- [ ] Criar `src/features/checkout-advanced/components/ExitPopup.tsx`
- [ ] Detectar mouse leave (top)
- [ ] Detectar back button (popstate)
- [ ] Modal com cupom especial
- [ ] Frequência por sessão (localStorage)
- [ ] Botões: aceitar/recusar
- [ ] Commit: `git commit -m "feat(checkout): add exit intent popup"`

**Entregável:** Exit popup funcionando

---

#### Dia 17 (Quarta): Reviews e Depoimentos
**Tempo:** 3-4 horas

- [ ] Criar `src/features/checkout-advanced/components/CheckoutReviews.tsx`
- [ ] Carousel de depoimentos
- [ ] Estrelas de avaliação
- [ ] Fotos de clientes (opcional)
- [ ] Configurável via admin
- [ ] Commit: `git commit -m "feat(checkout): add reviews section"`

**Entregável:** Reviews no checkout

---

#### Dia 18 (Quinta): Sales Notifications
**Tempo:** 3-4 horas

- [ ] Criar `src/features/checkout-advanced/components/SalesNotification.tsx`
- [ ] Notificações fake de vendas (social proof)
- [ ] Animação de entrada/saída
- [ ] Intervalo configurável
- [ ] Nomes aleatórios
- [ ] Commit: `git commit -m "feat(checkout): add sales notifications"`

**Entregável:** Notificações funcionando

---

#### Dia 19 (Sexta): Admin Config
**Tempo:** 4-5 horas

- [ ] Adicionar seção no admin de produtos
- [ ] Form para configurar checkout_config:
  - Timer (enabled, minutes, text, colors)
  - Exit popup (enabled, triggers, coupon, text)
  - Reviews (enabled, list)
  - Sales notifications (enabled, interval, names)
- [ ] Preview em tempo real (opcional)
- [ ] Commit: `git commit -m "feat(admin): add checkout config"`

**Entregável:** Configuração via admin

---

#### Dia 20-21 (Fim de Semana): Integração e Testes
**Tempo:** 6-8 horas

**Sábado (3-4h):**
- [ ] Integrar todos os componentes no CheckoutPage
- [ ] Buscar checkout_config do produto
- [ ] Renderizar condicionalmente (baseado em config)
- [ ] Testar cada feature isoladamente

**Domingo (3-4h):**
- [ ] Testar fluxo completo
- [ ] Testar em diferentes dispositivos (mobile, tablet, desktop)
- [ ] Testar em diferentes browsers
- [ ] Ajustes de UX/UI
- [ ] Commit: `git commit -m "feat(checkout): integrate advanced features"`

**Entregável:** Checkout avançado 100% funcional

---

### Semana 4: Testes, Deploy e Validação (Dias 22-30)

#### Dia 22-23 (Segunda-Terça): Testes E2E
**Tempo:** 6-8 horas

- [ ] Escrever testes E2E com Playwright:
  - Fluxo completo com cupom
  - Fluxo com timer
  - Fluxo com exit popup
  - Fluxo com todos os elementos
- [ ] Corrigir bugs encontrados
- [ ] Commit: `git commit -m "test: add e2e tests for checkout"`

**Entregável:** Testes automatizados

---

#### Dia 24-25 (Quarta-Quinta): Performance e Otimização
**Tempo:** 6-8 horas

- [ ] Lighthouse audit (meta: >90)
- [ ] Otimizar imagens
- [ ] Code splitting (lazy load)
- [ ] Otimizar queries (cache, índices)
- [ ] Reduzir bundle size
- [ ] Commit: `git commit -m "perf: optimize checkout performance"`

**Entregável:** Performance otimizada

---

#### Dia 26 (Sexta): Deploy em Staging
**Tempo:** 3-4 horas

- [ ] Deploy em ambiente de staging
- [ ] Smoke tests
- [ ] Testar com dados reais (sandbox)
- [ ] Coletar feedback da equipe
- [ ] Ajustes finais

**Entregável:** Sistema em staging

---

#### Dia 27-28 (Fim de Semana): Deploy em Produção
**Tempo:** 4-6 horas

**Sábado (2-3h):**
- [ ] Preparar deploy em produção
- [ ] Backup do database
- [ ] Feature flags configuradas (rollout gradual)
- [ ] Deploy: 10% dos usuários
- [ ] Monitorar métricas e erros

**Domingo (2-3h):**
- [ ] Analisar resultados iniciais
- [ ] Ajustar se necessário
- [ ] Aumentar rollout: 50% → 100%
- [ ] Monitorar continuamente

**Entregável:** Sistema em produção

---

#### Dia 29-30 (Segunda-Terça): Análise e Documentação
**Tempo:** 4-6 horas

- [ ] Coletar métricas:
  - Taxa de conversão (antes vs depois)
  - Taxa de uso de cupons
  - Taxa de abandono
  - Ticket médio
- [ ] Documentar resultados
- [ ] Identificar melhorias
- [ ] Planejar próximos passos
- [ ] Celebrar! 🎉

**Entregável:** Relatório de resultados

---

## 📊 Métricas a Monitorar

### Semana 1-2 (Cupons)
- [ ] Taxa de uso de cupons: meta 15-25%
- [ ] Conversão com cupom vs sem cupom: meta +10%
- [ ] Número de cupons criados
- [ ] Desconto total concedido

### Semana 3-4 (Checkout Avançado)
- [ ] Taxa de abandono: meta -15%
- [ ] Conversão geral: meta +10-15%
- [ ] Tempo médio no checkout: meta -20%
- [ ] Taxa de cliques no exit popup: medir

### Geral (30 dias)
- [ ] Conversão total: meta +15-25%
- [ ] Ticket médio: medir
- [ ] Receita total: medir
- [ ] Satisfação do usuário: coletar feedback

---

## ⚠️ Pontos de Atenção

### Semana 1
- ⚠️ RLS policies corretas (segurança)
- ⚠️ Validação robusta de cupons (evitar fraudes)
- ⚠️ Performance de queries (índices)

### Semana 2
- ⚠️ Testes completos antes de avançar
- ⚠️ UX clara (mensagens de erro)
- ⚠️ Edge cases cobertos

### Semana 3
- ⚠️ Exit popup não ser intrusivo demais
- ⚠️ Timer não causar ansiedade excessiva
- ⚠️ Mobile-first (maioria dos usuários)

### Semana 4
- ⚠️ Deploy gradual (feature flags)
- ⚠️ Monitoramento contínuo
- ⚠️ Rollback rápido se necessário

---

## 🛠️ Ferramentas Necessárias

### Desenvolvimento
- [ ] VS Code instalado
- [ ] Supabase CLI instalado
- [ ] Node.js 18+ instalado
- [ ] Git configurado

### Testes
- [ ] Postman/Insomnia para APIs
- [ ] Playwright para E2E (instalar: `npm install -D @playwright/test`)
- [ ] Lighthouse para performance

### Monitoramento
- [ ] Supabase Studio (http://localhost:54323)
- [ ] Browser DevTools
- [ ] Sentry (opcional, para error tracking)

---

## 📝 Checklist Diário

### Antes de Começar o Dia
- [ ] Revisar tarefas do dia
- [ ] Verificar ambiente funcionando
- [ ] Pull latest changes (se em equipe)
- [ ] Café ☕

### Durante o Dia
- [ ] Commit frequentemente (a cada feature pequena)
- [ ] Testar antes de avançar
- [ ] Documentar decisões importantes
- [ ] Fazer pausas regulares

### Fim do Dia
- [ ] Push commits
- [ ] Atualizar checklist
- [ ] Documentar bloqueios (se houver)
- [ ] Planejar próximo dia

---

## 🎯 Critérios de Sucesso (30 dias)

### Técnico
- [x] Sistema de cupons 100% funcional
- [x] Checkout avançado 100% funcional
- [x] Testes E2E passando
- [x] Performance Lighthouse >90
- [x] Zero bugs críticos
- [x] Deploy em produção

### Negócio
- [x] Conversão +15-25%
- [x] Taxa de uso de cupons 15-25%
- [x] Taxa de abandono -15%
- [x] Feedback positivo de usuários

### Processo
- [x] Commits organizados
- [x] Documentação atualizada
- [x] Métricas coletadas
- [x] Próximos passos definidos

---

## 🚨 Plano de Contingência

### Se Atrasar (>2 dias)
1. Reavaliar escopo (remover features não essenciais)
2. Pedir ajuda (equipe, comunidade, IA)
3. Estender timeline (comunicar stakeholders)
4. Priorizar features de maior impacto

### Se Encontrar Bloqueio Técnico
1. Pesquisar documentação oficial
2. Consultar código de referência (Getfy)
3. Usar IA com contexto completo
4. Pedir ajuda em comunidades (Discord, Stack Overflow)
5. Considerar abordagem alternativa

### Se Métricas Não Atingirem Meta
1. Analisar dados (onde está o problema?)
2. Coletar feedback qualitativo (usuários)
3. Fazer A/B tests
4. Iterar e melhorar
5. Ajustar expectativas se necessário

---

## 💪 Dicas de Produtividade

### Foco
- 🎯 Pomodoro (25 min foco + 5 min pausa)
- 🎯 Desligar notificações durante desenvolvimento
- 🎯 Uma tarefa por vez (não multitasking)
- 🎯 Blocos de tempo dedicados (manhã/tarde)

### Energia
- ☕ Café/chá para manter energia
- 🥗 Alimentação saudável
- 🚶 Pausas para caminhar
- 😴 Dormir bem (7-8h)

### Motivação
- 🎉 Celebrar pequenas vitórias
- 📊 Visualizar progresso (checklist)
- 🎯 Lembrar do objetivo final
- 👥 Compartilhar progresso (equipe, comunidade)

---

## 📞 Recursos de Ajuda

### Documentação
- [FlowMembers Evolution Package](./FlowMembers-Evolution-Package/)
- [Supabase Docs](https://supabase.com/docs)
- [React Docs](https://react.dev/)
- [TanStack Query](https://tanstack.com/query/latest)

### Comunidades
- Supabase Discord
- React Discord
- Stack Overflow
- Reddit (r/reactjs, r/typescript)

### IA Assistida
- Claude Code (para Fase 2-3)
- GitHub Copilot (autocomplete)
- ChatGPT (dúvidas pontuais)

---

## ✅ Checklist Final (Antes de Começar)

### Preparação
- [ ] Documentação completa lida
- [ ] Ambiente de desenvolvimento configurado
- [ ] Ferramentas instaladas
- [ ] Primeiro dia planejado
- [ ] Motivação em alta! 💪

### Expectativas
- [ ] Timeline realista (30 dias)
- [ ] Escopo claro (2 features)
- [ ] Métricas definidas (+15-25% conversão)
- [ ] Plano de contingência conhecido

### Compromisso
- [ ] Dedicação diária (4-6h)
- [ ] Commits frequentes
- [ ] Testes antes de avançar
- [ ] Documentação contínua

---

## 🎉 Mensagem Final

Você está prestes a começar uma jornada incrível! Em apenas 30 dias, você vai:

✅ Implementar 2 features de alto impacto  
✅ Aumentar conversão em 15-25%  
✅ Aprender novas tecnologias  
✅ Criar valor real para o negócio  

**Você tem tudo que precisa:**
- Documentação completa
- Exemplos práticos
- Roadmap detalhado
- Suporte disponível

**Agora é só começar! 🚀**

Lembre-se:
- 🎯 Foco em uma tarefa por vez
- 🧪 Teste antes de avançar
- 📝 Documente decisões importantes
- 🎉 Celebre pequenas vitórias

**Boa sorte! Você consegue! 💪**

---

**Documento criado em:** 2026-04-18  
**Início previsto:** 2026-04-22 (Segunda-feira)  
**Conclusão prevista:** 2026-05-21 (30 dias)  
**Status:** ✅ Pronto para execução

---

## 📅 Calendário Visual

```
SEMANA 1: Sistema de Cupons
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │ Dom │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ DB  │ API │Type │ UI  │Admin│Admin│Integ│
│Setup│Edge │Hook │Comp │CRUD │CRUD │Test │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

SEMANA 2: Refinamento de Cupons
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │ Dom │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│Test │Fix  │Stats│Buff │Buff │Buff │Buff │
│E2E  │Bugs │Dash │er   │er   │er   │er   │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

SEMANA 3: Checkout Avançado
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │ Dom │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│Timer│Exit │Revw │Sale │Admin│Integ│Test │
│DB   │Popup│s    │Notif│Conf │ration│    │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

SEMANA 4: Deploy e Validação
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │ Dom │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│E2E  │E2E  │Perf │Perf │Stag │Prod │Prod │
│Test │Test │Opt  │Opt  │ing  │10%  │100% │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘

SEMANA 5: Análise
┌─────┬─────┐
│ Seg │ Ter │
├─────┼─────┤
│Metr │Doc  │
│ics  │Report│
└─────┴─────┘
```

**Legenda:**
- DB = Database
- API = Edge Function
- Type = TypeScript Types
- UI = User Interface
- Admin = Admin Panel
- Integ = Integration
- Test = Testing
- E2E = End-to-End
- Perf = Performance
- Opt = Optimization
- Stag = Staging
- Prod = Production
- Metr = Metrics
- Doc = Documentation

---

**Pronto para começar? Vamos lá! 🚀**
