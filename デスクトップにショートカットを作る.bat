@echo off
setlocal EnableExtensions
chcp 65001 >nul
title つなぐ - デスクトップへ

cd /d "%~dp0"
if not exist "%~dp0start.bat" (
  echo start.bat と同じフォルダで開いてください。
  pause
  exit /b 1
)

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
echo %ROOT%> "%USERPROFILE%\.tsunagu-repo.txt"

set "DESKTOP="
for /f "usebackq delims=" %%D in (`powershell -NoProfile -Command "[Environment]::GetFolderPath('Desktop')"`) do set "DESKTOP=%%D"
if not defined DESKTOP set "DESKTOP=%USERPROFILE%\Desktop"

copy /Y "%~dp0つなぐ.bat" "%DESKTOP%\つなぐ.bat" >nul

powershell -NoProfile -Command "$d = [Environment]::GetFolderPath('Desktop'); $s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $d 'つなぐ.lnk')); $s.TargetPath = Join-Path '%ROOT%' 'start.bat'; $s.WorkingDirectory = '%ROOT%'; $s.WindowStyle = 1; $s.Description = 'つなぐを起動'; $s.Save()"

echo.
echo デスクトップに「つなぐ」を置きました。
echo そこを開くと、このフォルダのアプリが起動します。
echo.
pause
endlocal
