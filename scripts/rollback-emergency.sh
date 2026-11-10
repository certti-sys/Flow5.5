#!/bin/bash
# Script de Rollback de Emergência - Neo Vidya Stream
# Data: 2026-04-18
# Uso: ./rollback-emergency.sh [backup-timestamp]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Verificar argumento
if [ -z "$1" ]; then
    echo -e "${RED}Erro: Especifique o timestamp do backup${NC}"
    echo "Uso: ./rollback-emergency.sh [backup-timestamp]"
    echo ""
    echo "Backups disponíveis:"
    ls -1 backups/ | grep "backup-" | head -10
    exit 1
fi

BACKUP_TIMESTAMP=$1
PROJECT_DIR="c:/WWW Projetos/neo-vidya-stream-main/Flow5"
BACKUP_DIR="$PROJECT_DIR/backups/backup-$BACKUP_TIMESTAMP"

echo -e "${RED}=== ROLLBACK DE EMERGÊNCIA ===${NC}"
echo -e "${RED}ATENÇÃO: Esta operação é DESTRUTIVA!${NC}"
echo ""
echo "Backup a restaurar: $BACKUP_TIMESTAMP"
echo "Localização: $BACKUP_DIR"
echo ""

# Verificar se backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    # Tentar descomprimir
    if [ -f "$PROJECT_DIR/backups/backup-$BACKUP_TIMESTAMP.tar.gz" ]; then
        echo "Descomprimindo backup..."
        cd "$PROJECT_DIR/backups"
        tar -xzf "backup-$BACKUP_TIMESTAMP.tar.gz"
    else
        echo -e "${RED}Erro: Backup não encontrado!${NC}"
        exit 1
    fi
fi

# Confirmação
read -p "Tem certeza que deseja fazer rollback? (digite 'SIM' para confirmar): " confirm
if [ "$confirm" != "SIM" ]; then
    echo "Rollback cancelado."
    exit 0
fi

cd "$PROJECT_DIR"

# 1. Criar backup do estado atual (antes de rollback)
echo -e "${YELLOW}[1/5] Criando backup do estado atual...${NC}"
CURRENT_TIMESTAMP=$(date +%Y%m%d-%H%M%S)
git tag -a "pre-rollback-$CURRENT_TIMESTAMP" -m "Estado antes de rollback para $BACKUP_TIMESTAMP"
echo "✓ Tag criada: pre-rollback-$CURRENT_TIMESTAMP"

# 2. Rollback do código (Git)
echo -e "${YELLOW}[2/5] Revertendo código...${NC}"
git checkout "backup-$BACKUP_TIMESTAMP" 2>/dev/null || {
    echo -e "${RED}Erro: Tag backup-$BACKUP_TIMESTAMP não encontrada${NC}"
    exit 1
}
echo "✓ Código revertido para backup-$BACKUP_TIMESTAMP"

# 3. Restaurar configurações
echo -e "${YELLOW}[3/5] Restaurando configurações...${NC}"
cp "$BACKUP_DIR/.env.backup" .env 2>/dev/null && echo "✓ .env restaurado" || echo "⚠ .env não restaurado"
cp "$BACKUP_DIR/.env.local.backup" .env.local 2>/dev/null && echo "✓ .env.local restaurado" || echo "⚠ .env.local não restaurado"
cp "$BACKUP_DIR/config.toml.backup" supabase/config.toml 2>/dev/null && echo "✓ config.toml restaurado" || echo "⚠ config.toml não restaurado"

# 4. Restaurar migrations
echo -e "${YELLOW}[4/5] Restaurando migrations...${NC}"
if [ -d "$BACKUP_DIR/migrations-backup" ]; then
    rm -rf supabase/migrations/*
    cp -r "$BACKUP_DIR/migrations-backup/"* supabase/migrations/
    echo "✓ Migrations restauradas"
else
    echo "⚠ Migrations backup não encontrado"
fi

# 5. Restaurar Edge Functions
echo -e "${YELLOW}[5/5] Restaurando Edge Functions...${NC}"
if [ -d "$BACKUP_DIR/functions-backup" ]; then
    rm -rf supabase/functions/*
    cp -r "$BACKUP_DIR/functions-backup/"* supabase/functions/
    echo "✓ Functions restauradas"
else
    echo "⚠ Functions backup não encontrado"
fi

# Reinstalar dependências
echo -e "${YELLOW}Reinstalando dependências...${NC}"
npm install
echo "✓ Dependências instaladas"

# Resumo
echo ""
echo -e "${GREEN}=== ROLLBACK CONCLUÍDO ===${NC}"
echo "Estado revertido para: $BACKUP_TIMESTAMP"
echo "Backup do estado anterior: pre-rollback-$CURRENT_TIMESTAMP"
echo ""
echo -e "${YELLOW}PRÓXIMOS PASSOS:${NC}"
echo "1. Verificar se aplicação está funcionando: npm run dev"
echo "2. Aplicar migrations: supabase db push"
echo "3. Deploy Edge Functions: supabase functions deploy"
echo "4. Deploy aplicação: vercel --prod"
echo ""
echo -e "${RED}ATENÇÃO:${NC}"
echo "- Verifique se o banco de dados precisa ser restaurado"
echo "- Considere restaurar backup do Supabase Dashboard"
echo "- Notifique a equipe sobre o rollback"
