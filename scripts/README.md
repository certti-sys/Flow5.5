# 🛠️ Guia de Scripts - Neo Vidya Stream

**Data:** 2026-04-18  
**Localização:** `c:\WWW Projetos\neo-vidya-stream-main\Flow5\scripts\`

---

## 📋 Scripts Disponíveis

### 1. backup-complete.sh ⭐⭐⭐
**Propósito:** Criar backup completo antes de implementação

**Uso:**
```bash
cd "c:\WWW Projetos\neo-vidya-stream-main\Flow5"
bash scripts/backup-complete.sh
```

**O que faz:**
- ✅ Cria tag Git: `backup-YYYYMMDD-HHMMSS`
- ✅ Cria branch de backup: `backup/auto-YYYYMMDD-HHMMSS`
- ✅ Backup de configurações (.env, package.json, config.toml)
- ✅ Backup do schema do banco (via Supabase CLI)
- ✅ Backup das migrations
- ✅ Backup das Edge Functions
- ✅ Cria arquivo comprimido (.tar.gz)
- ✅ Gera arquivo de metadados (BACKUP-INFO.txt)

**Quando usar:**
- ⚠️ **OBRIGATÓRIO** antes de qualquer implementação
- Antes de aplicar migrations
- Antes de fazer deploy em produção
- Antes de mudanças críticas

**Tempo:** ~2-5 minutos

---

### 2. pre-deploy-check.sh ⭐⭐⭐
**Propósito:** Verificar se está pronto para deploy

**Uso:**
```bash
cd "c:\WWW Projetos\neo-vidya-stream-main\Flow5"
bash scripts/pre-deploy-check.sh
```

**O que verifica:**
- ✅ Git (mudanças não commitadas)
- ✅ Backups recentes (< 24h)
- ✅ Dependências (npm)
- ✅ Build (npm run build)
- ✅ TypeScript (erros de tipo)
- ✅ Configuração Supabase
- ✅ Migrations
- ✅ Edge Functions
- ✅ Testes (se configurados)
- ✅ Variáveis de ambiente

**Quando usar:**
- ⚠️ **OBRIGATÓRIO** antes de cada deploy
- Antes de aplicar migrations
- Após fazer mudanças significativas

**Tempo:** ~1-2 minutos

**Exit codes:**
- `0` = Pronto para deploy
- `1` = Não está pronto (corrigir erros)

---

### 3. rollback-emergency.sh ⭐⭐⭐
**Propósito:** Rollback de emergência em caso de falha

**Uso:**
```bash
cd "c:\WWW Projetos\neo-vidya-stream-main\Flow5"

# Listar backups disponíveis
ls -1 backups/ | grep "backup-"

# Fazer rollback para backup específico
bash scripts/rollback-emergency.sh 20260422-143000
```

**O que faz:**
- ✅ Cria backup do estado atual (antes de rollback)
- ✅ Reverte código para tag de backup
- ✅ Restaura configurações (.env, config.toml)
- ✅ Restaura migrations
- ✅ Restaura Edge Functions
- ✅ Reinstala dependências

**Quando usar:**
- 🚨 **EMERGÊNCIA** - Bug crítico em produção
- 🚨 Checkout não funciona
- 🚨 Perda de vendas
- 🚨 Erro 500 em massa

**Tempo:** ~5-10 minutos

**⚠️ ATENÇÃO:**
- Operação DESTRUTIVA
- Requer confirmação (digite "SIM")
- Não restaura dados do banco automaticamente

---

### 4. monitor-deploy.sh ⭐⭐
**Propósito:** Monitorar aplicação após deploy

**Uso:**
```bash
cd "c:\WWW Projetos\neo-vidya-stream-main\Flow5"

# Monitorar por 60 minutos (padrão)
bash scripts/monitor-deploy.sh

# Monitorar por tempo específico (em minutos)
bash scripts/monitor-deploy.sh 120
```

**O que monitora:**
- ✅ Status do site (online/offline)
- ✅ Edge Functions
- ✅ Git status
- ✅ Uso de disco
- ✅ Erros recentes

**Quando usar:**
- Após deploy em produção
- Durante rollout gradual (10% → 50% → 100%)
- Primeiras 24h após implementação

**Tempo:** Configurável (padrão: 60 minutos)

**Output:**
- Console (tempo real)
- Log file: `logs/monitor-YYYYMMDD-HHMMSS.log`

---

## 🚀 Fluxo de Trabalho Recomendado

### Antes de Implementar (Dia 0)
```bash
# 1. Criar backup completo
bash scripts/backup-complete.sh

# 2. Verificar se está pronto
bash scripts/pre-deploy-check.sh

# 3. Se OK, começar implementação
git checkout -b feature/coupons-system
```

---

### Durante Implementação (Dias 1-14)
```bash
# Antes de cada migration
bash scripts/backup-complete.sh
supabase db push

# Commits frequentes
git add .
git commit -m "feat: [descrição]"
git push origin feature/coupons-system
```

---

### Antes de Deploy em Produção (Dia 14)
```bash
# 1. Backup final
bash scripts/backup-complete.sh

# 2. Verificação completa
bash scripts/pre-deploy-check.sh

# 3. Se OK, fazer deploy
vercel --prod

