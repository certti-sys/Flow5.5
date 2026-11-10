# Legacy Files Reorganization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize legacy files, documentation, and AI tool configurations into a structured `Legado/` directory to clean up the project root.

**Architecture:** Create hierarchical directory structure under `Legado/` with categorized subdirectories. Use `git mv` for all moves to preserve file history. Create comprehensive README index.

**Tech Stack:** Git, Bash/PowerShell, Markdown

---

## File Structure

**Directories to Create:**
- `Legado/` - Root legacy directory
- `Legado/documentacao-analises/` - Analysis documentation
- `Legado/ferramentas-ai/` - AI tool configurations
- `Legado/documentacao-antiga/` - Old project documentation
- `Legado/backups/` - System backups
- `Legado/scripts-teste/` - Test/diagnostic scripts
- `Legado/arquivos-soltos/` - Loose files

**Files to Move:**
- `.agent/` → `Legado/documentacao-analises/.agent/`
- `.claude/` → `Legado/documentacao-analises/.claude/`
- `FlowMembers-Evolution-Package/` → `Legado/documentacao-analises/FlowMembers-Evolution-Package/`
- `.codex/` → `Legado/ferramentas-ai/.codex/`
- `.gemini/` → `Legado/ferramentas-ai/.gemini/`
- `.kilo/` → `Legado/ferramentas-ai/.kilo/`
- `.kiro/` → `Legado/ferramentas-ai/.kiro/`
- `.opencode/` → `Legado/ferramentas-ai/.opencode/`
- `.planning/` → `Legado/ferramentas-ai/.planning/`
- `DocS/` → `Legado/documentacao-antiga/DocS/`
- `backups/` → `Legado/backups/`
- Test scripts → `Legado/scripts-teste/`
- Loose files → `Legado/arquivos-soltos/`

**Files to Create:**
- `Legado/README.md` - Index and documentation

---

## Task 1: Create Directory Structure

**Files:**
- Create: `Legado/` (root)
- Create: `Legado/documentacao-analises/`
- Create: `Legado/ferramentas-ai/`
- Create: `Legado/documentacao-antiga/`
- Create: `Legado/backups/`
- Create: `Legado/scripts-teste/`
- Create: `Legado/arquivos-soltos/`

- [ ] **Step 1: Create Legado root directory**

```bash
mkdir Legado
```

Expected: Directory created successfully

- [ ] **Step 2: Create all subdirectories**

```bash
mkdir -p Legado/documentacao-analises
mkdir -p Legado/ferramentas-ai
mkdir -p Legado/documentacao-antiga
mkdir -p Legado/backups
mkdir -p Legado/scripts-teste
mkdir -p Legado/arquivos-soltos
```

Expected: All subdirectories created

- [ ] **Step 3: Verify directory structure**

```bash
ls -la Legado/
```

Expected output:
```
documentacao-analises/
ferramentas-ai/
documentacao-antiga/
backups/
scripts-teste/
arquivos-soltos/
```

---

## Task 2: Move Analysis Documentation

**Files:**
- Move: `.agent/` → `Legado/documentacao-analises/.agent/`
- Move: `.claude/` → `Legado/documentacao-analises/.claude/`
- Move: `FlowMembers-Evolution-Package/` → `Legado/documentacao-analises/FlowMembers-Evolution-Package/`

- [ ] **Step 1: Move .agent directory**

```bash
git mv .agent Legado/documentacao-analises/.agent
```

Expected: `.agent/` moved, git tracks as rename

- [ ] **Step 2: Move .claude directory**

```bash
git mv .claude Legado/documentacao-analises/.claude
```

Expected: `.claude/` moved, git tracks as rename

- [ ] **Step 3: Move FlowMembers-Evolution-Package directory**

```bash
git mv FlowMembers-Evolution-Package Legado/documentacao-analises/FlowMembers-Evolution-Package
```

Expected: `FlowMembers-Evolution-Package/` moved, git tracks as rename

- [ ] **Step 4: Verify moves**

```bash
ls -la Legado/documentacao-analises/
```

