@echo off
setlocal
echo === DineFor Release 4.2 Validation ===
findstr /c:"/destinations/:citySlug" client\src\App.jsx
findstr /c:"seo:backfill-slugs" server\package.json
findstr /c:"getSeoCatalog" server\routes\seoRoutes.js
if not exist client\src\pages\seo\DestinationPage.jsx exit /b 1
if not exist client\src\pages\seo\PriceCollectionPage.jsx exit /b 1
if not exist server\config\seoCatalog.js exit /b 1
if not exist server\scripts\backfill-seo-slugs.js exit /b 1
pushd client
call npm run build
if errorlevel 1 exit /b 1
popd
echo [OK] Release 4.2 source + frontend build
pause
