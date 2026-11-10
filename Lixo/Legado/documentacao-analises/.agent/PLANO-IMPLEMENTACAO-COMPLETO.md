# 🚀 Plano de Implementação - Neo Vidya Stream Evolution

**Data:** 2026-04-18  
**Status:** ✅ APROVADO  
**Início:** 2026-04-22 (Segunda-feira)  
**Duração:** 30 dias

---

## 📋 Informações do Projeto

### Ambiente Verificado
- ✅ **Projeto:** Neo Vidya Stream (Flow5)
- ✅ **Supabase Project ID:** lznckhxqbkqldedlmbfb
- ✅ **Supabase URL:** https://lznckhxqbkqldedlmbfb.supabase.co
- ✅ **Diretório:** c:\WWW Projetos\neo-vidya-stream-main\Flow5
- ✅ **Supabase CLI:** Configurado (migrations/ e functions/ existem)
- ✅ **Git:** Repositório ativo

---

## 🎯 Escopo da Implementação

### Features a Implementar (30 dias)
1. **Sistema de Cupons** (Semana 1-2)
2. **Checkout Avançado** (Semana 3-4)

### Resultado Esperado
- **Conversão:** +15-25%
- **Receita adicional:** R$ 7.5-12.5k/mês
- **ROI 12 meses:** 600-900%

---

## 📅 Cronograma Detalhado

### SEMANA 1: Sistema de Cupons - Database e Backend

#### Dia 1 (2026-04-22 Segunda) - Setup e Database
**Tempo:** 4-6 horas

**Tarefas:**
1. ✅ **Backup completo do banco de dados** (CRÍTICO)
2. ✅ **Criar branch Git:** `feature/coupons-system`
3. ✅ **Criar migration:** `supabase migration new coupons_system`
4. ✅ **Escrever schema SQL:**
   - Tabela `coupons`
   - Tabela `coupon_products`
   - Tabela `coupon_usage`
   - Índices
   - RLS policies
5. ✅ **Aplicar migration:** `supabase db push`
6. ✅ **Verificar no Supabase Studio**
7. ✅ **Commit:** `git commit -m "feat(db): add coupons system schema"`

**Rollback:** Se falhar, reverter migration (ver seção Rollback)

---

#### Dia 2 (2026-04-23 Terça) - Edge Function
**Tempo:** 4-6 horas

**Tarefas:**
1. ✅ **Criar Edge Function:** `supabase functions new validate-coupon`
2. ✅ **Implementar validação de input (Zod)**
3. ✅ **Implementar lógica de validação:**
   - Buscar cupom por código
   - Validar status ativo
   - Validar datas
   - Validar produto
   - Validar valor mínimo
   - Validar limite de uso
4. ✅ **Calcular desconto (percent/fixed)**
5. ✅ **Deploy:** `supabase functions deploy validate-coupon`
6. ✅ **Testar via Postman/curl**
7. ✅ **Commit:** `git commit -m "feat(api): add coupon validation edge function"`

**Rollback:** Se falhar, deletar função (ver seção Rollback)

---

#### Dia 3 (2026-04-24 Quarta) - Tipos e Hook
**Tempo:** 3-4 horas

**Tarefas:**
1. ✅ **Criar `src/features/coupons/types/index.ts`**
2. ✅ **Definir interfaces TypeScript**
3. ✅ **Criar `src/features/coupons/hooks/useCouponValidation.ts`**
4. ✅ **Implementar useMutation (TanStack Query)**
5. ✅ **Testar hook isoladamente**
6. ✅ **Commit:** `git commit -m "feat(coupons): add types and validation hook"`

**Rollback:** Reverter commit (código frontend não afeta produção)

---

#### Dia 4 (2026-04-25 Quinta) - Componente UI
**Tempo:** 4-5 horas

**Tarefas:**
1. ✅ **Criar `src/features/coupons/components/CouponInput.tsx`**
2. ✅ **Estrutura com shadcn/ui (Input, Button)**
3. ✅ **Integrar hook `useCouponValidation`**
4. ✅ **Loading states e toast notifications**
5. ✅ **Testar componente isoladamente**
6. ✅ **Commit:** `git commit -m "feat(coupons): add CouponInput component"`

**Rollback:** Reverter commit

---

#### Dia 5 (2026-04-26 Sexta) - Admin CRUD - Parte 1
**Tempo:** 4-6 horas

