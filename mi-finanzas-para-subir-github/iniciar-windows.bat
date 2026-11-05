@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js LTS desde https://nodejs.org
  pause
  exit /b 1
)
start "Mi Finanzas - servidor" cmd /k "node scripts/serve.mjs"
timeout /t 2 /nobreak >nul
start "" "http://localhost:4173"
