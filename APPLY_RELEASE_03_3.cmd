@echo off
setlocal
cd /d "%~dp0"
if exist "client\src\components\discovery\MasonryGrid.jsx" (
  del /q "client\src\components\discovery\MasonryGrid.jsx"
  echo Removed obsolete Release 3.2 MasonryGrid.jsx
)
echo Release 3.3 cleanup complete.
echo Now run: cd client ^&^& npm run build
endlocal