Expected output:
```
.agent/
.claude/
FlowMembers-Evolution-Package/
```

- [ ] **Step 5: Verify git status shows renames**

```bash
git status
```

Expected: Shows renamed files, not deleted + added

---

## Task 3: Move AI Tool Configurations

**Files:**
- Move: `.codex/` → `Legado/ferramentas-ai/.codex/`
- Move: `.gemini/` → `Legado/ferramentas-ai/.gemini/`
- Move: `.kilo/` → `Legado/ferramentas-ai/.kilo/`
- Move: `.kiro/` → `Legado/ferramentas-ai/.kiro/`
- Move: `.opencode/` → `Legado/ferramentas-ai/.opencode/`
- Move: `.planning/` → `Legado/ferramentas-ai/.planning/`

- [ ] **Step 1: Move .codex directory**

```bash
git mv .codex Legado/ferramentas-ai/.codex
```

Expected: `.codex/` moved

- [ ] **Step 2: Move .gemini directory**

```bash
git mv .gemini Legado/ferramentas-ai/.gemini
```

Expected: `.gemini/` moved

- [ ] **Step 3: Move .kilo directory**

```bash
git mv .kilo Legado/ferramentas-ai/.kilo
```

Expected: `.kilo/` moved

- [ ] **Step 4: Move .kiro directory**

```bash
git mv .kiro Legado/ferramentas-ai/.kiro
```

Expected: `.kiro/` moved

- [ ] **Step 5: Move .opencode directory**

```bash
git mv .opencode Legado/ferramentas-ai/.opencode
```

Expected: `.opencode/` moved

- [ ] **Step 6: Move .planning directory**

```bash
git mv .planning Legado/ferramentas-ai/.planning
```

Expected: `.planning/` moved

- [ ] **Step 7: Verify moves**

```bash
ls -la Legado/ferramentas-ai/
```

Expected output:
```
.codex/
.gemini/
.kilo/
.kiro/
.opencode/
.planning/
```

---

## Task 4: Move Old Documentation

**Files:**
- Move: `DocS/` → `Legado/documentacao-antiga/DocS/`

- [ ] **Step 1: Move DocS directory**

```bash
git mv DocS Legado/documentacao-antiga/DocS
```

Expected: `DocS/` moved

- [ ] **Step 2: Verify move**

```bash
ls -la Legado/documentacao-antiga/
```

Expected output:
```
DocS/
```

---

## Task 5: Move Backups

**Files:**
- Move: `backups/` → `Legado/backups/`

- [ ] **Step 1: Move backups directory contents**

```bash
git mv backups/* Legado/backups/ 2>/dev/null || mv backups/* Legado/backups/
```

Expected: All backup contents moved

- [ ] **Step 2: Remove empty backups directory**

```bash
rmdir backups
```

Expected: Empty directory removed

- [ ] **Step 3: Verify move**

```bash
ls -la Legado/backups/
```

Expected output:
```
backup-20260418-191316/
backup-20260418-191316.tar.gz
```

---

## Task 6: Move Test Scripts

**Files:**
- Move: `scripts/diagnostico-pix-qrcode.mjs` → `Legado/scripts-teste/diagnostico-pix-qrcode.mjs`
- Move: `scripts/test-checkout-form-schema.mjs` → `Legado/scripts-teste/test-checkout-form-schema.mjs`
- Move: `scripts/test-payment-ops-mercadopago-token.mjs` → `Legado/scripts-teste/test-payment-ops-mercadopago-token.mjs`
- Move: `scripts/test-payment-ops-pix-boleto.mjs` → `Legado/scripts-teste/test-payment-ops-pix-boleto.mjs`
- Move: `scripts/test-payment-ops-schema.mjs` → `Legado/scripts-teste/test-payment-ops-schema.mjs`
- Move: `scripts/test-validate-coupon-cors.mjs` → `Legado/scripts-teste/test-validate-coupon-cors.mjs`

- [ ] **Step 1: Move diagnostico-pix-qrcode.mjs**

