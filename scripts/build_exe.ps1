# Script de compilación y empaquetado para Windows
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Floating Personal Gantt - Windows Packaging" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"

Write-Host "`n[1/3] Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host "`n[2/3] Compilando TypeScript y Assets..." -ForegroundColor Yellow
npm run build

Write-Host "`n[3/3] Empaquetando aplicación de escritorio..." -ForegroundColor Yellow
npm run package:win

Write-Host "`n✔ Compilación completada con éxito. Revisa el directorio ./dist o ./release" -ForegroundColor Green
