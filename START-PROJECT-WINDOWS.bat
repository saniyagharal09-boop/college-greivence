@echo off
cd /d "%~dp0Backend"
if not exist .env (
  echo Missing Backend\.env. Copy Backend\.env.example to Backend\.env and edit JWT_SECRET first.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing backend dependencies...
  call npm.cmd install
  if errorlevel 1 pause & exit /b 1
)
call npm.cmd start
pause
