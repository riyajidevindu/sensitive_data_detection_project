@echo off
REM Docker Build Script for Windows
REM This script rebuilds the Docker images

echo ========================================
echo   Building Docker Images
echo ========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo [OK] Docker is running
echo.

REM Ask for no-cache option
set /p NOCACHE="Do you want to build without cache (slower but fresh build)? (y/n): "
if /i "%NOCACHE%"=="y" (
    echo.
    echo [INFO] Building images without cache...
    docker-compose build --no-cache
) else (
    echo.
    echo [INFO] Building images with cache...
    docker-compose build
)

if %errorlevel% equ 0 (
    echo.
    echo [OK] Images built successfully!
    echo.
    echo You can now run: docker-start.bat
) else (
    echo.
    echo [ERROR] Build failed!
    echo Check the logs above for details.
)

echo.
pause
