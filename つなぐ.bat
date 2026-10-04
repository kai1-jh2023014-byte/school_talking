@echo off
setlocal EnableExtensions
chcp 65001 >nul
title つなぐ

REM Desktop copy: jump to the saved repo path. Repo copy: jump to this folder.
set "REPO="
if exist "%~dp0package.json" set "REPO=%~dp0"

if not defined REPO if exist "%USERPROFILE%\.tsunagu-repo.txt" (
  set /p REPO=<"%USERPROFILE%\.tsunagu-repo.txt"
)

if not defined REPO if exist "%USERPROFILE%\school_talking\package.json" set "REPO=%USERPROFILE%\school_talking\"
if not defined REPO if exist "%USERPROFILE%\Documents\school_talking\package.json" set "REPO=%USERPROFILE%\Documents\school_talking\"
if not defined REPO if exist "%USERPROFILE%\Desktop\school_talking\package.json" set "REPO=%USERPROFILE%\Desktop\school_talking\"

if not defined REPO (
  echo つなぐのフォルダが見つかりません。
  echo リポジトリの中にある start.bat を、先に一度実行してください。
  echo または「デスクトップにショートカットを作る.bat」をリポジトリで開いてください。
  pause
  exit /b 1
)

if not exist "%REPO%start.bat" (
  echo "%REPO%" に start.bat がありません。
  pause
  exit /b 1
)

cd /d "%REPO%"
call "%REPO%start.bat"
endlocal