**Tarefas:**
1. ✅ **Criar `src/pages/admin/Coupons.tsx`**
2. ✅ **Query para listar cupons**
3. ✅ **Tabela com DataTable**
4. ✅ **Filtros e paginação**
5. ✅ **Commit:** `git commit -m "feat(admin): add coupons list page"`

**Rollback:** Reverter commit

---

### SEMANA 2: Sistema de Cupons - Admin e Integração

#### Dia 6-7 (Sábado-Domingo) - Admin CRUD - Parte 2
**Tempo:** 6-8 horas

**Tarefas:**
1. ✅ **Modal de criação/edição**
2. ✅ **Form com react-hook-form + Zod**
3. ✅ **Mutations: create, update, delete**
4. ✅ **Testar CRUD completo**
5. ✅ **Commit:** `git commit -m "feat(admin): complete coupons CRUD"`

**Rollback:** Reverter commit

---

#### Dia 8 (2026-04-29 Segunda) - Integração no Checkout
**Tempo:** 4-6 horas

**Tarefas:**
1. ✅ **Integrar CouponInput no CheckoutPage**
2. ✅ **Atualizar OrderSummary com desconto**
3. ✅ **Salvar coupon_code no order**
4. ✅ **Incrementar uses_count após pagamento**
5. ✅ **Testar fluxo completo**
6. ✅ **Commit:** `git commit -m "feat(coupons): integrate with checkout flow"`

**Rollback:** Reverter commit ou usar feature flag

---

#### Dia 9-10 (Terça-Quarta) - Testes e Refinamento
**Tempo:** 6-8 horas

**Tarefas:**
1. ✅ **Testes E2E completos**
2. ✅ **Corrigir bugs encontrados**
3. ✅ **Melhorar UX**
4. ✅ **Otimizar performance**
5. ✅ **Commit:** `git commit -m "fix(coupons): bug fixes and improvements"`

**Rollback:** Reverter commits problemáticos

---

#### Dia 11-14 (Quinta-Domingo) - Deploy Gradual
**Tempo:** Variável

**Tarefas:**
1. ✅ **Merge para `develop`**
2. ✅ **Deploy em staging**
3. ✅ **Smoke tests**
4. ✅ **Deploy produção: 10% usuários (feature flag)**
5. ✅ **Monitorar métricas 24h**
6. ✅ **Se OK: 50% usuários**
7. ✅ **Monitorar métricas 24h**
8. ✅ **Se OK: 100% usuários**

**Rollback:** Desativar feature flag (ver seção Rollback)

---

### SEMANA 3-4: Checkout Avançado

#### Semana 3 (Dias 15-21) - Implementação
**Tarefas:**
1. ✅ **Timer de urgência**
2. ✅ **Exit popup**
3. ✅ **Reviews/depoimentos**
4. ✅ **Sales notifications**
5. ✅ **Admin config**

#### Semana 4 (Dias 22-30) - Testes e Deploy
**Tarefas:**
1. ✅ **Testes E2E**
2. ✅ **Performance optimization**
3. ✅ **Deploy gradual**
4. ✅ **Monitoramento**

---

## 🛡️ Estratégia de Backup

### 1. Backup Completo do Banco de Dados (ANTES DE COMEÇAR)

#### Método 1: Via Supabase Dashboard (RECOMENDADO)
```bash
# Acessar: https://supabase.com/dashboard/project/lznckhxqbkqldedlmbfb/settings/database
# Clicar em "Backups"
# Criar backup manual: "Create backup"
# Nome: "pre-coupons-implementation-2026-04-22"
```

#### Método 2: Via pg_dump (Backup Local)
```bash
# Obter connection string do Supabase Dashboard
# Settings > Database > Connection string

# Fazer backup completo
pg_dump "postgresql://postgres:[PASSWORD]@db.lznckhxqbkqldedlmbfb.supabase.co:5432/postgres" \
  > backups/backup-pre-coupons-2026-04-22.sql

# Comprimir
gzip backups/backup-pre-coupons-2026-04-22.sql
```

#### Método 3: Via Supabase CLI
```bash
# Backup do schema
supabase db dump --schema public > backups/schema-backup-2026-04-22.sql

# Backup dos dados
supabase db dump --data-only > backups/data-backup-2026-04-22.sql
```

---

### 2. Backup Incremental (Durante Implementação)

