# PowerShell script to run k6 load tests on Windows
# Usage: .\run-tests.ps1 [scenario]
# Example: .\run-tests.ps1 smoke
#          .\run-tests.ps1 load
#          .\run-tests.ps1 all

param(
    [Parameter(Position=0)]
    [ValidateSet('smoke', 'load', 'stress', 'spike', 'soak', 'endpoints', 'all')]
    [string]$Scenario = 'load',
    
    [string]$BaseUrl = 'http://localhost:8000',
    [string]$FrontendUrl = 'http://localhost:5173'
)

$ErrorActionPreference = "Stop"

# Color output functions
function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Warning-Custom {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

# Check if k6 is installed
function Test-K6Installed {
    try {
        $k6Version = k6 version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

# Check if backend is running
function Test-BackendRunning {
    param([string]$Url)
    
    try {
        $response = Invoke-WebRequest -Uri "$Url/api/health/" -Method Get -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

# Run a specific k6 test
function Invoke-K6Test {
    param(
        [string]$TestName,
        [string]$ScriptFile,
        [string]$ScenarioType = ''
    )
    
    Write-Info "`n$('='*80)"
    Write-Info "Running: $TestName"
    Write-Info "$('='*80)`n"
    
    $env:BASE_URL = $BaseUrl
    $env:FRONTEND_URL = $FrontendUrl
    
    $k6Args = @('run')
    
    if ($ScenarioType) {
        $k6Args += '--env', "SCENARIO=$ScenarioType"
    }
    
    $k6Args += $ScriptFile
    
    & k6 $k6Args
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "`n✓ $TestName completed successfully"
        return $true
    }
    else {
        Write-Error-Custom "`n✗ $TestName failed"
        return $false
    }
}

# Main script
Write-Host "`n"
Write-Host "$('='*80)" -ForegroundColor Cyan
Write-Host " KNHS School Portal - Load Testing Suite" -ForegroundColor Cyan
Write-Host "$('='*80)" -ForegroundColor Cyan
Write-Host "`n"

# Check prerequisites
Write-Info "Checking prerequisites..."

if (-not (Test-K6Installed)) {
    Write-Error-Custom "✗ k6 is not installed"
    Write-Info "`nInstall k6 using one of these methods:"
    Write-Host "  1. Chocolatey: choco install k6"
    Write-Host "  2. Winget: winget install k6 --source winget"
    Write-Host "  3. Download: https://k6.io/docs/getting-started/installation/"
    exit 1
}
Write-Success "✓ k6 is installed"

Write-Info "Checking if backend is running at $BaseUrl..."
if (-not (Test-BackendRunning -Url $BaseUrl)) {
    Write-Warning-Custom "✗ Backend is not responding at $BaseUrl"
    Write-Info "`nMake sure your Django backend is running:"
    Write-Host "  cd backend"
    Write-Host "  python manage.py runserver"
    
    $continue = Read-Host "`nDo you want to continue anyway? (y/N)"
    if ($continue -ne 'y' -and $continue -ne 'Y') {
        exit 1
    }
}
else {
    Write-Success "✓ Backend is running"
}

# Get the directory where this script is located
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Change to the load-tests directory
Push-Location $scriptDir

try {
    Write-Info "`nTest Configuration:"
    Write-Host "  Base URL: $BaseUrl"
    Write-Host "  Frontend URL: $FrontendUrl"
    Write-Host "  Scenario: $Scenario"
    Write-Host "`n"
    
    $results = @()
    
    switch ($Scenario) {
        'smoke' {
            $results += Invoke-K6Test -TestName "Smoke Test" -ScriptFile "k6-load-test.js" -ScenarioType "smoke"
        }
        'load' {
            $results += Invoke-K6Test -TestName "Load Test" -ScriptFile "k6-load-test.js" -ScenarioType "load"
        }
        'stress' {
            $results += Invoke-K6Test -TestName "Stress Test" -ScriptFile "k6-load-test.js" -ScenarioType "stress"
        }
        'spike' {
            $results += Invoke-K6Test -TestName "Spike Test" -ScriptFile "k6-load-test.js" -ScenarioType "spike"
        }
        'soak' {
            $results += Invoke-K6Test -TestName "Soak Test" -ScriptFile "k6-load-test.js" -ScenarioType "soak"
        }
        'endpoints' {
            $results += Invoke-K6Test -TestName "API Endpoints Test" -ScriptFile "k6-api-endpoints-test.js"
        }
        'all' {
            Write-Info "Running all test scenarios (this will take a while)...`n"
            $results += Invoke-K6Test -TestName "Smoke Test" -ScriptFile "k6-load-test.js" -ScenarioType "smoke"
            Start-Sleep -Seconds 5
            $results += Invoke-K6Test -TestName "API Endpoints Test" -ScriptFile "k6-api-endpoints-test.js"
            Start-Sleep -Seconds 5
            $results += Invoke-K6Test -TestName "Load Test" -ScriptFile "k6-load-test.js" -ScenarioType "load"
            Start-Sleep -Seconds 5
            $results += Invoke-K6Test -TestName "Spike Test" -ScriptFile "k6-load-test.js" -ScenarioType "spike"
        }
    }
    
    # Summary
    Write-Host "`n"
    Write-Info "$('='*80)"
    Write-Info "Test Summary"
    Write-Info "$('='*80)"
    
    $successCount = ($results | Where-Object { $_ -eq $true }).Count
    $totalCount = $results.Count
    
    Write-Host "`nCompleted: $successCount / $totalCount tests passed"
    
    if ($successCount -eq $totalCount) {
        Write-Success "`n✓ All tests passed!"
    }
    else {
        Write-Warning-Custom "`n⚠ Some tests failed. Check the output above for details."
    }
    
    # Check if HTML report was generated
    $reportFile = Join-Path $scriptDir "load-test-summary.html"
    if (Test-Path $reportFile) {
        Write-Info "`nHTML Report generated: $reportFile"
        $openReport = Read-Host "Open HTML report in browser? (Y/n)"
        if ($openReport -ne 'n' -and $openReport -ne 'N') {
            Start-Process $reportFile
        }
    }
    
}
finally {
    Pop-Location
}

Write-Host "`n"
