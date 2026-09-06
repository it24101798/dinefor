@echo off
setlocal

echo === DineFor Release 4.4 Validation ===

node --check server\controllers\inventoryController.js
if errorlevel 1 exit /b 1

node --check server\controllers\bookingController.js
if errorlevel 1 exit /b 1

node --check server\routes\bookingRoutes.js
if errorlevel 1 exit /b 1

node --check server\models\BuffetSeatInventory.js
if errorlevel 1 exit /b 1

node --check server\models\Buffet.js
if errorlevel 1 exit /b 1

findstr /C:"/availability/:buffetId/calendar" server\routes\bookingRoutes.js >nul
if errorlevel 1 (
  echo [FAIL] Availability calendar route missing
  exit /b 1
)
echo [OK] Availability calendar

findstr /C:"/my-bookings/:id/modify" server\routes\bookingRoutes.js >nul
if errorlevel 1 (
  echo [FAIL] Booking modification route missing
  exit /b 1
)
echo [OK] Customer modification route

findstr /C:"/inventory/:buffetId" server\routes\bookingRoutes.js >nul
if errorlevel 1 (
  echo [FAIL] Hotel inventory route missing
  exit /b 1
)
echo [OK] Hotel inventory exceptions

pushd client
call npm run build
if errorlevel 1 (
  popd
  exit /b 1
)
popd

echo.
echo [PASS] Release 4.4 validation complete.
pause