#### Antes de Cada Migration
```bash
# Criar backup automático antes de aplicar migration
supabase db dump --schema public > backups/pre-migration-$(date +%Y%m%d-%H%M%S).sql
supabase db push
```

#### Backup de Edge Functions
```bash
# Copiar código das functions antes de deploy
cp -r supabase/functions backups/functions-backup-$(date +%Y%m%d)
```

---

### 3. Backup de Código (Git)

#### Antes de Começar
```bash
# Criar tag de release
git tag -a v1.0.0-pre-coupons -m "Version before coupons implementation"
git push origin v1.0.0-pre-coupons

# Criar branch de backup
git checkout -b backup/pre-coupons-2026-04-22
git push origin backup/pre-coupons-2026-04-22
git checkout main
```

#### Durante Implementação
```bash
# Trabalhar em feature branch
git checkout -b feature/coupons-system

# Commits frequentes
git add .
git commit -m "feat: [descrição]"
git push origin feature/coupons-system
```

---

### 4. Backup de Configurações

```bash
# Backup de .env
cp .env backups/.env.backup-2026-04-22

# Backup de config files
cp supabase/config.toml backups/config.toml.backup-2026-04-22
cp package.json backups/package.json.backup-2026-04-22
```

---

## 🔄 Estratégia de Rollback

### Nível 1: Rollback de Feature Flag (MAIS RÁPIDO)

#### Implementar Feature Flags
```typescript
// src/lib/featureFlags.ts
export const featureFlags = {
  couponsEnabled: process.env.VITE_FEATURE_COUPONS === 'true',
  checkoutAdvancedEnabled: process.env.VITE_FEATURE_CHECKOUT_ADVANCED === 'true',
};

// Uso no componente
import { featureFlags } from '@/lib/featureFlags';

function CheckoutPage() {
  return (
    <>
      {featureFlags.couponsEnabled && <CouponInput />}
      {/* resto do código */}
    </>
  );
}
```

#### Rollback Imediato (< 1 minuto)
```bash
# Desativar feature via environment variable
# No Vercel/Netlify Dashboard:
# Settings > Environment Variables
# VITE_FEATURE_COUPONS = false
# Redeploy

# Ou via CLI (Vercel)
vercel env rm VITE_FEATURE_COUPONS production
vercel --prod
```

---

### Nível 2: Rollback de Código (RÁPIDO)

#### Reverter Último Commit
```bash
# Se ainda não fez push
git reset --hard HEAD~1

# Se já fez push
git revert HEAD
git push origin feature/coupons-system
```

#### Reverter Múltiplos Commits
```bash
# Reverter até commit específico
git revert --no-commit abc123..HEAD
git commit -m "revert: rollback coupons implementation"
git push origin feature/coupons-system
```

#### Voltar para Tag de Backup
```bash
# Criar branch de emergência
git checkout -b emergency/rollback-coupons

# Resetar para tag de backup
git reset --hard v1.0.0-pre-coupons

# Force push (CUIDADO!)
git push origin emergency/rollback-coupons --force

# Deploy da branch de emergência
```

---

### Nível 3: Rollback de Database (MÉDIO)

#### Reverter Migration Específica
```bash
# Listar migrations aplicadas
supabase migration list

# Reverter última migration
supabase migration down

# Ou criar migration de rollback manual
supabase migration new rollback_coupons_system
```

#### SQL de Rollback (coupons_system)
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_rollback_coupons_system.sql

-- Remover policies
DROP POLICY IF EXISTS "Admins can read coupon_usage" ON coupon_usage;
DROP POLICY IF EXISTS "System can insert coupon_usage" ON coupon_usage;
DROP POLICY IF EXISTS "Anyone can read coupon_products" ON coupon_products;
DROP POLICY IF EXISTS "Admins can manage coupon_products" ON coupon_products;
DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;
DROP POLICY IF EXISTS "Admins can do everything on coupons" ON coupons;

-- Remover índices
DROP INDEX IF EXISTS idx_coupon_usage_order;
DROP INDEX IF EXISTS idx_coupon_usage_coupon;
DROP INDEX IF EXISTS idx_coupons_active;
DROP INDEX IF EXISTS idx_coupons_code;

-- Remover tabelas (CUIDADO: perde dados!)
DROP TABLE IF EXISTS coupon_usage CASCADE;
DROP TABLE IF EXISTS coupon_products CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;

