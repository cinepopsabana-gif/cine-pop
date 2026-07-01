@echo off
REM =========================================================
REM  Instala el Agente de Impresion de Cine Pop como SERVICIO
REM  de Windows, usando NSSM (Non-Sucking Service Manager).
REM
REM  Requisitos antes de correr esto:
REM   1. Node.js instalado en esta PC (nodejs.org)
REM   2. Haber corrido "npm install" dentro de esta carpeta
REM   3. Haber configurado el archivo .env con la IP de la impresora
REM   4. Descargar NSSM desde https://nssm.cc/download,
REM      descomprimirlo, y copiar nssm.exe (la version win64)
REM      dentro de ESTA MISMA carpeta (print-agent)
REM
REM  Correr este .bat como Administrador
REM  (clic derecho -> "Ejecutar como administrador")
REM =========================================================

setlocal
cd /d "%~dp0"

if not exist nssm.exe (
  echo.
  echo [ERROR] No se encontro nssm.exe en esta carpeta.
  echo Descargalo de https://nssm.cc/download, copia nssm.exe
  echo dentro de la carpeta print-agent, y vuelve a correr este script.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando dependencias por primera vez...
  call npm install
)

if not exist .env (
  echo.
  echo [ERROR] No existe .env - copia .env.example a .env
  echo y coloca la IP real de la impresora antes de continuar.
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%i in ('where node') do set NODE_PATH=%%i

echo.
echo Instalando servicio "CinePopPrintAgent"...
nssm install CinePopPrintAgent "%NODE_PATH%" "server.js"
nssm set CinePopPrintAgent AppDirectory "%~dp0"
nssm set CinePopPrintAgent AppStdout "%~dp0agente.log"
nssm set CinePopPrintAgent AppStderr "%~dp0agente-error.log"
nssm set CinePopPrintAgent Start SERVICE_AUTO_START
nssm set CinePopPrintAgent AppRestartDelay 3000
nssm set CinePopPrintAgent DisplayName "Cine Pop - Agente de Impresora"
nssm set CinePopPrintAgent Description "Puente entre la app web de Cine Pop y la impresora termica de taquilla"

echo.
echo Iniciando el servicio...
nssm start CinePopPrintAgent

echo.
echo =========================================================
echo  Listo. El agente ahora corre como servicio de Windows.
echo  - Arranca solo cuando se enciende la PC (sin iniciar sesion)
echo  - Se reinicia solo si se cae
echo  - No muestra ninguna ventana
echo.
echo  Para ver el estado:      nssm status CinePopPrintAgent
echo  Para detenerlo:          nssm stop CinePopPrintAgent
echo  Para desinstalarlo:      nssm remove CinePopPrintAgent confirm
echo  Los logs quedan en:      agente.log / agente-error.log
echo =========================================================
echo.
pause
