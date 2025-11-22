@echo off
REM Rice Mill Management System - Development Launcher
REM This script starts both backend and frontend servers

echo ========================================
echo Rice Mill Management System
echo Development Environment Launcher
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

echo [1/4] Checking Node.js version...
node --version
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm is not installed or not in PATH
    pause
    exit /b 1
)

echo [2/4] Checking npm version...
npm --version
echo.

REM Check if backend dependencies are installed
if not exist "server\node_modules\" (
    echo [3/4] Installing backend dependencies...
    cd server
    call npm install
    cd ..
    echo.
) else (
    echo [3/4] Backend dependencies already installed
    echo.
)

REM Check if frontend dependencies are installed
if not exist "client\node_modules\" (
    echo [4/4] Installing frontend dependencies...
    cd client
    call npm install
    cd ..
    echo.
) else (
    echo [4/4] Frontend dependencies already installed
    echo.
)

echo ========================================
echo Starting Development Servers...
echo ========================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press Ctrl+C to stop both servers
echo ========================================
echo.

REM Start backend server in a new window
start "Rice Mill - Backend Server" cmd /k "cd server && npm run dev"

REM Wait 3 seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend server in a new window
start "Rice Mill - Frontend Server" cmd /k "cd client && npm start"

echo.
echo ========================================
echo Both servers are starting...
echo ========================================
echo.
echo Backend server:  http://localhost:5000
echo Frontend server: http://localhost:3000
echo.
echo Check the new terminal windows for server logs
echo Close this window or press any key to exit launcher
echo ========================================
pause >nul
