@echo off
setlocal EnableExtensions
chcp 65001 >nul
title つなぐ

REM Always run from this file's folder (the repo), even if a shortcut sits on the Desktop.
cd /d "%~dp0"

if not exist "%~dp0package.json" (
  echo package.json が見つかりません。このファイルは「つなぐ」のフォルダに置いてください。
  pause
  exit /b 1
)

echo %~dp0> "%USERPROFILE%\.tsunagu-repo.txt"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js が見つかりません。https://nodejs.org から LTS を入れて、もう一度このファイルを開いてください。
  pause
  exit /b 1
)

where npm >nul 2>&1
if errorlevel 1 (
  echo npm が見つかりません。Node.js の入れ直し後、PC を再起動してから試してください。
  pause
  exit /b 1
)

echo [1/3] 必要なパッケージを入れます（初回は少し時間がかかります）
call npm install
if errorlevel 1 (
  echo npm install に失敗しました。
  pause
  exit /b 1
)

echo [2/3] 以前の画面が 3000 番で残っていれば止めます
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo   PID %%P を終了します
  taskkill /F /PID %%P >nul 2>&1
)

echo [3/3] ブラウザで http://localhost:3000 を開きます
start "" "http://localhost:3000"

echo.
echo  生徒  http://localhost:3000/login/student   例: 2A-01 / student
echo  先生  http://localhost:3000/login/teacher   例: T-1001 / teacher
echo  管理  http://localhost:3000/login/admin     例: A-0001 / admin
echo.
echo  この黒い窓は閉じないでください。終えるときは Ctrl+C のあと、何かキーを押します。
echo.

call npm run dev
echo.
pause
endlocal
