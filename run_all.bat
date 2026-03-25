@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo  SmartWarehouse - Start Frontend & Backend
echo ============================================
echo.

@REM Change your own path
set BACKEND_PATH=c:\Users\hohai\Desktop\DADN\SmartWarehouse\backend
set FRONTEND_PATH=c:\Users\hohai\Desktop\DADN\SmartWarehouse\frontend

REM Check if node_modules exist, if not install first
if not exist "%BACKEND_PATH%\node_modules" (
    echo [Pre-Setup] Installing backend dependencies...
    cd /d "%BACKEND_PATH%"
    call npm install
)

if not exist "%FRONTEND_PATH%\node_modules" (
    echo [Pre-Setup] Installing frontend dependencies...
    cd /d "%FRONTEND_PATH%"
    call npm install
)

echo.
echo [1/2] Starting Backend on http://localhost:5000...
start "SmartWarehouse Backend" cmd /k "cd /d "%BACKEND_PATH%" && node server.js"

echo [2/2] Starting Frontend on http://localhost:3000...
timeout /t 3 /nobreak
start "SmartWarehouse Frontend" cmd /k "cd /d "%FRONTEND_PATH%" && npm run start"

echo.
echo ============================================
echo  Both servers are starting...
echo ============================================
echo.
echo Backend:  http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Close either command window to stop that server.
echo.
pause