```bash
git mv scripts/diagnostico-pix-qrcode.mjs Legado/scripts-teste/diagnostico-pix-qrcode.mjs
```

Expected: File moved

- [ ] **Step 2: Move test-checkout-form-schema.mjs**

```bash
git mv scripts/test-checkout-form-schema.mjs Legado/scripts-teste/test-checkout-form-schema.mjs
```

Expected: File moved

- [ ] **Step 3: Move test-payment-ops-mercadopago-token.mjs**

```bash
git mv scripts/test-payment-ops-mercadopago-token.mjs Legado/scripts-teste/test-payment-ops-mercadopago-token.mjs
```

Expected: File moved

- [ ] **Step 4: Move test-payment-ops-pix-boleto.mjs**

```bash
git mv scripts/test-payment-ops-pix-boleto.mjs Legado/scripts-teste/test-payment-ops-pix-boleto.mjs
```

Expected: File moved

- [ ] **Step 5: Move test-payment-ops-schema.mjs**

```bash
git mv scripts/test-payment-ops-schema.mjs Legado/scripts-teste/test-payment-ops-schema.mjs
```

Expected: File moved

- [ ] **Step 6: Move test-validate-coupon-cors.mjs**

```bash
git mv scripts/test-validate-coupon-cors.mjs Legado/scripts-teste/test-validate-coupon-cors.mjs
```

Expected: File moved

- [ ] **Step 7: Verify moves**

```bash
ls -la Legado/scripts-teste/
```

Expected: All 6 test scripts present

- [ ] **Step 8: Verify operational scripts remain**

```bash
ls -la scripts/
```

Expected output:
```
backup-complete.sh
monitor-deploy.sh
pre-deploy-check.sh
rollback-emergency.sh
README.md
```

---

## Task 7: Move Loose Files

**Files:**
- Move: `APLICAR-MIGRATION.sql` → `Legado/arquivos-soltos/APLICAR-MIGRATION.sql`
- Move: `TESTAR-CUPOM.sql` → `Legado/arquivos-soltos/TESTAR-CUPOM.sql`
- Move: `deploy_payload.json` → `Legado/arquivos-soltos/deploy_payload.json`
- Move: `skills-lock.json` → `Legado/arquivos-soltos/skills-lock.json`

- [ ] **Step 1: Move APLICAR-MIGRATION.sql**

```bash
git mv APLICAR-MIGRATION.sql Legado/arquivos-soltos/APLICAR-MIGRATION.sql
```

Expected: File moved

- [ ] **Step 2: Move TESTAR-CUPOM.sql**

```bash
git mv TESTAR-CUPOM.sql Legado/arquivos-soltos/TESTAR-CUPOM.sql
```

Expected: File moved

- [ ] **Step 3: Move deploy_payload.json**

```bash
git mv deploy_payload.json Legado/arquivos-soltos/deploy_payload.json
```

Expected: File moved

- [ ] **Step 4: Move skills-lock.json**

```bash
git mv skills-lock.json Legado/arquivos-soltos/skills-lock.json
```

Expected: File moved

- [ ] **Step 5: Verify moves**

```bash
ls -la Legado/arquivos-soltos/
```

Expected output:
```
APLICAR-MIGRATION.sql
TESTAR-CUPOM.sql
deploy_payload.json
skills-lock.json
```

---

## Task 8: Create Legado README

**Files:**
- Create: `Legado/README.md`

- [ ] **Step 1: Create README.md**

```markdown
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
```

Save to: `Legado/README.md`

- [ ] **Step 2: Verify README created**

```bash
cat Legado/README.md | head -20
```

Expected: README content displayed

---

## Task 9: Git Commit

**Files:**
- Stage: All moved files and new README

- [ ] **Step 1: Check git status**

```bash
git status
```

Expected: Shows all renames and new files

- [ ] **Step 2: Stage all changes**

```bash
git add -A
```

Expected: All changes staged

- [ ] **Step 3: Verify staged changes**

```bash
git status
```

Expected: All files in staging area, shows renames not delete+add

