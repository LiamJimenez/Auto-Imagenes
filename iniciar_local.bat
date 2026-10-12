@echo off
cd /d "%~dp0"
py -3 servidor_local.py
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Python. Instala Python 3 o ejecuta: python servidor_local.py
  pause
)
