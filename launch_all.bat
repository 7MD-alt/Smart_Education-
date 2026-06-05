@echo off
title NOVAA + CampusEye Launcher
color 0B
cls

echo.
echo  ============================================================
echo   N.O.V.A.A  +  CampusEye  ^|  Full Stack Launcher
echo  ============================================================
echo.
echo  Starting all systems...
echo.

:: ── 1. NOVAA Desktop (Projet-Jarvis) ─────────────────────────────────────────
echo  [1/3] Launching NOVAA Desktop...
start "NOVAA Desktop" cmd /k ^
  "title NOVAA Desktop && color 0D && cd /d C:\Users\mchar\OneDrive\Desktop\PFE\Projet-Jarvis && jarvis_env\Scripts\activate && echo. && echo  [NOVAA] Starting N.O.V.A.A... && echo. && python main.py"

timeout /t 2 /nobreak > nul

:: ── 2. CampusEye Django Backend ───────────────────────────────────────────────
echo  [2/3] Launching Django API (port 8000)...
start "CampusEye API" cmd /k ^
  "title CampusEye API ^| Django && color 0A && cd /d C:\Users\mchar\OneDrive\Desktop\PFE\p2 && att\Scripts\activate && echo. && echo  [API] Django starting on http://127.0.0.1:8000 && echo. && python manage.py runserver"

timeout /t 2 /nobreak > nul

:: ── 3. CampusEye React Frontend ──────────────────────────────────────────────
echo  [3/3] Launching React Frontend (port 5173)...
start "CampusEye Web" cmd /k ^
  "title CampusEye Web ^| React && color 09 && cd /d C:\Users\mchar\OneDrive\Desktop\PFE\p2\frontend && echo. && echo  [WEB] React dev server starting on http://localhost:5173 && echo. && npm run dev"

echo.
echo  ============================================================
echo   All systems launching in separate windows:
echo.
echo   Purple  ^>  NOVAA Desktop HUD
echo   Green   ^>  Django API       http://127.0.0.1:8000
echo   Blue    ^>  React Web App    http://localhost:5173
echo  ============================================================
echo.
echo  Press any key to close this launcher window...
pause > nul
