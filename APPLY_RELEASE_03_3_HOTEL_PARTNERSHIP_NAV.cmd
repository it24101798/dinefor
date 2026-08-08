@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\apply-release-03-3-hotel-partnership-nav.ps1"
if errorlevel 1 (
  echo.
  echo Hotfix failed. No deployment should be attempted until the error is fixed.
  exit /b 1
)
echo.
echo Hotfix complete.