# 4. Iniciar monitoramento
bash scripts/monitor-deploy.sh 120
```

---

### Em Caso de Emergência
```bash
# 1. Listar backups
ls -1 backups/ | grep "backup-"

# 2. Fazer rollback
bash scripts/rollback-emergency.sh 20260422-143000

# 3. Verificar se funcionou
npm run dev

# 4. Deploy da versão anterior
vercel --prod
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Implementação Normal
```bash
# Dia 0 - Preparação
cd "c:\WWW Projetos\neo-vidya-stream-main\Flow5"
bash scripts/backup-complete.sh
bash scripts/pre-deploy-check.sh

# Dia 1 - Começar implementação
git checkout -b feature/coupons-system
# ... implementar ...
git commit -m "feat(db): add coupons schema"

# Dia 14 - Deploy
bash scripts/backup-complete.sh
bash scripts/pre-deploy-check.sh
vercel --prod
bash scripts/monitor-deploy.sh 120
```

---

### Exemplo 2: Rollback de Emergência
```bash
# Detectar problema em produção
# Checkout não funciona, erro 500

# 1. Listar backups
ls -1 backups/ | grep "backup-"
# Output: backup-20260422-143000

# 2. Fazer rollback
bash scripts/rollback-emergency.sh 20260422-143000
# Digite "SIM" para confirmar

# 3. Verificar localmente
npm run dev
# Testar checkout

# 4. Deploy
vercel --prod

# 5. Monitorar
bash scripts/monitor-deploy.sh 60
```

---

### Exemplo 3: Verificação Antes de Deploy
```bash
# Executar verificação
bash scripts/pre-deploy-check.sh

# Output esperado:
# [1/10] Verificando Git...
# ✓ Sem mudanças não commitadas
# [2/10] Verificando backups...
# ✓ Backup recente encontrado: backup-20260422-143000
# ...
# === RESUMO ===
# Erros: 0
# Avisos: 0
# ✓ PRONTO PARA DEPLOY

# Se houver erros:
# === RESUMO ===
# Erros: 2
# Avisos: 1
# ✗ NÃO ESTÁ PRONTO PARA DEPLOY
# Corrija os erros antes de fazer deploy.
```

---

## 🛡️ Boas Práticas

### 1. Sempre Fazer Backup
```bash
# ANTES de qualquer mudança crítica
bash scripts/backup-complete.sh
```

### 2. Verificar Antes de Deploy
```bash
# SEMPRE executar antes de deploy
bash scripts/pre-deploy-check.sh
```

### 3. Monitorar Após Deploy
```bash
# Primeiras 2 horas após deploy
bash scripts/monitor-deploy.sh 120
```

### 4. Manter Backups Organizados
```bash
# Listar backups por data
ls -lt backups/ | head -10

# Remover backups antigos (> 30 dias)
find backups/ -name "backup-*" -mtime +30 -delete
```

### 5. Documentar Rollbacks
```bash
# Sempre documentar motivo do rollback
echo "Rollback devido a: [motivo]" >> backups/rollback-log.txt
echo "Data: $(date)" >> backups/rollback-log.txt
echo "Backup restaurado: $BACKUP_TIMESTAMP" >> backups/rollback-log.txt
```

---

## 🔧 Troubleshooting

### Problema: Script não executa
```bash
# Dar permissão de execução
chmod +x scripts/*.sh

# Ou executar com bash explicitamente
bash scripts/backup-complete.sh
```

### Problema: Supabase CLI não encontrado
```bash
# Instalar Supabase CLI
npm install -g supabase

# Verificar instalação
supabase --version
```

### Problema: Backup muito grande
```bash
# Verificar tamanho
du -sh backups/backup-*

# Comprimir backups antigos
cd backups
for dir in backup-*/; do
    tar -czf "${dir%/}.tar.gz" "$dir" && rm -rf "$dir"
done
```

### Problema: Git tag já existe
```bash
# Remover tag antiga
git tag -d backup-20260422-143000
git push origin :refs/tags/backup-20260422-143000

# Criar nova tag
bash scripts/backup-complete.sh
```

---

## 📞 Suporte

### Dúvidas sobre Scripts
- Ler este guia completo
- Verificar comentários nos scripts
- Testar em ambiente local primeiro

### Problemas com Backup/Rollback
- Verificar logs em `logs/`
- Verificar backups em `backups/`
- Consultar `BACKUP-INFO.txt` em cada backup

### Emergências
- Usar `rollback-emergency.sh` imediatamente
- Notificar equipe
- Documentar incidente

---

## ✅ Checklist de Scripts

### Antes de Começar Implementação
- [ ] Scripts criados em `scripts/`
- [ ] Permissões de execução configuradas
- [ ] Supabase CLI instalado
- [ ] Git configurado
- [ ] Testado `backup-complete.sh`
- [ ] Testado `pre-deploy-check.sh`

### Durante Implementação
- [ ] Backup antes de cada migration
- [ ] Verificação antes de cada deploy
- [ ] Commits frequentes
- [ ] Documentação de decisões

### Após Deploy
- [ ] Monitoramento ativo (2h)
- [ ] Logs revisados
- [ ] Métricas coletadas
- [ ] Rollback testado (em staging)

---

**Criado em:** 2026-04-18  
**Última atualização:** 2026-04-18  
**Versão:** 1.0
