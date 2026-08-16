@echo off
REM PRISM Backend Server Startup Script

echo ========================================
echo PRISM Backend Server Startup
echo ========================================
echo.

REM Check if .env exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Creating from .env.example...
    copy .env.example .env
    
    REM Generate secret key
    echo Generating Django secret key...
    for /f %%i in ('python -c "import secrets; print(secrets.token_hex(50))"') do set SECRET_KEY=%%i
    
    REM Note: Manual edit still needed for full setup
    echo [OK] .env file created
    echo Please edit .env file for database and other settings
    echo.
)

REM Load environment variables from .env
echo Loading environment variables...
for /f "usebackq tokens=1,* delims==" %%a in (".env") do (
    set "%%a=%%b"
)

echo [OK] Environment variables loaded
echo.

REM Start Django server
echo ========================================
echo STARTING DJANGO DEVELOPMENT SERVER
echo ========================================
echo.

python manage.py runserver

echo.
echo Server stopped.
pause
