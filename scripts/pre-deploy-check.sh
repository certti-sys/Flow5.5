#!/bin/bash
# Script de Verificação Pré-Deploy - Neo Vidya Stream
# Data: 2026-04-18
# Uso: ./pre-deploy-check.sh

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="c:/WWW Projetos/neo-vidya-stream-main/Flow5"
cd "$PROJECT_DIR"

echo -e "${BLUE}=== VERIFICAÇÃO PRÉ-DEPLOY ===${NC}"
echo "Data: $(date)"
echo ""

ERRORS=0
WARNINGS=0

# 1. Verificar Git
echo -e "${YELLOW}[1/10] Verificando Git...${NC}"
if git diff --quiet && git diff --cached --quiet; then
    echo "✓ Sem mudanças não commitadas"
else
    echo -e "${RED}✗ Existem mudanças não commitadas${NC}"
    ERRORS=$((ERRORS + 1))
fi

CURRENT_BRANCH=$(git branch --show-current)
echo "  Branch atual: $CURRENT_BRANCH"

# 2. Verificar backup recente
echo -e "${YELLOW}[2/10] Verificando backups...${NC}"
LATEST_BACKUP=$(ls -t backups/ | grep "backup-" | head -1)
if [ -n "$LATEST_BACKUP" ]; then
    BACKUP_AGE=$(find "backups/$LATEST_BACKUP" -mtime +1 2>/dev/null)
    if [ -z "$BACKUP_AGE" ]; then
        echo "✓ Backup recente encontrado: $LATEST_BACKUP"
    else
        echo -e "${YELLOW}⚠ Último backup tem mais de 24h: $LATEST_BACKUP${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}✗ Nenhum backup encontrado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 3. Verificar dependências
echo -e "${YELLOW}[3/10] Verificando dependências...${NC}"
if [ -f "package-lock.json" ]; then
    if npm list --depth=0 > /dev/null 2>&1; then
        echo "✓ Dependências OK"
    else
        echo -e "${RED}✗ Problemas com dependências${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠ package-lock.json não encontrado${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 4. Verificar build
echo -e "${YELLOW}[4/10] Verificando build...${NC}"
if npm run build > /dev/null 2>&1; then
    echo "✓ Build OK"
else
    echo -e "${RED}✗ Build falhou${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 5. Verificar TypeScript
echo -e "${YELLOW}[5/10] Verificando TypeScript...${NC}"
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✓ TypeScript OK"
else
    echo -e "${YELLOW}⚠ Erros de TypeScript encontrados${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 6. Verificar Supabase config
echo -e "${YELLOW}[6/10] Verificando Supabase...${NC}"
if [ -f ".env" ] && grep -q "VITE_SUPABASE_URL" .env; then
    echo "✓ Configuração Supabase encontrada"
else
    echo -e "${RED}✗ Configuração Supabase não encontrada${NC}"
    ERRORS=$((ERRORS + 1))
fi

# 7. Verificar migrations
echo -e "${YELLOW}[7/10] Verificando migrations...${NC}"
if [ -d "supabase/migrations" ]; then
    MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
    echo "✓ $MIGRATION_COUNT migrations encontradas"
else
    echo -e "${YELLOW}⚠ Diretório migrations não encontrado${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 8. Verificar Edge Functions
echo -e "${YELLOW}[8/10] Verificando Edge Functions...${NC}"
if [ -d "supabase/functions" ]; then
    FUNCTION_COUNT=$(ls -d supabase/functions/*/ 2>/dev/null | wc -l)
    echo "✓ $FUNCTION_COUNT Edge Functions encontradas"
else
    echo -e "${YELLOW}⚠ Diretório functions não encontrado${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 9. Verificar testes (se existirem)
echo -e "${YELLOW}[9/10] Verificando testes...${NC}"
if grep -q "\"test\"" package.json; then
    if npm test > /dev/null 2>&1; then
        echo "✓ Testes passando"
    else
        echo -e "${YELLOW}⚠ Alguns testes falharam${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo "  Sem testes configurados"
fi

# 10. Verificar .env
echo -e "${YELLOW}[10/10] Verificando variáveis de ambiente...${NC}"
REQUIRED_VARS=("VITE_SUPABASE_URL" "VITE_SUPABASE_ANON_KEY")
for var in "${REQUIRED_VARS[@]}"; do
    if grep -q "$var" .env 2>/dev/null; then
        echo "  ✓ $var"
    else
        echo -e "  ${RED}✗ $var não encontrada${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# Resumo
echo ""
echo -e "${BLUE}=== RESUMO ===${NC}"
echo "Erros: $ERRORS"
echo "Avisos: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ PRONTO PARA DEPLOY${NC}"
    echo ""
    echo "Próximos passos:"
    echo "1. Fazer backup: ./scripts/backup-complete.sh"
    echo "2. Deploy: vercel --prod"
    echo "3. Monitorar: supabase functions logs --tail"
    exit 0
else
    echo -e "${RED}✗ NÃO ESTÁ PRONTO PARA DEPLOY${NC}"
    echo ""
    echo "Corrija os erros antes de fazer deploy."
    exit 1
fi
