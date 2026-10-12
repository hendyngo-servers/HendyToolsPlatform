@echo off
chcp 65001 >nul
cd /d "%~dp0"
py -3 -m pip install --upgrade pip
py -3 -m pip install -r requirements.txt
if errorlevel 1 (
  echo.
  echo Cai thu vien that bai. Hay cai Python 3.10+ va thu lai.
  pause
  exit /b 1
)
py -3 hendy_tools_pro.py
if errorlevel 1 pause