-- Remover trigger
DROP TRIGGER IF EXISTS update_coupons_updated_at ON coupons;
DROP FUNCTION IF EXISTS update_updated_at_column();
```

#### Aplicar Rollback
```bash
supabase db push
```

---

### Nível 4: Rollback Completo de Database (LENTO)

#### Restaurar de Backup Completo
```bash
# Via Supabase Dashboard
# 1. Acessar: https://supabase.com/dashboard/project/lznckhxqbkqldedlmbfb/settings/database
# 2. Clicar em "Backups"
# 3. Selecionar backup: "pre-coupons-implementation-2026-04-22"
# 4. Clicar em "Restore"
# 5. Confirmar (ATENÇÃO: perde dados após backup!)

# Via pg_restore (backup local)
gunzip backups/backup-pre-coupons-2026-04-22.sql.gz
psql "postgresql://postgres:[PASSWORD]@db.lznckhxqbkqldedlmbfb.supabase.co:5432/postgres" \
  < backups/backup-pre-coupons-2026-04-22.sql
```

---

### Nível 5: Rollback de Edge Functions

#### Deletar Edge Function
```bash
# Via Supabase Dashboard
# Functions > validate-coupon > Delete

# Via CLI (não há comando direto, mas pode fazer redeploy de versão anterior)
# Restaurar código anterior
git checkout v1.0.0-pre-coupons -- supabase/functions/validate-coupon
supabase functions deploy validate-coupon
```

---

## 🚨 Plano de Emergência

### Cenário 1: Bug Crítico em Produção

#### Sintomas
- Checkout não funciona
- Erro 500 em massa
- Perda de vendas

#### Ação Imediata (< 5 minutos)
```bash
# 1. Desativar feature flag
VITE_FEATURE_COUPONS=false

# 2. Redeploy
vercel --prod

# 3. Monitorar logs
supabase functions logs validate-coupon --tail

# 4. Notificar equipe
```

#### Ação Secundária (< 30 minutos)
```bash
# Se feature flag não resolver:
# 1. Reverter último deploy
vercel rollback

# 2. Ou fazer deploy de tag de backup
git checkout v1.0.0-pre-coupons
vercel --prod
```

---

### Cenário 2: Corrupção de Dados

#### Sintomas
- Cupons aplicados incorretamente
- Descontos errados
- uses_count inconsistente

#### Ação Imediata (< 10 minutos)
```bash
# 1. Desativar feature
VITE_FEATURE_COUPONS=false

# 2. Analisar dados corrompidos
SELECT * FROM coupons WHERE uses_count < 0 OR uses_count > max_uses;
SELECT * FROM coupon_usage WHERE discount_applied < 0;

# 3. Corrigir dados manualmente (se possível)
UPDATE coupons SET uses_count = 0 WHERE uses_count < 0;
```

#### Ação Secundária (< 1 hora)
```bash
# Se corrupção grave:
# 1. Restaurar backup de database
# Ver "Nível 4: Rollback Completo de Database"

# 2. Reprocessar orders afetados
# Script manual para recalcular descontos
```

---

### Cenário 3: Performance Degradada

#### Sintomas
- Checkout lento (> 5s)
- Timeout em Edge Function
- Database queries lentas

#### Ação Imediata (< 15 minutos)
```bash
# 1. Verificar índices
EXPLAIN ANALYZE SELECT * FROM coupons WHERE code = 'TEST123';

# 2. Adicionar índices faltantes
CREATE INDEX CONCURRENTLY idx_coupons_code_active 
  ON coupons(code) WHERE is_active = true;

# 3. Otimizar query na Edge Function
# Adicionar cache, reduzir joins, etc.
```

---

### Cenário 4: Edge Function Falhando

#### Sintomas
- Erro 500 ao validar cupom
- Timeout (> 10s)
- Rate limit atingido

#### Ação Imediata (< 5 minutos)
```bash
# 1. Ver logs
supabase functions logs validate-coupon --tail

# 2. Desativar feature
VITE_FEATURE_COUPONS=false

# 3. Investigar erro
# - Timeout? Aumentar timeout
# - Rate limit? Adicionar cache
# - Bug? Fazer hotfix
```

---

## 📊 Monitoramento Durante Implementação

### Métricas Críticas (Monitorar 24/7)

#### 1. Disponibilidade
```bash
# Uptime do site
# Meta: > 99.9%
# Ferramenta: Vercel Analytics, UptimeRobot
```

#### 2. Performance
```bash
# Tempo de resposta do checkout
# Meta: < 2s
# Ferramenta: Vercel Analytics, Lighthouse

