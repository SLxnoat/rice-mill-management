@echo off
REM Rice Mill Management System - Production Launcher
REM This script starts both backend and frontend servers in production mode

echo ========================================
echo Rice Mill Management System
echo Production Environment Launcher
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/3] Checking environment...
node --version
npm --version
echo.

REM Check if backend .env exists
if not exist "server\.env" (
    echo WARNING: server\.env not found
    echo Please copy .env.production.example to .env and configure it
    pause
    exit /b 1
)

REM Check if frontend build exists
if not exist "client\build\" (
    echo [2/3] Building frontend for production...
    cd client
    call npm run build
    cd ..
    echo.
) else (
    echo [2/3] Frontend build already exists
    echo.
)

echo [3/3] Starting production servers...
echo.
echo Backend:  http://localhost:5000
echo Frontend: Served via backend static files
echo.
echo Press Ctrl+C in the server window to stop
echo ========================================
echo.

REM Start backend server (which will also serve frontend static files)
start "Rice Mill - Production Server" cmd /k "cd server && npm start"

echo.
echo ========================================
echo Production server is starting...
echo ========================================
echo.
echo Access the application at: http://localhost:5000
echo.
echo Check the server window for logs
echo Close this window or press any key to exit launcher
echo ========================================
pause >nul
