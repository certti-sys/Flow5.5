# 📁 Legado - Arquivos Históricos e Configurações Antigas

**Data de Reorganização:** 2026-05-01  
**Motivo:** Limpeza do diretório raiz do projeto

---

## 📋 Sobre Este Diretório

Este diretório contém arquivos legados, documentação histórica, configurações de ferramentas antigas e arquivos temporários que não fazem parte do sistema ativo, mas são preservados para referência histórica.

---

## 📂 Estrutura

### 1. `documentacao-analises/`
**Conteúdo:** Documentação de análises e sessões de desenvolvimento anteriores

**Subdiretórios:**
- `.agent/` - Análises do agente (Abril 2026)
  - Origem: `/.agent/`
  - Contém: Análises de melhorias, planos de ação, resumos executivos
  
- `.claude/` - Documentação Claude (Maio 2026)
  - Origem: `/.claude/`
  - Contém: Análises completas do sistema, diagnósticos, resumos de sessões
  
- `FlowMembers-Evolution-Package/` - Pacote de evolução FlowMembers
  - Origem: `/FlowMembers-Evolution-Package/`
  - Contém: Design docs, checklists de implementação, comparativos

---

### 2. `ferramentas-ai/`
**Conteúdo:** Configurações de diferentes ferramentas de IA/agentes

**Subdiretórios:**
- `.codex/` - Configuração Codex
  - Origem: `/.codex/`
  
- `.gemini/` - Configuração Gemini
  - Origem: `/.gemini/`
  
- `.kilo/` - Configuração Kilo
  - Origem: `/.kilo/`
  
- `.kiro/` - Configuração Kiro
  - Origem: `/.kiro/`
  
- `.opencode/` - Configuração OpenCode
  - Origem: `/.opencode/`
  
- `.planning/` - Configuração Planning Tool
  - Origem: `/.planning/`

---

### 3. `documentacao-antiga/`
**Conteúdo:** Documentação antiga do projeto

**Subdiretórios:**
- `DocS/` - Documentação antiga
  - Origem: `/DocS/`
  - Contém: Diagramas, índices, resumos executivos, design system docs

---

### 4. `backups/`
**Conteúdo:** Backups do sistema

**Arquivos:**
- `backup-20260418-191316/` - Backup de 18/04/2026
- `backup-20260418-191316.tar.gz` - Backup compactado

**Origem:** `/backups/`

---

### 5. `scripts-teste/`
**Conteúdo:** Scripts de teste e diagnóstico (não operacionais)

**Arquivos:**
- `diagnostico-pix-qrcode.mjs` - Diagnóstico QR Code Pix
- `test-checkout-form-schema.mjs` - Teste schema checkout
- `test-payment-ops-mercadopago-token.mjs` - Teste token Mercado Pago
- `test-payment-ops-pix-boleto.mjs` - Teste Pix/Boleto
- `test-payment-ops-schema.mjs` - Teste schema pagamentos
- `test-validate-coupon-cors.mjs` - Teste CORS cupons

**Origem:** `/scripts/` (scripts de teste movidos, operacionais mantidos)

---

### 6. `arquivos-soltos/`
**Conteúdo:** Arquivos temporários e soltos da raiz

**Arquivos:**
- `APLICAR-MIGRATION.sql` - SQL de migração temporário
  - Origem: `/APLICAR-MIGRATION.sql`
  
- `TESTAR-CUPOM.sql` - SQL de teste de cupons
  - Origem: `/TESTAR-CUPOM.sql`
  
- `deploy_payload.json` - Payload de deploy antigo
  - Origem: `/deploy_payload.json`
  
- `skills-lock.json` - Lock file de skills
  - Origem: `/skills-lock.json`

---

## 🔍 Como Usar

### Acessar Documentação Histórica
```bash
# Ver análises antigas
cat Legado/documentacao-analises/.claude/SUMARIO-EXECUTIVO-FINAL-2026-05-01.md

# Ver planos de evolução
cat Legado/documentacao-analises/FlowMembers-Evolution-Package/README.md
```

### Restaurar Configuração de Ferramenta
```bash
# Exemplo: restaurar config do Codex
cp -r Legado/ferramentas-ai/.codex .codex
```

### Acessar Backups
```bash
# Extrair backup
cd Legado/backups
tar -xzf backup-20260418-191316.tar.gz
```

---

## ⚠️ Importante

- **NÃO MODIFICAR:** Estes arquivos são históricos e não devem ser modificados
- **NÃO DELETAR:** Preservar para referência futura
- **GIT HISTORY:** Todos os moves foram feitos com `git mv` para preservar histórico

---

## 📊 Estatísticas

**Total de Diretórios Movidos:** 10  
**Total de Arquivos Movidos:** 4 (soltos) + 6 (scripts teste)  
**Espaço Liberado na Raiz:** ~15 diretórios e arquivos

---

## 🗓️ Histórico de Mudanças

### 2026-05-01
- ✅ Reorganização completa
- ✅ Criação da estrutura Legado/
- ✅ Movimentação de todos os arquivos legados
- ✅ Preservação do histórico git
