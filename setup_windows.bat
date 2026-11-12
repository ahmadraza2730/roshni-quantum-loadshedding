@echo off
setlocal EnableDelayedExpansion
title Roshni setup
cd /d "%~dp0"
echo ================================================
echo   Roshni - one-click setup for Windows
echo ================================================
echo.

rem The virtual environment lives outside OneDrive so thousands of library
rem files are not synced to the cloud.
set "VENV=%USERPROFILE%\.venvs\roshni"
set "PY="

rem 1. Find a Python 3.10-3.13 (Qiskit supports these)
for %%V in (3.12 3.13 3.11 3.10) do (
  if not defined PY (
    py -%%V -c "import sys" >nul 2>&1 && set "PY=py -%%V"
  )
)
if not defined PY (
  for %%P in ("%LOCALAPPDATA%\Programs\Python\Python312\python.exe" "%LOCALAPPDATA%\Programs\Python\Python313\python.exe" "%LOCALAPPDATA%\Programs\Python\Python311\python.exe") do (
    if not defined PY if exist %%P set "PY=%%~P"
  )
)

rem 2. Install Python 3.12 with winget if none was found
if not defined PY (
  echo [1/4] Python not found - installing Python 3.12 with winget...
  winget install -e --id Python.Python.3.12 --scope user --accept-package-agreements --accept-source-agreements
  if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PY=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
  ) else (
    echo.
    echo Could not install Python automatically.
    echo Install Python 3.12 from https://www.python.org/downloads/ and tick "Add python.exe to PATH",
    echo then run this file again.
    pause
    exit /b 1
  )
) else (
  echo [1/4] Found Python: !PY!
)

rem 3. Create the virtual environment
if not exist "%VENV%\Scripts\python.exe" (
  echo [2/4] Creating virtual environment in %VENV% ...
  !PY! -m venv "%VENV%"
  if errorlevel 1 ( echo Failed to create the virtual environment. & pause & exit /b 1 )
) else (
  echo [2/4] Virtual environment already exists.
)

rem 4. Install libraries
echo [3/4] Installing Qiskit and libraries (first time takes a few minutes)...
"%VENV%\Scripts\python.exe" -m pip install --upgrade pip --quiet
"%VENV%\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 ( echo. & echo Library install failed - see the messages above. & pause & exit /b 1 )

rem 5. Smoke test: run the project
echo.
echo [4/4] Running Roshni (quick mode)...
"%VENV%\Scripts\python.exe" run_demo.py --quick
if errorlevel 1 ( echo Run failed - see the messages above. & pause & exit /b 1 )
"%VENV%\Scripts\python.exe" make_demo_page.py

echo.
echo ================================================
echo   SETUP COMPLETE
echo   Next time just double-click run_windows.bat
echo ================================================
start "" "%~dp0demo\index.html"
pause
