# Flow 5.1 - Supabase Backup Script
# Use este script para manter seu backup local atualizado.

$PROJECT_REF = "lznckhxqbkqldedlmbfb"
$BACKUP_DIR = "DocS/supabase"

Write-Host "==============================" -ForegroundColor Cyan
Write-Host "   Flow 5.1 - Sistema de Backup" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

function Show-Menu {
    Write-Host "`nO que você deseja fazer?"
    Write-Host "1. Backup Completo (Schema + Functions)"
    Write-Host "2. Backup apenas do Banco (schema.sql)"
    Write-Host "3. Backup das Edge Functions (Pasta /functions)"
    Write-Host "4. Download do Supabase CLI (Se necessário)"
    Write-Host "5. Sair"
}

do {
    Show-Menu
    $choice = Read-Host "`nEscolha uma opção (1-5)"

    switch ($choice) {
        "1" {
            Write-Host "`nIniciando backup completo..." -ForegroundColor Yellow
            npx supabase db export -f "$BACKUP_DIR/schema.sql" --project-ref $PROJECT_REF
            npx supabase functions pull --project-ref $PROJECT_REF
            Write-Host "`nBackup concluído com sucesso em $BACKUP_DIR" -ForegroundColor Green
        }
        "2" {
            Write-Host "`nFazendo backup do banco..." -ForegroundColor Yellow
            npx supabase db export -f "$BACKUP_DIR/schema.sql" --project-ref $PROJECT_REF
            Write-Host "`nSchema salvo em $BACKUP_DIR/schema.sql" -ForegroundColor Green
        }
        "3" {
            Write-Host "`nBaixando Edge Functions..." -ForegroundColor Yellow
            npx supabase functions pull --project-ref $PROJECT_REF
            Write-Host "`nFunctions salvas na pasta $BACKUP_DIR/functions" -ForegroundColor Green
        }
        "4" {
            Write-Host "`nVerificando Supabase CLI..." -ForegroundColor Yellow
            npx supabase --version
            Write-Host "`nO Supabase CLI está pronto para uso via npx." -ForegroundColor Green
        }
    }
} while ($choice -ne "5")
