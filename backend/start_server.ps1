# PRISM Backend Server Startup Script
# Loads .env file and starts Django development server

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PRISM Backend Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path ".env")) {
    Write-Host "[ERROR] .env file not found!" -ForegroundColor Red
    Write-Host "Creating from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    
    # Generate a secret key
    Write-Host "Generating Django secret key..." -ForegroundColor Yellow
    $secretKey = python -c "import secrets; print(secrets.token_hex(50))"
    
    # Update .env file
    (Get-Content ".env") -replace 'your-secret-key-here-generate-with-python-secrets', $secretKey | Set-Content ".env"
    
    Write-Host "[OK] .env file created with secret key" -ForegroundColor Green
    Write-Host "You may want to edit .env for database and other settings" -ForegroundColor Yellow
    Write-Host ""
}

# Load .env file and set environment variables
Write-Host "Loading environment variables from .env..." -ForegroundColor Yellow

Get-Content ".env" | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes if present
        $value = $value -replace '^["'']|["'']$', ''
        
        [Environment]::SetEnvironmentVariable($name, $value, "Process")
        Write-Host "  $name = $value" -ForegroundColor Gray
    }
}

Write-Host "[OK] Environment variables loaded" -ForegroundColor Green
Write-Host ""

# Check Python
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Python not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STARTING DJANGO DEVELOPMENT SERVER" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Run Django development server
python manage.py runserver

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow
