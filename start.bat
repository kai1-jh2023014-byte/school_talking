@echo off
cd /d "%~dp0"

echo Installing packages if needed...
call npm install
if errorlevel 1 (
  echo npm install failed.
  pause
  exit /b 1
)

echo Starting...
start "" cmd /k "cd /d "%~dp0" && npm run dev"

timeout /t 5 /nobreak >nul
start "" http://localhost:3000
