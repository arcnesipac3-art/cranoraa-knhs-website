@echo off
REM PRISM Automated Testing - Simple Batch Runner
REM For Windows users

echo ========================================
echo PRISM Automated Black-Box Testing Suite
echo ========================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found! Please install Python 3.8+
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM Check if .env exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    echo.
    echo Please edit .env file with your test credentials.
    echo Then run this script again.
    pause
    exit /b 1
)

echo [OK] Configuration found
echo.

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo [OK] Dependencies ready
echo.

REM Run tests
echo ========================================
echo STARTING TEST EXECUTION
echo ========================================
echo.

pytest automated_blackbox_tests.py -v --html=test_report.html --self-contained-html

echo.
echo ========================================
echo TEST EXECUTION COMPLETE
echo ========================================
echo.
echo Report: test_report.html
echo Screenshots: test_screenshots\
echo.

REM Ask to open report
set /p OPEN="Open test report in browser? (Y/N): "
if /i "%OPEN%"=="Y" (
    start test_report.html
)

echo.
echo Done!
pause
