@echo off
setlocal
title BizSensAi Support Hub - starting
cd /d "%~dp0"

set "URL=http://localhost:4173"

where node >nul 2>&1
if errorlevel 1 (
  echo [x] Node.js is not installed. Install it from https://nodejs.org and run this again.
  pause
  exit /b 1
)

rem Already running? Just open the browser.
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort 4173 -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if not errorlevel 1 (
  echo BizSensAi Support Hub is already running.
  start "" "%URL%"
  exit /b 0
)

if not exist "node_modules\" (
  echo [1/3] Installing dependencies ^(first run only, needs internet^)...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto :failed
)

rem Rebuild only when the build is missing or older than the source / settings.
powershell -NoProfile -Command "$d='dist\index.html'; if (-not (Test-Path $d)) { exit 1 }; $t=(Get-Item $d).LastWriteTime; $newer = Get-ChildItem -Recurse -File src,public,index.html,.env,vite.config.ts,tailwind.config.js -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -gt $t } | Select-Object -First 1; if ($newer) { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo [2/3] Building the app...
  call npm run build
  if errorlevel 1 goto :failed
) else (
  echo [2/3] Build is up to date.
)

echo [3/3] Starting servers...
start "BizSensAi AI helper" /min cmd /c "npx tsx server/index.ts"
start "BizSensAi Support Hub" /min cmd /c "npx vite preview --port 4173 --strictPort"

rem Wait up to 60 seconds for the web app to answer.
powershell -NoProfile -Command "for ($i=0; $i -lt 60; $i++) { try { Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%URL%' | Out-Null; exit 0 } catch { Start-Sleep -Seconds 1 } }; exit 1"
if errorlevel 1 (
  echo [x] The web app did not start. Check the minimised "BizSensAi Support Hub" window for errors.
  pause
  exit /b 1
)

start "" "%URL%"
echo.
echo BizSensAi Support Hub is running at %URL%
echo Press Shift+D in the app for the Demo Director. Run stop.bat to stop.
ping -n 6 127.0.0.1 >nul
exit /b 0

:failed
echo.
echo [x] Something went wrong above. Fix it and run start.bat again.
pause
exit /b 1
