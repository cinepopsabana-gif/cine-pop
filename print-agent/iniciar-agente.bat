@echo off
title Cine Pop - Agente de Impresora
cd /d "%~dp0"

if not exist node_modules (
  echo Instalando dependencias por primera vez, espera un momento...
  call npm install
)

if not exist .env (
  echo No existe el archivo .env
  echo Copia .env.example a .env y coloca la IP de tu impresora.
  pause
  exit /b
)

echo Iniciando el agente de impresora de Cine Pop...
echo No cierres esta ventana mientras la taquilla este en uso.
echo.
call npm start
pause
