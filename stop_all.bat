@echo off
setlocal

echo.
echo ============================================
echo  SmartWarehouse - Stop Frontend & Backend
echo ============================================
echo.

REM Stop windows started by run_all.bat (by window title)
taskkill /FI "WINDOWTITLE eq SmartWarehouse Backend*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq SmartWarehouse Frontend*" /T /F >nul 2>&1

REM Fallback: stop processes using default ports
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":5000"') do taskkill /PID %%p /T /F >nul 2>&1
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000"') do taskkill /PID %%p /T /F >nul 2>&1

echo Done. Backend/Frontend processes were stopped (if running).
echo.
pause