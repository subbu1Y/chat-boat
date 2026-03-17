@echo off
echo Starting FastAPI Backend...
cd "C:\Users\SubrahmanyamPillalam\Downloads\Chat-bot 2.0"
python -m uvicorn backend.api:app --host 0.0.0.0 --port 8000 --reload
pause
