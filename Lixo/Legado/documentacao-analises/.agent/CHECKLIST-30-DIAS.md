# 📋 Checklist de Implementação - 30 Dias

**Início:** 2026-04-22 (Segunda-feira)  
**Conclusão:** 2026-05-21  
**Status:** ⏳ Aguardando início

---

## 📅 SEMANA 1: Sistema de Cupons - Backend

### Dia 1 (2026-04-22 Segunda) - Setup e Database
- [ ] **Backup completo criado** (CRÍTICO)
  ```bash
  bash scripts/backup-complete.sh
  ```
- [ ] **Branch criada:** `feature/coupons-system`
  ```bash
  git checkout -b feature/coupons-system
  ```
- [ ] **Migration criada:** `coupons_system`
  ```bash
  supabase migration new coupons_system
  ```
- [ ] **Schema SQL escrito:**
  - [ ] Tabela `coupons`
  - [ ] Tabela `coupon_products`
  - [ ] Tabela `coupon_usage`
  - [ ] Índices criados
  - [ ] RLS policies configuradas
  - [ ] Trigger `update_updated_at_column`
- [ ] **Migration aplicada**
  ```bash
  supabase db push
  ```
- [ ] **Verificado no Supabase Studio**
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(db): add coupons system schema"
  ```

**Tempo estimado:** 4-6 horas  
**Entregável:** Database schema completo ✅

---

### Dia 2 (2026-04-23 Terça) - Edge Function
- [ ] **Edge Function criada:** `validate-coupon`
  ```bash
  supabase functions new validate-coupon
  ```
- [ ] **Dependências configuradas** (Zod no deno.json)
- [ ] **Validação de input implementada** (Zod schema)
- [ ] **Lógica de validação implementada:**
  - [ ] Buscar cupom por código
  - [ ] Validar status ativo
  - [ ] Validar datas (valid_from, valid_until)
  - [ ] Validar produto específico
  - [ ] Validar valor mínimo
  - [ ] Validar limite de uso
- [ ] **Cálculo de desconto** (percent/fixed)
- [ ] **Error handling implementado**
- [ ] **Function deployada**
  ```bash
  supabase functions deploy validate-coupon
  ```
- [ ] **Testada via Postman/curl**
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(api): add coupon validation edge function"
  ```

**Tempo estimado:** 4-6 horas  
**Entregável:** Edge Function funcionando ✅

---

### Dia 3 (2026-04-24 Quarta) - Tipos e Hook
- [ ] **Tipos TypeScript criados:**
  - [ ] `src/features/coupons/types/index.ts`
  - [ ] Interface `Coupon`
  - [ ] Type `DiscountType`
  - [ ] Type `CouponValidationResult`
  - [ ] Type `CouponFormData`
- [ ] **Hook criado:** `useCouponValidation.ts`
  - [ ] useMutation (TanStack Query)
  - [ ] Chamada à Edge Function
  - [ ] Error handling
  - [ ] Tipagem completa
- [ ] **Hook testado isoladamente**
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(coupons): add types and validation hook"
  ```

**Tempo estimado:** 3-4 horas  
**Entregável:** Tipos e hook funcionando ✅

---

### Dia 4 (2026-04-25 Quinta) - Componente UI
- [ ] **Componente criado:** `CouponInput.tsx`
  - [ ] Estrutura com shadcn/ui (Input, Button)
  - [ ] State management (código do cupom)
  - [ ] Integração com hook `useCouponValidation`
  - [ ] Loading states
  - [ ] Toast notifications (sucesso/erro)
  - [ ] Callback `onApply`
- [ ] **Estilização e responsividade**
- [ ] **Componente testado isoladamente**
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(coupons): add CouponInput component"
  ```

**Tempo estimado:** 4-5 horas  
**Entregável:** Componente UI funcionando ✅

---

### Dia 5 (2026-04-26 Sexta) - Admin CRUD - Parte 1
- [ ] **Página admin criada:** `src/pages/admin/Coupons.tsx`
- [ ] **Query para listar cupons** (TanStack Query)
- [ ] **Tabela com DataTable** (shadcn/ui)
  - [ ] Colunas: código, tipo, valor, usos, status
- [ ] **Filtros implementados:**
  - [ ] Status (ativo/inativo)
  - [ ] Busca por código
