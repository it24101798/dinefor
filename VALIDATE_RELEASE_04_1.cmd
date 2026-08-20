@echo off
setlocal
if not exist "client\src\App.jsx" (echo ERROR: Run from project root.& pause & exit /b 1)
echo === DineFor Release 4.1 Validation ===
findstr /C:"best-buffets-in-colombo" client\src\App.jsx
findstr /C:"/api/seo" server\server.js
if exist client\public\robots.txt (echo [OK] robots.txt) else (echo [FAIL] robots.txt)
if exist server\routes\seoRoutes.js (echo [OK] SEO routes) else (echo [FAIL] SEO routes)
cd client
call npm run build
pause
