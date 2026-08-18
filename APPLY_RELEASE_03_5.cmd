@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo DineFor Release 3.5 - Safe UI Restoration
echo ================================================
echo.

if not exist "client\src\main.jsx" (
  echo ERROR: Run this bundle from the DineFor project root.
  echo Expected: client\src\main.jsx
  exit /b 1
)

if exist "client\src\styles\design" (
  echo Removing rejected Release 3.4 design layer...
  rmdir /s /q "client\src\styles\design"
)

echo Release 3.5 restoration files are already in this bundle structure.
echo If you extracted this ZIP directly over your project, the restored files are now in place.
echo.
echo Next run:
echo   cd client
echo   npm run build
echo   npm run dev
echo.
endlocal
