#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Script de configuração inicial do Ecossistema de Certificados Digitais.
    Execute como Administrador no PowerShell.
#>

$ErrorActionPreference = "Stop"

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Ecossistema de Certificados - Setup Inicial" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

# Verifica Node.js
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Node.js nao encontrado. Instale em: https://nodejs.org (versao >= 20)" -ForegroundColor Red
    exit 1
}

# Verifica npm
try {
    $npmVersion = npm --version
    Write-Host "[OK] npm encontrado: v$npmVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] npm nao encontrado." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Instalando dependencias do workspace..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Falha ao instalar dependencias." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[OK] Dependencias instaladas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "  Para iniciar o Cadastrador em modo dev:" -ForegroundColor Cyan
Write-Host "  cd apps\cadastrador" -ForegroundColor White
Write-Host "  npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "  Para fazer build de producao:" -ForegroundColor Cyan
Write-Host "  npm run build" -ForegroundColor White
Write-Host "=================================================" -ForegroundColor Cyan