- [ ] **Paginação implementada**
- [ ] **Botões de ação:**
  - [ ] Editar
  - [ ] Deletar
  - [ ] Ativar/Desativar
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(admin): add coupons list page"
  ```

**Tempo estimado:** 4-6 horas  
**Entregável:** Listagem de cupons ✅

---

## 📅 SEMANA 2: Sistema de Cupons - Admin e Integração

### Dia 6-7 (Sábado-Domingo) - Admin CRUD - Parte 2
- [ ] **Modal de criação/edição implementado**
- [ ] **Form com react-hook-form + Zod**
  - [ ] Campo: code
  - [ ] Campo: discount_type (select)
  - [ ] Campo: discount_value
  - [ ] Campo: max_uses
  - [ ] Campo: valid_from (date picker)
  - [ ] Campo: valid_until (date picker)
  - [ ] Campo: min_purchase_amount
  - [ ] Campo: is_active (toggle)
- [ ] **Seletor de produtos** (multi-select)
- [ ] **Mutations implementadas:**
  - [ ] Create coupon
  - [ ] Update coupon
  - [ ] Delete coupon
- [ ] **CRUD testado completamente**
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(admin): complete coupons CRUD"
  ```

**Tempo estimado:** 6-8 horas  
**Entregável:** CRUD completo ✅

---

### Dia 8 (2026-04-29 Segunda) - Integração no Checkout
- [ ] **CouponInput integrado no CheckoutPage**
- [ ] **OrderSummary atualizado:**
  - [ ] Mostrar desconto aplicado
  - [ ] Calcular total com desconto
- [ ] **Lógica de salvamento:**
  - [ ] Salvar `coupon_code` no order
  - [ ] Incrementar `uses_count` após pagamento
  - [ ] Criar registro em `coupon_usage`
