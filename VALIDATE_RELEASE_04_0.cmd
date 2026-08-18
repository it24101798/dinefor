@echo off
setlocal
echo.
echo DineFor Release 4.0 - Responsive Architecture Validation
echo ========================================================
echo.

pushd "%~dp0client"
call npm run build
if errorlevel 1 goto :fail
popd

echo.
echo PASS: frontend production build completed.
echo Run npm run dev and inspect Home, Feed and Listings at 320/390/430/768/1024 widths.
exit /b 0

:fail
echo.
echo FAILED: review the build error above before deploying.
exit /b 1