# Tempo de resposta da Edge Function
# Meta: < 500ms
# Ferramenta: Supabase Dashboard > Functions > Logs
```

#### 3. Erros
```bash
# Taxa de erro
# Meta: < 0.1%
# Ferramenta: Sentry, Supabase Logs

# Monitorar logs em tempo real
supabase functions logs validate-coupon --tail
```

#### 4. Negócio
```bash
# Conversão
# Baseline: 2.0%
# Meta: 2.3-2.5%
# Ferramenta: Google Analytics 4

# Taxa de uso de cupons
# Meta: 15-25%
# Query: SELECT COUNT(*) FROM coupon_usage WHERE created_at > NOW() - INTERVAL '24 hours';
```

---

### Alertas Automáticos

#### Configurar Alertas no Supabase
```bash
# Dashboard > Settings > Alerts
# - Database CPU > 80%
# - Database Memory > 80%
# - Edge Function errors > 10/min
# - Edge Function timeout > 5/min
```

#### Configurar Alertas no Vercel
```bash
# Dashboard > Settings > Alerts
# - Build failed
# - Deployment failed
# - Error rate > 1%
```

---

## ✅ Checklist Pré-Implementação

### Antes de Começar (Dia 0)
- [ ] ✅ Backup completo do banco de dados criado
- [ ] ✅ Tag Git criada: `v1.0.0-pre-coupons`
- [ ] ✅ Branch de backup criada: `backup/pre-coupons-2026-04-22`
- [ ] ✅ Backup de .env e configs
- [ ] ✅ Feature flags implementadas
- [ ] ✅ Plano de rollback revisado
- [ ] ✅ Alertas configurados
- [ ] ✅ Equipe notificada
- [ ] ✅ Janela de manutenção agendada (se necessário)

### Durante Implementação (Diário)
- [ ] Backup incremental antes de cada migration
- [ ] Commits frequentes (a cada feature pequena)
- [ ] Testes antes de avançar
- [ ] Monitorar métricas
- [ ] Documentar decisões importantes

### Antes de Deploy em Produção
- [ ] Todos os testes E2E passando
- [ ] Performance Lighthouse > 90
- [ ] Zero bugs críticos
- [ ] Smoke tests em staging OK
- [ ] Plano de rollback testado
- [ ] Equipe de plantão disponível
- [ ] Backup final criado

---

## 📞 Contatos de Emergência

### Equipe
- **Desenvolvedor Principal:** [Nome] - [Telefone]
- **Tech Lead:** [Nome] - [Telefone]
- **DevOps:** [Nome] - [Telefone]

### Suporte
- **Supabase Support:** https://supabase.com/support
- **Vercel Support:** https://vercel.com/support

### Escalação
1. **Nível 1:** Desenvolvedor resolve (< 30 min)
2. **Nível 2:** Tech Lead envolve (< 1 hora)
3. **Nível 3:** Rollback completo (< 2 horas)

---

## 🎯 Critérios de Sucesso

### Técnicos
- ✅ Zero bugs críticos em produção
- ✅ Performance mantida (< 2s checkout)
- ✅ Uptime > 99.9%
- ✅ Todos os testes passando

### Negócio
- ✅ Conversão +15-25%
- ✅ Taxa de uso de cupons 15-25%
- ✅ Zero reclamações de clientes
- ✅ Feedback positivo

---

## 📝 Documentação Pós-Implementação

### Após Conclusão
- [ ] Documentar decisões técnicas
- [ ] Atualizar README
- [ ] Criar guia de uso (admin)
- [ ] Documentar APIs (Edge Functions)
- [ ] Atualizar diagramas de arquitetura
- [ ] Fazer retrospectiva
- [ ] Celebrar! 🎉

---

**Plano criado em:** 2026-04-18 21:35 UTC  
**Início previsto:** 2026-04-22 (Segunda-feira)  
**Conclusão prevista:** 2026-05-21 (30 dias)  
**Status:** ✅ Pronto para execução

**Preparado por:** Claude (Opus 4.7)  
**Aprovado por:** [Aguardando aprovação]