- [ ] **Step 4: Commit with descriptive message**

```bash
git commit -m "$(cat <<'EOF'
refactor: reorganize legacy files into Legado/ directory

- Move analysis documentation (.agent, .claude, FlowMembers-Evolution-Package)
- Move AI tool configs (.codex, .gemini, .kilo, .kiro, .opencode, .planning)
- Move old documentation (DocS)
- Move backups to Legado/backups
- Move test scripts to Legado/scripts-teste
- Move loose files (SQL, JSON) to Legado/arquivos-soltos
- Create comprehensive Legado/README.md index
- Preserve git history with git mv

Root directory now contains only active project files.

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>
EOF
)"
```

Expected: Commit created successfully

- [ ] **Step 5: Verify commit**

```bash
git log -1 --stat
```

Expected: Shows commit with file renames

---

## Task 10: Verification

**Files:**
- Verify: Root directory structure
- Verify: Legado directory structure
- Verify: Git history preservation

- [ ] **Step 1: Verify root directory is clean**

```bash
ls -la | grep -E "^\." | grep -v "^\.\.$" | grep -v "^\.$" | grep -v ".git$" | grep -v ".env" | grep -v ".gitignore" | grep -v ".agents"
```

Expected: Only `.git`, `.env`, `.env.example`, `.gitignore`, `.agents` remain

- [ ] **Step 2: Verify Legado structure**

```bash
tree Legado -L 2 -a
```

Expected output:
```
Legado/
├── README.md
├── arquivos-soltos/
│   ├── APLICAR-MIGRATION.sql
│   ├── TESTAR-CUPOM.sql
│   ├── deploy_payload.json
│   └── skills-lock.json
├── backups/
│   ├── backup-20260418-191316/
│   └── backup-20260418-191316.tar.gz
├── documentacao-analises/
│   ├── .agent/
│   ├── .claude/
│   └── FlowMembers-Evolution-Package/
├── documentacao-antiga/
│   └── DocS/
├── ferramentas-ai/
│   ├── .codex/
│   ├── .gemini/
│   ├── .kilo/
│   ├── .kiro/
│   ├── .opencode/
│   └── .planning/
└── scripts-teste/
    ├── diagnostico-pix-qrcode.mjs
    ├── test-checkout-form-schema.mjs
    ├── test-payment-ops-mercadopago-token.mjs
    ├── test-payment-ops-pix-boleto.mjs
    ├── test-payment-ops-schema.mjs
    └── test-validate-coupon-cors.mjs
```

- [ ] **Step 3: Verify git history preserved**

```bash
git log --follow --oneline Legado/documentacao-analises/.agent/README.md | head -5
```

Expected: Shows commit history from original location

- [ ] **Step 4: Verify no broken references in source code**

```bash
grep -r "\.agent\|\.claude\|\.codex\|\.gemini\|\.kilo\|\.kiro\|\.opencode\|\.planning\|DocS\|FlowMembers" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"
```

Expected: No output (no references found)

- [ ] **Step 5: Test build**

```bash
npm run build
```

Expected: Build succeeds without errors

- [ ] **Step 6: Test dev server (optional)**

```bash
npm run dev
```

Expected: Dev server starts successfully (Ctrl+C to stop)

---

## Success Criteria

✅ All legacy files moved to `Legado/` with organized structure  
✅ Root directory contains only active project files  
✅ Git history preserved (renames tracked)  
✅ Comprehensive README.md created  
✅ No broken references in source code  
✅ Build and dev server work correctly  

---

## Rollback Plan

If issues arise:

```bash
# Undo the commit
git reset --hard HEAD~1

# All files return to original locations
# No data loss due to git tracking
```

---

## Estimated Time

**Total:** 15-20 minutes
- Task 1: 2 min
- Task 2: 2 min
- Task 3: 3 min
- Task 4: 1 min
- Task 5: 1 min
- Task 6: 2 min
- Task 7: 2 min
- Task 8: 3 min
- Task 9: 2 min
- Task 10: 3 min
