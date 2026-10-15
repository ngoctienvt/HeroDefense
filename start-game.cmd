@echo off
setlocal
cd /d "%~dp0"
title Thien Dao - Web Co-op
if not exist "logs" mkdir "logs"
set "LAUNCH_LOG=%~dp0logs\start-game.log"
echo [%date% %time%] Launcher started.>>"%LAUNCH_LOG%"
if not defined PORT set "PORT=2567"

where node >nul 2>&1
if errorlevel 1 (
  echo Node.js is missing. Install Node.js 22.12 or newer, then double-click this file again.
  goto failed
)
node -e "const v=process.versions.node.split('.').map(Number);process.exit(v[0]>22||v[0]===22&&v[1]>=12?0:1)"
if errorlevel 1 (
  echo Node.js 22.12 or newer is required.
  goto failed
)
where npm >nul 2>&1
if errorlevel 1 (
  echo npm is missing. Reinstall Node.js with npm, then double-click this file again.
  goto failed
)
node -e "const p=Number(process.env.PORT);process.exit(Number.isInteger(p)&&p>=1&&p<=65535?0:1)"
if errorlevel 1 (
  echo PORT must be a number from 1 to 65535.
  goto failed
)

rem Stop previous server on the same port so we always rebuild and run the latest code.
powershell -NoProfile -Command "$p=[int]$env:PORT; $c=Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue; if ($c) { Write-Host 'Closing old server on port' $p '...'; $c | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 600 }"
powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort ([int]$env:PORT) -State Listen -ErrorAction SilentlyContinue) { exit 1 }"
if errorlevel 1 (
  echo Port %PORT% is in use and could not be freed. Close the old process and try again.
  goto failed
)

if not exist "node_modules\@colyseus\core\package.json" (
  echo Installing packages for the first run...
  echo [%date% %time%] Installing packages.>>"%LAUNCH_LOG%"
  call npm ci
  if errorlevel 1 goto failed
)
echo Building the latest game...
echo [%date% %time%] Building game.>>"%LAUNCH_LOG%"
call npm run build
if errorlevel 1 goto failed

start "" /b powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0tools\open-game-when-ready.ps1" -Port %PORT% -LogPath "%LAUNCH_LOG%"
echo Starting game. Your browser will open when the server is ready.
echo Keep this window open while playing. Ctrl+C stops the server.
echo [%date% %time%] Starting server.>>"%LAUNCH_LOG%"
call npm start
if errorlevel 1 goto failed
exit /b 0

:failed
echo [%date% %time%] Launcher failed.>>"%LAUNCH_LOG%"
echo Startup failed. See logs\start-game.log and the error above.
pause
exit /b 1
