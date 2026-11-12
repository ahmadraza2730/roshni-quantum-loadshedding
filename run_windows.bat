@echo off
title Roshni
cd /d "%~dp0"
set "VENV=%USERPROFILE%\.venvs\roshni"
if not exist "%VENV%\Scripts\python.exe" (
  echo Environment not set up yet - run setup_windows.bat first.
  pause
  exit /b 1
)
"%VENV%\Scripts\python.exe" run_demo.py %*
"%VENV%\Scripts\python.exe" make_demo_page.py
start "" "%~dp0demo\index.html"
pause
