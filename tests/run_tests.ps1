# PRISM Automated Testing Runner Script
# PowerShell script for Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PRISM Automated Black-Box Testing Suite" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found. Please install Python 3.8 or higher." -ForegroundColor Red
    exit 1
}

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host ""
    Write-Host "✗ .env file not found!" -ForegroundColor Red
    Write-Host "Creating .env from .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "✓ .env file created. Please update with your test credentials." -ForegroundColor Green
    Write-Host ""
    Write-Host "Edit .env file and run this script again." -ForegroundColor Yellow
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Installing/Updating dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Create screenshots directory
if (-not (Test-Path "test_screenshots")) {
    New-Item -ItemType Directory -Path "test_screenshots" | Out-Null
}

# Menu for test selection
Write-Host ""
Write-Host "Select test suite to run:" -ForegroundColor Cyan
Write-Host "1. Run ALL tests" -ForegroundColor White
Write-Host "2. Authentication & Security tests only" -ForegroundColor White
Write-Host "3. Enrollment tests only" -ForegroundColor White
Write-Host "4. Grade Management tests only" -ForegroundColor White
Write-Host "5. School Forms tests only" -ForegroundColor White
Write-Host "6. Run specific test (enter test ID)" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-6)"

$testCommand = "pytest automated_blackbox_tests.py -v --html=test_report.html --self-contained-html"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Running ALL tests..." -ForegroundColor Green
        # Command already set above
    }
    "2" {
        Write-Host ""
        Write-Host "Running Authentication & Security tests..." -ForegroundColor Green
        $testCommand = "pytest automated_blackbox_tests.py::TestAuthentication -v --html=test_report.html --self-contained-html"
    }
    "3" {
        Write-Host ""
        Write-Host "Running Enrollment tests..." -ForegroundColor Green
        $testCommand = "pytest automated_blackbox_tests.py::TestEnrollment -v --html=test_report.html --self-contained-html"
    }
    "4" {
        Write-Host ""
        Write-Host "Running Grade Management tests..." -ForegroundColor Green
        $testCommand = "pytest automated_blackbox_tests.py::TestGradeManagement -v --html=test_report.html --self-contained-html"
    }
    "5" {
        Write-Host ""
        Write-Host "Running School Forms tests..." -ForegroundColor Green
        $testCommand = "pytest automated_blackbox_tests.py::TestSchoolForms -v --html=test_report.html --self-contained-html"
    }
    "6" {
        $testId = Read-Host "Enter test ID (e.g., AUTH-001)"
        Write-Host ""
        Write-Host "Running test $testId..." -ForegroundColor Green
        $testCommand = "pytest automated_blackbox_tests.py -k '$testId' -v --html=test_report.html --self-contained-html"
    }
    default {
        Write-Host "Invalid choice. Running ALL tests..." -ForegroundColor Yellow
    }
}

# Run the tests
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STARTING TEST EXECUTION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Invoke-Expression $testCommand

# Check if tests completed
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

# Show report location
Write-Host ""
Write-Host "Test report generated: test_report.html" -ForegroundColor Cyan
Write-Host "Screenshots (if any): test_screenshots/" -ForegroundColor Cyan
Write-Host ""

# Ask if user wants to open the report
$openReport = Read-Host "Open HTML test report? (Y/N)"
if ($openReport -eq "Y" -or $openReport -eq "y") {
    Start-Process "test_report.html"
}

Write-Host ""
Write-Host "Testing complete!" -ForegroundColor Green
