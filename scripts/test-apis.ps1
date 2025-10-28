# Script de Teste das APIs - MobilizaSP (PowerShell)
# Para Windows/WSL

$BASE_URL = "http://localhost:4001"
$REQ_ID = "test-$(Get-Date -Format 'yyyyMMddHHmmss')"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  MobilizaSP - Teste de APIs" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Base URL: $BASE_URL" -ForegroundColor Yellow
Write-Host "Request ID: $REQ_ID" -ForegroundColor Yellow
Write-Host ""

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [int]$ExpectedStatus = 200
    )
    
    Write-Host "----------------------------------------------------" -ForegroundColor Gray
    Write-Host "🧪 Testando: $Name" -ForegroundColor White
    Write-Host "   $Method $Url" -ForegroundColor Gray
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method $Method -Headers @{"x-request-id"=$REQ_ID} -ErrorAction SilentlyContinue
        $statusCode = $response.StatusCode
        $body = $response.Content | ConvertFrom-Json
        
        if ($statusCode -eq $ExpectedStatus) {
            Write-Host "   ✅ Status: $statusCode (esperado: $ExpectedStatus)" -ForegroundColor Green
        } else {
            Write-Host "   ❌ Status: $statusCode (esperado: $ExpectedStatus)" -ForegroundColor Red
            return $false
        }
        
        if ($body.ok -ne $null) {
            Write-Host "   ✅ JSON válido com campo 'ok'" -ForegroundColor Green
        } else {
            Write-Host "   ⚠️  JSON válido mas sem campo 'ok'" -ForegroundColor Yellow
        }
        
        Write-Host ""
        return $true
    } catch {
        Write-Host "   ❌ Erro: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        return $false
    }
}

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "1. Endpoints de Sistema" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

Test-Endpoint -Name "Health Check" -Method "GET" -Url "$BASE_URL/healthz" -ExpectedStatus 200
Test-Endpoint -Name "Health Check Simples" -Method "GET" -Url "$BASE_URL/health" -ExpectedStatus 200
Test-Endpoint -Name "Métricas" -Method "GET" -Url "$BASE_URL/metrics" -ExpectedStatus 200

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "2. Endpoints SPTrans" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Teste: Buscar Linha
Write-Host "📋 Executando: Buscar Linha (q=701U)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$BASE_URL/api/v1/sptrans/linha?q=701U" -Method GET
    if ($response.ok -eq $true) {
        Write-Host "✅ Buscar Linha funcionando" -ForegroundColor Green
        $count = if ($response.data) { $response.data.Count } else { 0 }
        Write-Host "   Resultados: $count linha(s)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Buscar Linha falhou" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erro ao testar buscar linha: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Teste: Sem parâmetro
Write-Host "📋 Executando: Buscar Linha (sem parâmetro)..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "$BASE_URL/api/v1/sptrans/linha" -Method GET -ErrorAction Stop
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "✅ Validação funcionando (retornou erro 400)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Status: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}
Write-Host ""

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Resumo dos Testes" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Testes básicos completos!" -ForegroundColor Green
Write-Host ""
Write-Host "Para testar interativamente:" -ForegroundColor Yellow
Write-Host "  Invoke-RestMethod -Uri `"$BASE_URL/api/v1/sptrans/linha?q=701U`"" -ForegroundColor Gray
Write-Host ""
Write-Host "Para acessar Swagger UI:" -ForegroundColor Yellow
Write-Host "  $BASE_URL/docs" -ForegroundColor Gray
Write-Host ""
Write-Host "Para ver métricas:" -ForegroundColor Yellow
Write-Host "  $BASE_URL/metrics" -ForegroundColor Gray
Write-Host ""

