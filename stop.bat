@echo off
setlocal
title BizSensAi Support Hub - stopping
cd /d "%~dp0"

rem Stops the web app (4173), dev server (5173) and AI helper (8787).
powershell -NoProfile -Command "$found = $false; foreach ($port in 4173,5173,8787) { $ids = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($id in $ids) { try { Stop-Process -Id $id -Force -ErrorAction Stop; Write-Host ('Stopped port ' + $port); $found = $true } catch {} } }; if (-not $found) { Write-Host 'Nothing was running.' }"

echo BizSensAi Support Hub is stopped.
ping -n 4 127.0.0.1 >nul
exit /b 0
