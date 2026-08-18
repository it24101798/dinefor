@echo off
setlocal
echo.
echo DineFor Release 3 FINAL
echo =======================
echo This bundle must be extracted over the DineFor project root first.
echo.
echo Installing backend dependencies...
pushd "%~dp0server"
call npm install
if errorlevel 1 goto :fail
popd

echo.
echo Validating frontend production build...
pushd "%~dp0client"
call npm run build
if errorlevel 1 goto :fail
popd

echo.
echo PASS: Release 3 FINAL dependencies and frontend build completed.
echo Start server and client normally for QA.
exit /b 0

:fail
echo.
echo FAILED. Review the terminal error before deployment.
exit /b 1
