# Script de compilacion y empaquetado para Windows
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Floating Personal Gantt - Windows Packaging" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"

Write-Host ""
Write-Host "[1/3] Verificando dependencias..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    npm install
}

Write-Host ""
Write-Host "[2/3] Compilando TypeScript y Assets..." -ForegroundColor Yellow
npm run build
npm run build:electron

Write-Host ""
Write-Host "[3/3] Empaquetando aplicacion de escritorio..." -ForegroundColor Yellow
npm run package:win

Write-Host ""
Write-Host "Compilacion completada con exito. Ejecutables generados en ./release" -ForegroundColor Green
