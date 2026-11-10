# RELATÓRIO DE ANÁLISE - Arquivos da Raiz do Projeto Flow5.5

**Projeto:** `C:\Zapo API\Flow5.5`  
**Data da Análise:** 07/11/2026  
**Objetivo:** Identificar arquivos legados, documentações antigas, e itens para possível migração/organização em pastas

---

## 1. ESTRUTURA DA RAIZ DO PROJETO

### 1.1 Diretórios Principais (Ativos)

| Diretório | Propósito | Status |
|-----------|-----------|--------|
| `src/` | Código fonte principal do frontend (React/TypeScript) | ✅ ATIVO |
| `supabase/` | Banco de dados, migrations, Edge Functions, config | ✅ ATIVO |
| `public/` | Assets estáticos (favicon, robots.txt, placeholder) | ✅ ATIVO |
| `scripts/` | Scripts de deploy, backup, monitoramento | ✅ ATIVO |
| `docs/` | Documentação do projeto | ✅ ATIVO |
| `dist/` | Build de produção | ✅ ATIVO |
| `node_modules/` | Dependências npm | ✅ ATIVO |
| `.agents/` | Configurações de skills do OpenCode | ✅ ATIVO |
| `FlowMembers-Evolution-Package/` | Pacote de evolução do sistema | ⚠️ REVISAR |

### 1.2 Arquivos de Configuração da Raiz (Ativos)

| Arquivo | Tamanho | Propósito |
|---------|---------|-----------|
| `package.json` | 3 KB | Dependências e scripts npm |
| `package-lock.json` | 271 KB | Lockfile de dependências |
| `vite.config.ts` | 2 KB | Configuração do Vite |
| `tailwind.config.ts` | 3 KB | Configuração do Tailwind CSS |
| `tsconfig.json` | 0.4 KB | Configuração TypeScript |
| `tsconfig.app.json` | 0.6 KB | Configuração TS (app) |
| `tsconfig.node.json` | 0.5 KB | Configuração TS (node) |
| `postcss.config.js` | 0.1 KB | Configuração PostCSS |
| `eslint.config.js` | 0.7 KB | Configuração ESLint |
| `components.json` | 0.4 KB | Configuração shadcn/ui |
| `vercel.json` | 1.5 KB | Configuração Vercel |
| `.gitignore` | 0.3 KB | Arquivos ignorados pelo git |
| `.env` | 0.4 KB | Variáveis de ambiente (LOCAL) |
| `.env.example` | 0.2 KB | Exemplo de variáveis de ambiente |
| `index.html` | 4.1 KB | Ponto de entrada HTML |
| `skills-lock.json` | 0.3 KB | Lockfile de skills do OpenCode |

### 1.3 Arquivos de Documentação/Relatório na Raiz

| Arquivo | Tamanho | Observação |
|---------|---------|------------|
| `RELATORIO_REVISAO_WEBHOOKS.md` | 18.3 KB | Relatório de revisão de webhooks (gerado recentemente) |

---

## 2. DIRETÓRIO LEGADO - `Legado/`

Este diretório contém material antigo e deve ser tratado como **legacy/deprecated**. Contém os seguintes subdiretórios:

| Subdiretório | Descrição | Status |
|--------------|-----------|--------|
| `.agent/` | Configurações de agente antigos | 🗑️ LEGADO |
| `.planning/` | Documentação de planejamento antigo (ARCHITECTURE.md, CONCERNS.md, ROADMAP.md, etc.) | 🗑️ DOC ANTIGA |
| `arquivos-soltos/` | Arquivos soltos/dispersos | 🗑️ LEGADO |
| `backups/` | Backups antigos do sistema | 🗑️ BACKUP ANTIGO |
| `documentacao-analises/` | Documentações de análises antigas | 🗑️ DOC ANTIGA |
| `documentacao-antiga/` | Documentação explícitamente marcada como antiga | 🗑️ DOC ANTIGA |
| `ferramentas-ai/` | Ferramentas de IA antigas (inclui worktrees com .kilo, etc.) | 🗑️ LEGADO |
| `scripts-teste/` | Scripts de teste antigos (Pix, MercadoPago, coupon, etc.) | 🗑️ TESTE ANTIGO |

### 2.1 Detalhamento do `Legado/documentacao-antiga/`

Contém documentação explícitamente marcada como antiga, incluindo:
- `DocS/` - Documentação de sistemas antigos
- Worktrees antigos com arquivos `.env`, `.env.example`

### 2.2 Detalhamento do `Legado/documentacao-analises/`

Contém análises antigas, incluindo:
- Worktrees de agentes (`agent-a09de71c`, etc.) com arquivos `.env.example`
- Análises de banco de dados legado

### 2.3 Detalhamento do `Legado/backups/`

Contém backups antigos, incluindo:
- `backup-20260418-191316/` - Backup de abril de 2026 com `.env.backup`
- Migrations backup

---

## 3. CLASSIFICAÇÃO POR CATEGORIA

### ✅ ATIVO (Manter na raiz ou pastas atuais)

```
Arquivos de configuração: package.json, tsconfig*.json, vite.config.ts,
tailwind.config.ts, postcss.config.js, eslint.config.js,
components.json, vercel.json, .gitignore, .env, .env.example,
index.html, skills-lock.json

Código fonte: src/, supabase/, public/, scripts/
Configurações de agente: .agents/
Build: dist/
```

### 🗑️ LEGADO (Candidato a mover para pasta de legado)

```
Todo o conteúdo de: Legado/
  - .agent/
  - .planning/ (documentação de planejamento antigo)
  - arquivos-soltos/
  - backups/ (backups de abril de 2026)
  - documentacao-analises/
  - documentacao-antiga/
  - ferramentas-ai/ (inclui worktrees antigos)
  - scripts-teste/ (scripts de teste de Pix, MercadoPago, etc.)
```

### 📄 DOCUMENTAÇÃO (Pode ser movida para docs/ ou arquivada)

```
RELATORIO_REVISAO_WEBHOOKS.md (relatório técnico recente, manter acessível)
```

---

## 4. RECOMENDAÇÃO DE ORGANIZAÇÃO

### Pastas Sugeridas para Criação:

```
Legado/
├── documentacao-antiga/     <- Já existe
├── documentacao-analises/   <- Já existe
├── backups/                 <- Já existe
├── scripts-teste/           <- Já existe
├── ferramentas-ai/          <- Já existe
├── .planning/               <- Já existe
├── .agent/                  <- Já existe
└── arquivos-soltos/         <- Já existe

docs/
├── analises/                <- Mover RELATORIO_REVISAO_WEBHOOKS.md aqui
└── legado/                  <- Documentação antiga consolidada
```

### Arquivos que NÃO devem ser movidos (estão corretos na raiz):

- Todos os arquivos de configuração listados na seção 1.2
- `src/`, `supabase/`, `public/`, `scripts/`, `docs/`, `dist/`, `node_modules/`, `.agents/`

---

## 5. RESUMO EXECUTIVO

| Categoria | Quantidade | Ação Recomendada |
|-----------|------------|------------------|
| Arquivos de raiz ativos | 18 | Manter |
| Diretórios ativos | 9 | Manter |
| Diretório Legado/ | 8 subdiretórios | Arquivar/mover |
| Documentação na raiz | 1 arquivo | Revisar e arquivar |

O diretório `Legado/` contém aproximadamente **centenas de arquivos** de código, documentação, backups e scripts de teste que não fazem parte do sistema ativo atual e devem ser organizados ou arquivados.

---
