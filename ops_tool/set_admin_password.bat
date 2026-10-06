@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Set Admin Password

echo.
echo ================================================
echo   Set admin login password (MongoDB)
echo ================================================
echo.

set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY (
  where python >nul 2>&1 && set "PY=python"
)
if not defined PY (
  echo ERROR: Python not found.
  echo Install Python 3 and check "Add python.exe to PATH".
  pause
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [1/2] Creating venv and installing packages...
  %PY% -m venv .venv
  if errorlevel 1 (
    echo ERROR: failed to create .venv
    pause
    exit /b 1
  )
)

if not exist ".venv\Scripts\python.exe" (
  echo ERROR: .venv\Scripts\python.exe missing
  pause
  exit /b 1
)

echo Installing/updating packages...
".venv\Scripts\python.exe" -m pip install -U pip
".venv\Scripts\python.exe" -m pip install -r "%~dp0requirements.txt"
if errorlevel 1 (
  echo ERROR: pip install failed
  pause
  exit /b 1
)

if not exist "%~dp0set_admin_password.py" (
  echo ERROR: set_admin_password.py not found in:
  echo %~dp0
  pause
  exit /b 1
)

echo.
".venv\Scripts\python.exe" "%~dp0set_admin_password.py"
set "ERR=%ERRORLEVEL%"
echo.
if not "%ERR%"=="0" (
  echo Failed. Exit code: %ERR%
) else (
  echo Done.
)
pause
exit /b %ERR%
