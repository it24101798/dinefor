@echo off
setlocal
set "BUNDLE=%~dp0"
set "PROJECT=%CD%"
if not exist "%PROJECT%\client\src\App.jsx" (
 echo ERROR: Run this file from the DineFor project root.
 pause
 exit /b 1
)
echo Applying DineFor Release 4.1...
xcopy /E /I /Y "%BUNDLE%client" "%PROJECT%\client" >nul
xcopy /E /I /Y "%BUNDLE%server" "%PROJECT%\server" >nul
copy /Y "%BUNDLE%RELEASE_04_1_SEO_FOUNDATION.md" "%PROJECT%\RELEASE_04_1_SEO_FOUNDATION.md" >nul
echo Release files applied. Running production build...
cd /d "%PROJECT%\client"
call npm run build
if errorlevel 1 (
 echo BUILD FAILED. Do not deploy yet.
 pause
 exit /b 1
)
echo BUILD PASSED. Release 4.1 is ready for QA.
pause
