@echo off
title Cine Pop - Iniciando...
cd /d "%~dp0"
echo Iniciando Cine Pop, espera un momento...
echo No cierres esta ventana mientras uses la app.
echo.
call npm run dev
pause
