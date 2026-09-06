@echo off
setlocal
cd /d "%~dp0"
echo === DineFor Release 4.3 Validation ===

echo [1/5] Required files...
for %%F in (server\controllers\discoveryController.js server\services\discoveryRankingService.js server\models\DiscoveryEvent.js server\routes\discoveryRoutes.js client\src\services\discoveryService.js) do (
  if not exist "%%F" (echo [FAIL] Missing %%F & exit /b 1) else echo [OK] %%F
)

echo [2/5] Backend syntax...
node --check server\controllers\discoveryController.js || exit /b 1
node --check server\services\discoveryRankingService.js || exit /b 1
node --check server\models\DiscoveryEvent.js || exit /b 1
node --check server\routes\discoveryRoutes.js || exit /b 1

echo [3/5] Discovery endpoints...
findstr /c:"/search" server\routes\discoveryRoutes.js >nul || exit /b 1
findstr /c:"/trending" server\routes\discoveryRoutes.js >nul || exit /b 1
findstr /c:"/suggestions" server\routes\discoveryRoutes.js >nul || exit /b 1
findstr /c:"/events" server\routes\discoveryRoutes.js >nul || exit /b 1

echo [4/5] Client production build...
pushd client
call npm run build
if errorlevel 1 (popd & exit /b 1)
popd

echo [5/5] Complete.
echo [PASS] Release 4.3 validation completed successfully.
endlocal