- [ ] **Fluxo completo testado:**
  - [ ] Aplicar cupom
  - [ ] Ver desconto
  - [ ] Finalizar compra
  - [ ] Verificar cupom usado
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(coupons): integrate with checkout flow"
  ```

**Tempo estimado:** 4-6 horas  
**Entregável:** Integração completa ✅

---

### Dia 9 (2026-04-30 Terça) - Testes E2E
- [ ] **Testes E2E escritos:**
  - [ ] Cupom válido (percentual)
  - [ ] Cupom válido (fixo)
  - [ ] Cupom expirado
  - [ ] Cupom esgotado (max_uses)
  - [ ] Valor mínimo não atingido
  - [ ] Cupom para produto errado
  - [ ] Cupom inativo
  - [ ] Edge cases
- [ ] **Todos os testes passando**
- [ ] **Bugs encontrados documentados**
- [ ] **Commit realizado**
  ```bash
  git commit -m "test(coupons): add e2e tests"
  ```

**Tempo estimado:** 4-6 horas  
**Entregável:** Testes E2E ✅

---

### Dia 10 (2026-05-01 Quarta) - Correções e Melhorias
- [ ] **Bugs corrigidos**
- [ ] **UX melhorada:**
  - [ ] Mensagens de erro mais claras
  - [ ] Loading skeletons
  - [ ] Animações suaves
- [ ] **Performance otimizada:**
  - [ ] Queries otimizadas
  - [ ] Cache configurado
  - [ ] Índices verificados
- [ ] **Commit realizado**
  ```bash
  git commit -m "fix(coupons): bug fixes and improvements"
  ```

**Tempo estimado:** 4-6 horas  
**Entregável:** Sistema estável ✅

---

### Dia 11 (2026-05-02 Quinta) - Estatísticas
- [ ] **Dashboard de estatísticas criado:**
  - [ ] Total de cupons ativos
  - [ ] Usos hoje/semana/mês
  - [ ] Desconto total concedido
  - [ ] Top cupons mais usados
- [ ] **Gráficos implementados** (Recharts - opcional)
- [ ] **Commit realizado**
  ```bash
  git commit -m "feat(admin): add coupon statistics"
  ```

**Tempo estimado:** 3-4 horas  
**Entregável:** Dashboard de estatísticas ✅

---

### Dia 12-14 (Sexta-Domingo) - Deploy Gradual
- [ ] **Merge para `develop`**
  ```bash
  git checkout develop
  git merge feature/coupons-system
  ```
- [ ] **Deploy em staging**
- [ ] **Smoke tests em staging:**
  - [ ] Aplicar cupom
  - [ ] Finalizar compra
  - [ ] Verificar admin
- [ ] **Backup final criado**
  ```bash
  bash scripts/backup-complete.sh
  ```
- [ ] **Verificação pré-deploy**
  ```bash
  bash scripts/pre-deploy-check.sh
  ```
- [ ] **Deploy produção: 10% usuários**
  - [ ] Feature flag: `VITE_FEATURE_COUPONS=true`
  - [ ] Deploy
- [ ] **Monitoramento 24h**
  ```bash
  bash scripts/monitor-deploy.sh 1440
  ```
- [ ] **Se OK: 50% usuários**
- [ ] **Monitoramento 24h**
- [ ] **Se OK: 100% usuários**
- [ ] **Commit realizado**
  ```bash
  git commit -m "chore: deploy coupons system to production"
  ```

**Tempo estimado:** Variável  
**Entregável:** Sistema de cupons em produção ✅

---

## 📅 SEMANA 3: Checkout Avançado - Implementação

### Dia 15 (2026-05-05 Segunda) - Timer e Database
- [ ] **Backup criado**
  ```bash
  bash scripts/backup-complete.sh
  ```
- [ ] **Branch criada:** `feature/checkout-advanced`
- [ ] **Migration criada:** `checkout_advanced_config`
- [ ] **Campo `checkout_config` adicionado em `products`**
- [ ] **Migration aplicada**
- [ ] **Componente Timer criado:** `CheckoutTimer.tsx`
  - [ ] Countdown em tempo real
  - [ ] Customizável (cores, texto)
  - [ ] Sticky ou inline
- [ ] **Commit realizado**

**Tempo estimado:** 4-6 horas  
**Entregável:** Timer funcionando ✅

---

### Dia 16 (2026-05-06 Terça) - Exit Popup
- [ ] **Componente criado:** `ExitPopup.tsx`
- [ ] **Detecção de eventos:**
  - [ ] Mouse leave (top)
  - [ ] Back button (popstate)
  - [ ] Tab switch (opcional)
- [ ] **Modal com cupom especial**
- [ ] **Frequência por sessão** (localStorage)
- [ ] **Botões: aceitar/recusar**
- [ ] **Commit realizado**

**Tempo estimado:** 4-6 horas  
**Entregável:** Exit popup funcionando ✅

---

### Dia 17 (2026-05-07 Quarta) - Reviews
- [ ] **Componente criado:** `CheckoutReviews.tsx`
- [ ] **Carousel de depoimentos**
- [ ] **Estrelas de avaliação**
- [ ] **Fotos de clientes** (opcional)
- [ ] **Configurável via admin**
- [ ] **Commit realizado**

**Tempo estimado:** 3-4 horas  
**Entregável:** Reviews no checkout ✅

---

### Dia 18 (2026-05-08 Quinta) - Sales Notifications
- [ ] **Componente criado:** `SalesNotification.tsx`
- [ ] **Notificações fake de vendas**
- [ ] **Animação de entrada/saída**
- [ ] **Intervalo configurável**
- [ ] **Nomes aleatórios**
- [ ] **Commit realizado**

**Tempo estimado:** 3-4 horas  
**Entregável:** Notificações funcionando ✅

---

### Dia 19 (2026-05-09 Sexta) - Admin Config
- [ ] **Seção no admin de produtos criada**
- [ ] **Form para configurar `checkout_config`:**
  - [ ] Timer (enabled, minutes, text, colors)
  - [ ] Exit popup (enabled, triggers, coupon, text)
  - [ ] Reviews (enabled, list)
  - [ ] Sales notifications (enabled, interval, names)
- [ ] **Preview em tempo real** (opcional)
- [ ] **Commit realizado**

**Tempo estimado:** 4-5 horas  
**Entregável:** Configuração via admin ✅

---

### Dia 20-21 (Sábado-Domingo) - Integração e Testes
- [ ] **Todos os componentes integrados no CheckoutPage**
- [ ] **Buscar `checkout_config` do produto**
- [ ] **Renderizar condicionalmente**
- [ ] **Testes E2E:**
  - [ ] Timer funcionando
  - [ ] Exit popup acionado
  - [ ] Reviews exibidos
  - [ ] Notificações aparecendo
- [ ] **Testes em diferentes dispositivos:**
  - [ ] Mobile
  - [ ] Tablet
  - [ ] Desktop
- [ ] **Testes em diferentes browsers:**
  - [ ] Chrome
  - [ ] Firefox
  - [ ] Safari
  - [ ] Edge
- [ ] **Ajustes de UX/UI**
- [ ] **Commit realizado**

**Tempo estimado:** 6-8 horas  
**Entregável:** Checkout avançado completo ✅

---

## 📅 SEMANA 4: Testes, Deploy e Validação

### Dia 22-23 (2026-05-12-13 Segunda-Terça) - Testes E2E
- [ ] **Testes E2E escritos:**
  - [ ] Fluxo completo com cupom
  - [ ] Fluxo com timer
  - [ ] Fluxo com exit popup
  - [ ] Fluxo com todos os elementos
- [ ] **Todos os testes passando**
- [ ] **Bugs corrigidos**
- [ ] **Commit realizado**

**Tempo estimado:** 6-8 horas  
**Entregável:** Testes E2E ✅

---

### Dia 24-25 (2026-05-14-15 Quarta-Quinta) - Performance
- [ ] **Lighthouse audit executado**
- [ ] **Performance score > 90**
- [ ] **Otimizações implementadas:**
  - [ ] Imagens otimizadas
  - [ ] Code splitting (lazy load)
  - [ ] Bundle size reduzido
  - [ ] Queries otimizadas
- [ ] **Commit realizado**

**Tempo estimado:** 6-8 horas  
**Entregável:** Performance otimizada ✅

---

### Dia 26 (2026-05-16 Sexta) - Deploy Staging
- [ ] **Merge para `develop`**
- [ ] **Deploy em staging**
- [ ] **Smoke tests:**
  - [ ] Cupons funcionando
  - [ ] Timer funcionando
  - [ ] Exit popup funcionando
  - [ ] Reviews exibidos
  - [ ] Notificações aparecendo
- [ ] **Feedback da equipe coletado**
- [ ] **Ajustes finais**

**Tempo estimado:** 3-4 horas  
**Entregável:** Sistema em staging ✅

---

### Dia 27-28 (Sábado-Domingo) - Deploy Produção
- [ ] **Backup final criado**
  ```bash
  bash scripts/backup-complete.sh
  ```
- [ ] **Verificação pré-deploy**
  ```bash
  bash scripts/pre-deploy-check.sh
  ```
- [ ] **Deploy produção: 10% usuários**
- [ ] **Monitoramento 24h**
  ```bash
  bash scripts/monitor-deploy.sh 1440
  ```
- [ ] **Se OK: 50% usuários**
- [ ] **Monitoramento 24h**
- [ ] **Se OK: 100% usuários**

**Tempo estimado:** 4-6 horas  
**Entregável:** Sistema em produção ✅

---

### Dia 29-30 (2026-05-19-20 Segunda-Terça) - Análise
- [ ] **Métricas coletadas:**
  - [ ] Conversão (antes vs depois)
  - [ ] Taxa de uso de cupons
  - [ ] Taxa de abandono
  - [ ] Ticket médio
  - [ ] Tempo no checkout
- [ ] **Relatório criado**
- [ ] **Feedback de usuários coletado**
- [ ] **Melhorias identificadas**
- [ ] **Documentação atualizada:**
  - [ ] README
  - [ ] Guia de uso (admin)
  - [ ] APIs documentadas
- [ ] **Retrospectiva realizada**
- [ ] **Celebração! 🎉**

**Tempo estimado:** 4-6 horas  
**Entregável:** Relatório de resultados ✅

---

## 📊 Métricas de Sucesso

### Técnicas
- [ ] Zero bugs críticos em produção
- [ ] Performance mantida (< 2s checkout)
- [ ] Uptime > 99.9%
- [ ] Todos os testes passando
- [ ] Lighthouse score > 90

### Negócio
- [ ] Conversão: 2.0% → 2.3-2.5% (+15-25%)
- [ ] Taxa de uso de cupons: 15-25%
- [ ] Taxa de abandono: 70% → 60% (-10%)
- [ ] Tempo no checkout: 5min → 4min (-20%)
- [ ] Zero reclamações de clientes
- [ ] Feedback positivo

---

## 🎯 Status Geral

### Semana 1: Sistema de Cupons - Backend
- [ ] Dia 1: Setup e Database
- [ ] Dia 2: Edge Function
- [ ] Dia 3: Tipos e Hook
- [ ] Dia 4: Componente UI
- [ ] Dia 5: Admin CRUD - Parte 1

### Semana 2: Sistema de Cupons - Admin e Integração
- [ ] Dia 6-7: Admin CRUD - Parte 2
- [ ] Dia 8: Integração no Checkout
- [ ] Dia 9: Testes E2E
- [ ] Dia 10: Correções e Melhorias
- [ ] Dia 11: Estatísticas
- [ ] Dia 12-14: Deploy Gradual

### Semana 3: Checkout Avançado - Implementação
- [ ] Dia 15: Timer e Database
- [ ] Dia 16: Exit Popup
- [ ] Dia 17: Reviews
- [ ] Dia 18: Sales Notifications
- [ ] Dia 19: Admin Config
- [ ] Dia 20-21: Integração e Testes

### Semana 4: Testes, Deploy e Validação
- [ ] Dia 22-23: Testes E2E
- [ ] Dia 24-25: Performance
- [ ] Dia 26: Deploy Staging
- [ ] Dia 27-28: Deploy Produção
- [ ] Dia 29-30: Análise

---

**Criado em:** 2026-04-18  
**Início:** 2026-04-22  
**Conclusão:** 2026-05-21  
**Status:** ⏳ Aguardando início

**Imprima este checklist e marque cada item conforme completa! ✅**
