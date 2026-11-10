#!/bin/bash
# Script de Backup Completo - Neo Vidya Stream
# Data: 2026-04-18
# Uso: ./backup-complete.sh

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações
PROJECT_DIR="c:/WWW Projetos/neo-vidya-stream-main/Flow5"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_NAME="backup-$TIMESTAMP"

echo -e "${GREEN}=== Neo Vidya Stream - Backup Completo ===${NC}"
echo "Timestamp: $TIMESTAMP"
echo ""

# Criar diretório de backup se não existir
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# 1. Backup do código (Git)
echo -e "${YELLOW}[1/6] Criando backup do código (Git)...${NC}"
cd "$PROJECT_DIR"

# Criar tag
git tag -a "backup-$TIMESTAMP" -m "Backup automático antes de implementação"
echo "✓ Tag criada: backup-$TIMESTAMP"

# Criar branch de backup
git checkout -b "backup/auto-$TIMESTAMP" 2>/dev/null || git checkout "backup/auto-$TIMESTAMP"
git push origin "backup/auto-$TIMESTAMP" --force
echo "✓ Branch de backup criada: backup/auto-$TIMESTAMP"

# Voltar para branch principal
git checkout main 2>/dev/null || git checkout master

# 2. Backup de arquivos de configuração
echo -e "${YELLOW}[2/6] Backup de configurações...${NC}"
cp .env "$BACKUP_DIR/$BACKUP_NAME/.env.backup" 2>/dev/null || echo "⚠ .env não encontrado"
cp .env.local "$BACKUP_DIR/$BACKUP_NAME/.env.local.backup" 2>/dev/null || echo "⚠ .env.local não encontrado"
cp package.json "$BACKUP_DIR/$BACKUP_NAME/package.json.backup"
cp supabase/config.toml "$BACKUP_DIR/$BACKUP_NAME/config.toml.backup" 2>/dev/null || echo "⚠ config.toml não encontrado"
echo "✓ Configurações copiadas"

# 3. Backup do schema do banco de dados
echo -e "${YELLOW}[3/6] Backup do schema do banco...${NC}"
if command -v supabase &> /dev/null; then
    cd "$PROJECT_DIR"
    supabase db dump --schema public > "$BACKUP_DIR/$BACKUP_NAME/schema-backup.sql" 2>/dev/null || echo "⚠ Erro ao fazer dump do schema"
    echo "✓ Schema exportado"
else
    echo "⚠ Supabase CLI não instalado - pulando backup de schema"
fi

# 4. Backup das migrations
echo -e "${YELLOW}[4/6] Backup das migrations...${NC}"
if [ -d "supabase/migrations" ]; then
    cp -r supabase/migrations "$BACKUP_DIR/$BACKUP_NAME/migrations-backup"
    echo "✓ Migrations copiadas ($(ls supabase/migrations | wc -l) arquivos)"
else
    echo "⚠ Diretório migrations não encontrado"
fi

# 5. Backup das Edge Functions
echo -e "${YELLOW}[5/6] Backup das Edge Functions...${NC}"
if [ -d "supabase/functions" ]; then
    cp -r supabase/functions "$BACKUP_DIR/$BACKUP_NAME/functions-backup"
    echo "✓ Functions copiadas ($(ls supabase/functions | wc -l) funções)"
else
    echo "⚠ Diretório functions não encontrado"
fi

# 6. Criar arquivo de metadados
echo -e "${YELLOW}[6/6] Criando metadados do backup...${NC}"
cat > "$BACKUP_DIR/$BACKUP_NAME/BACKUP-INFO.txt" << EOF
=== BACKUP INFORMATION ===
Timestamp: $TIMESTAMP
Date: $(date)
Project: Neo Vidya Stream (Flow5)
Git Branch: $(git branch --show-current)
Git Commit: $(git rev-parse HEAD)
Git Tag: backup-$TIMESTAMP

=== BACKUP CONTENTS ===
- Git tag: backup-$TIMESTAMP
- Git branch: backup/auto-$TIMESTAMP
- Configuration files (.env, package.json, config.toml)
- Database schema (schema-backup.sql)
- Migrations (migrations-backup/)
- Edge Functions (functions-backup/)

=== RESTORE INSTRUCTIONS ===
1. Git: git checkout backup-$TIMESTAMP
2. Config: cp backups/$BACKUP_NAME/.env.backup .env
3. Database: supabase db reset && psql < backups/$BACKUP_NAME/schema-backup.sql
4. Migrations: cp -r backups/$BACKUP_NAME/migrations-backup/* supabase/migrations/
5. Functions: cp -r backups/$BACKUP_NAME/functions-backup/* supabase/functions/

=== NOTES ===
- Este backup NÃO inclui dados do banco (apenas schema)
- Para backup completo de dados, use Supabase Dashboard
- Mantenha este backup por pelo menos 30 dias
EOF

echo "✓ Metadados criados"

# Comprimir backup
echo -e "${YELLOW}Comprimindo backup...${NC}"
cd "$BACKUP_DIR"
tar -czf "$BACKUP_NAME.tar.gz" "$BACKUP_NAME" 2>/dev/null || echo "⚠ Erro ao comprimir (continuando...)"
BACKUP_SIZE=$(du -sh "$BACKUP_NAME.tar.gz" 2>/dev/null | cut -f1 || echo "N/A")

# Resumo
echo ""
echo -e "${GREEN}=== BACKUP COMPLETO ===${NC}"
echo "Localização: $BACKUP_DIR/$BACKUP_NAME"
echo "Arquivo comprimido: $BACKUP_NAME.tar.gz ($BACKUP_SIZE)"
echo "Git tag: backup-$TIMESTAMP"
echo "Git branch: backup/auto-$TIMESTAMP"
echo ""
echo -e "${GREEN}✓ Backup concluído com sucesso!${NC}"
echo ""
echo "Para restaurar:"
echo "  git checkout backup-$TIMESTAMP"
echo "  tar -xzf backups/$BACKUP_NAME.tar.gz -C backups/"
echo "  # Seguir instruções em backups/$BACKUP_NAME/BACKUP-INFO.txt"
