#!/bin/bash
# Script de Monitoramento Pós-Deploy - Neo Vidya Stream
# Data: 2026-04-18
# Uso: ./monitor-deploy.sh [duration_minutes]

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
DURATION=${1:-60}  # Default: 60 minutos
PROJECT_DIR="c:/WWW Projetos/neo-vidya-stream-main/Flow5"
LOG_FILE="$PROJECT_DIR/logs/monitor-$(date +%Y%m%d-%H%M%S).log"

# Criar diretório de logs
mkdir -p "$PROJECT_DIR/logs"

echo -e "${BLUE}=== MONITORAMENTO PÓS-DEPLOY ===${NC}" | tee -a "$LOG_FILE"
echo "Duração: $DURATION minutos" | tee -a "$LOG_FILE"
echo "Início: $(date)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Função para verificar métricas
check_metrics() {
    local timestamp=$(date +"%H:%M:%S")

    echo -e "${YELLOW}[$timestamp] Verificando métricas...${NC}" | tee -a "$LOG_FILE"

    # 1. Verificar se site está no ar
    echo -n "  Site status: " | tee -a "$LOG_FILE"
    if curl -s -o /dev/null -w "%{http_code}" "https://lznckhxqbkqldedlmbfb.supabase.co" | grep -q "200\|301\|302"; then
        echo -e "${GREEN}✓ Online${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "${RED}✗ Offline${NC}" | tee -a "$LOG_FILE"
        ALERT=1
    fi

    # 2. Verificar Edge Functions (se houver)
    if [ -d "supabase/functions" ]; then
        echo -n "  Edge Functions: " | tee -a "$LOG_FILE"
        # Aqui você pode adicionar verificação específica de cada função
        echo "Verificar manualmente no Dashboard" | tee -a "$LOG_FILE"
    fi

    # 3. Verificar erros recentes no Git
    echo -n "  Git status: " | tee -a "$LOG_FILE"
    cd "$PROJECT_DIR"
    if git diff --quiet && git diff --cached --quiet; then
        echo -e "${GREEN}✓ Clean${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠ Uncommitted changes${NC}" | tee -a "$LOG_FILE"
    fi

    # 4. Verificar uso de disco
    echo -n "  Disk usage: " | tee -a "$LOG_FILE"
    DISK_USAGE=$(df -h "$PROJECT_DIR" | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -lt 80 ]; then
        echo -e "${GREEN}✓ ${DISK_USAGE}%${NC}" | tee -a "$LOG_FILE"
    else
        echo -e "${YELLOW}⚠ ${DISK_USAGE}%${NC}" | tee -a "$LOG_FILE"
    fi

    echo "" | tee -a "$LOG_FILE"
}

# Função para verificar logs de erro
check_errors() {
    local timestamp=$(date +"%H:%M:%S")

    echo -e "${YELLOW}[$timestamp] Verificando erros...${NC}" | tee -a "$LOG_FILE"

    # Verificar logs do Supabase (se disponível)
    if command -v supabase &> /dev/null; then
        echo "  Últimos erros nas Edge Functions:" | tee -a "$LOG_FILE"
        # supabase functions logs --tail 10 | grep -i "error" | tail -5 | tee -a "$LOG_FILE"
        echo "  (Verificar manualmente: supabase functions logs --tail)" | tee -a "$LOG_FILE"
    fi

    echo "" | tee -a "$LOG_FILE"
}

# Função para gerar relatório
generate_report() {
    echo -e "${BLUE}=== RELATÓRIO FINAL ===${NC}" | tee -a "$LOG_FILE"
    echo "Fim: $(date)" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    echo "Métricas coletadas:" | tee -a "$LOG_FILE"
    echo "- Verificações realizadas: $CHECK_COUNT" | tee -a "$LOG_FILE"
    echo "- Alertas gerados: ${ALERT_COUNT:-0}" | tee -a "$LOG_FILE"
    echo "" | tee -a "$LOG_FILE"

    echo "Log completo salvo em: $LOG_FILE" | tee -a "$LOG_FILE"

    if [ "${ALERT_COUNT:-0}" -gt 0 ]; then
        echo -e "${RED}⚠ ATENÇÃO: Alertas detectados durante monitoramento${NC}" | tee -a "$LOG_FILE"
        echo "Revise o log e considere rollback se necessário." | tee -a "$LOG_FILE"
    else
        echo -e "${GREEN}✓ Nenhum problema detectado${NC}" | tee -a "$LOG_FILE"
    fi
}

# Trap para gerar relatório ao sair
trap generate_report EXIT

# Loop de monitoramento
CHECK_COUNT=0
ALERT_COUNT=0
END_TIME=$(($(date +%s) + $DURATION * 60))

echo "Monitorando por $DURATION minutos..." | tee -a "$LOG_FILE"
echo "Pressione Ctrl+C para parar" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

while [ $(date +%s) -lt $END_TIME ]; do
    CHECK_COUNT=$((CHECK_COUNT + 1))

    check_metrics
    check_errors

    # Aguardar 5 minutos antes da próxima verificação
    REMAINING=$((($END_TIME - $(date +%s)) / 60))
    if [ $REMAINING -gt 0 ]; then
        echo "Próxima verificação em 5 minutos (restam $REMAINING minutos)..." | tee -a "$LOG_FILE"
        sleep 300  # 5 minutos
    fi
done

echo -e "${GREEN}Monitoramento concluído!${NC}" | tee -a "$LOG_FILE"
