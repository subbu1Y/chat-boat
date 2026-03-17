@echo off
echo ========================================
echo Cognida.ai IT Help Desk - Starting Services
echo ========================================
echo.

echo Starting Backend (FastAPI)...
start "Backend Server" cmd /k "cd /d C:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0 && python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 4 /nobreak >nul

echo Starting Frontend (React + Vite)...
start "Frontend Server" cmd /k "cd /d C:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0\frontend && npm run dev"

echo.
echo ========================================
echo Services Started!
echo ========================================
echo Backend  : http://localhost:8000
echo Frontend : http://localhost:5173
echo Helpdesk : http://localhost:5173/helpdesk
echo Dashboard: http://localhost:5173/dashboard
echo API Docs : http://localhost:8000/docs
echo.
echo Press any key to stop all services...
pause >nul

echo Stopping services...
taskkill /FI "WINDOWTITLE eq Backend Server*" /T /F 2>nul
taskkill /FI "WINDOWTITLE eq Frontend Server*" /T /F 2>nul
echo Done!
