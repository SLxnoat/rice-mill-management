# PowerShell script to start the Rice-Mill Management System
# Run this from the project root directory

Write-Host "🥚 Starting Rice-Mill Management System..." -ForegroundColor Green
Write-Host "=".PadRight(50, "=") -ForegroundColor Yellow

# Check if we're in the right directory
if (-not (Test-Path "server/package.json")) {
    Write-Host "❌ Error: server/package.json not found. Please run from rice-mill-management directory." -ForegroundColor Red
    exit 1
}

# Kill any existing processes on ports 3000 and 5000
Write-Host "🔪 Killing existing processes on ports 3000 and 5000..." -ForegroundColor Yellow

try {
    # Kill React dev server (port 3000)
    $reactProcess = Get-NetTCPConnection | Where-Object { $_.LocalPort -eq 3000 -and $_.State -eq "Listen" } 2>$null
    if ($reactProcess) {
        $reactPID = (Get-Process | Where-Object { $_.Id -eq $reactProcess.OwningProcess }).Id
        if ($reactPID) {
            Stop-Process -Id $reactPID -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Killed React process (PID: $reactPID)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "ℹ️ No React process found running on port 3000" -ForegroundColor Gray
}

try {
    # Kill Node.js server (port 5000)
    $serverProcess = Get-NetTCPConnection | Where-Object { $_.LocalPort -eq 5000 -and $_.State -eq "Listen" } 2>$null
    if ($serverProcess) {
        $serverPID = (Get-Process | Where-Object { $_.Id -eq $serverProcess.OwningProcess }).Id
        if ($serverPID) {
            Stop-Process -Id $serverPID -Force -ErrorAction SilentlyContinue
            Write-Host "✓ Killed Node.js server process (PID: $serverPID)" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "ℹ️ No Node.js server process found running on port 5000" -ForegroundColor Gray
}

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 3

# Start MongoDB (if local install exists)
Write-Host "📊 Starting MongoDB..." -ForegroundColor Magenta
try {
    $mongoService = Get-Service | Where-Object { $_.Name -like "*mongo*" }
    if ($mongoService -and $mongoService.Status -eq "Stopped") {
        Start-Service -Name $mongoService.Name -ErrorAction SilentlyContinue
        Write-Host "✓ MongoDB service started" -ForegroundColor Green
        Start-Sleep -Seconds 5
    } else {
        Write-Host "ℹ️ MongoDB service already running or not found" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Could not start MongoDB service (may be running as separate process)" -ForegroundColor Yellow
}

# Start Backend Server
Write-Host "🚀 Starting Backend Server (Port 5000)..." -ForegroundColor Blue
$backendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\server"
    npm run dev
} -Name "BackendServer"

Start-Sleep -Seconds 5  # Give backend time to initialize

# Start Frontend (React)
Write-Host "⚛️ Starting Frontend (React - Port 3000)..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    Set-Location "$using:PWD\client"
    npm start
} -Name "FrontendReact"

# Wait for services to start
Start-Sleep -Seconds 10

Write-Host "=".PadRight(50, "=") -ForegroundColor Green
Write-Host "🎉 RICE-MILL MANAGEMENT SYSTEM STARTED!" -ForegroundColor Green
Write-Host "=".PadRight(50, "=") -ForegroundColor Green
Write-Host "📍 Frontend (React UI):     http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 Backend API:             http://localhost:5000" -ForegroundColor Blue
Write-Host "📚 API Documentation:       http://localhost:5000/api/v1" -ForegroundColor White
Write-Host "💊 Health Check:           http://localhost:5000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "🔑 Demo Login Credentials:" -ForegroundColor Yellow
Write-Host "   Email: admin@mail.com" -ForegroundColor White
Write-Host "   Password: admin123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Gray
Write-Host "=".PadRight(50, "=") -ForegroundColor Green

# Keep the script running and show job outputs
while ($true) {
    $backendOutput = Receive-Job -Job $backendJob -Keep
    $frontendOutput = Receive-Job -Job $frontendJob -Keep

    if ($backendOutput) {
        Write-Host "🔧 Backend: $backendOutput" -ForegroundColor Blue
    }

    if ($frontendOutput) {
        Write-Host "⚛️  Frontend: $frontendOutput" -ForegroundColor Cyan
    }

    Start-Sleep -Seconds 2

    # Check if either job has completed (error)
    if ($backendJob.State -eq "Failed" -or $backendJob.State -eq "Completed") {
        Write-Host "❌ Backend server failed or stopped" -ForegroundColor Red
        break
    }

    if ($frontendJob.State -eq "Failed" -or $frontendJob.State -eq "Completed") {
        Write-Host "❌ Frontend failed or stopped" -ForegroundColor Red
        break
    }
}

# Cleanup on exit
Write-Host "🧹 Cleaning up background jobs..." -ForegroundColor Yellow
Stop-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
Remove-Job -Job $backendJob, $frontendJob -ErrorAction SilentlyContinue
Write-Host "👋 System stopped. Goodbye!" -ForegroundColor Green
