@echo off
echo ========================================
echo IT Help Desk - Starting Services
echo ========================================
echo.

echo Starting Backend (FastAPI)...
start "Backend Server" cmd /k "cd backend && python api.py"

timeout /t 3 /nobreak >nul

echo Starting Frontend (React + Vite)...
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all services...
pause >nul

echo Stopping services...
taskkill /FI "WINDOWTITLE eq Backend Server*" /T /F 2>nul
taskkill /FI "WINDOWTITLE eq Frontend Server*" /T /F 2>nul
echo Done!
