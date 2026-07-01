# Cine Pop — Agente de Impresión Térmica

Tu app (`cine-pop-ten.vercel.app`) vive en internet, pero tu impresora RPT006 vive
en la red local de la taquilla. No pueden hablarse directamente. Este pequeño
programa corre en la PC de la taquilla y hace de puente entre ambos.

```
[App en Vercel, en el navegador de la taquilla]
        |  fetch a http://localhost:4000/print
        v
[Este agente (Node.js), en la misma PC]
        |  ESC/POS por TCP puerto 9100
        v
[Impresora RPT006 en la red local]
```

## 1. Instalación (una sola vez)

En la PC de la taquilla, con Node.js instalado:

```bash
cd print-agent
npm install
cp .env.example .env
```

## 2. Configurar la IP de la impresora

Abre `.env` y coloca la IP real de tu impresora en `PRINTER_IP`.

**¿Cómo la averiguo?** Con la impresora apagada, mantén presionado el botón de
alimentación de papel (FEED) y enciéndela sin soltarlo. Imprimirá un ticket de
auto-diagnóstico que incluye su dirección IP dentro de la red. Anótala.

**Recomendado:** en tu router, reserva esa IP para la impresora (DHCP reservation /
IP fija) para que no cambie con el tiempo y tengas que repetir este paso.

En `ALLOWED_ORIGIN` deja tu dominio de Vercel (ya viene puesto:
`https://cine-pop-ten.vercel.app`), y `http://localhost:3000` para cuando pruebes
la app en tu propia máquina con `npm run dev`.

## 3. Iniciar el agente

Doble clic en `iniciar-agente.bat`, o desde la terminal:

```bash
npm start
```

Debe quedar la ventana abierta mientras se use la taquilla (igual que
`iniciar-cine-pop.bat` en la raíz del proyecto). Puedes minimizarla.

### 3.1 (Recomendado) Dejarlo corriendo siempre, como servicio de Windows

Para que el agente arranque solo con la PC, sin ventanas visibles, y se
reinicie solo si se cae:

1. Descarga [NSSM](https://nssm.cc/download), descomprímelo y copia
   `nssm.exe` (la versión de la carpeta `win64`) dentro de esta misma carpeta
   `print-agent`.
2. Clic derecho sobre `instalar-servicio-windows.bat` → **Ejecutar como
   administrador**.
3. Listo. Revisa que quedó corriendo con:
   ```bash
   nssm status CinePopPrintAgent
   ```

Comandos útiles después de instalado:

```bash
nssm stop CinePopPrintAgent      REM detenerlo
nssm restart CinePopPrintAgent   REM reiniciarlo
nssm remove CinePopPrintAgent confirm   REM desinstalarlo
```

Los logs quedan en `print-agent/agente.log` y `agente-error.log`, útiles si
algún día la impresora deja de responder y quieres ver qué pasó.

**Importante:** con esto instalado, ya NO necesitas usar
`iniciar-agente.bat` — el servicio arranca automáticamente en cada inicio de
Windows, incluso antes de iniciar sesión.

## 4. Probar la conexión

Con el agente corriendo, desde cualquier navegador en esa misma PC visita:

```
http://localhost:4000/health
```

Debe responder `{"ok":true,...}`. Luego prueba la impresora real:

```bash
curl -X POST http://localhost:4000/test
```

Esto debería sacar un ticket de prueba por la RPT006.

## 5. Usarlo desde la app

Ya no tienes que hacer nada más: en la pantalla de "¡Compra Exitosa!" del
checkout aparece un botón **"Imprimir en Taquilla"** que llama a este agente
automáticamente e imprime una boleta física por cada butaca comprada (y un
ticket extra con la dulcería/total si aplica).

Si el agente no está corriendo o la impresora está apagada, la app te avisará
con un mensaje claro en lugar de fallar en silencio — y siempre queda
disponible el botón "Descargar Ticket" como respaldo.

## Notas

- El agente **debe correr en la misma PC** (o red local) donde está físicamente
  la impresora — no se puede alojar en Vercel.
- Si algún día cambian de computadora en taquilla, solo repite los pasos 1-3
  en la nueva máquina.
- Si quieren usar USB en vez de LAN, cambien en `server.js` la línea
  `interface: tcp://IP:PUERTO` por `interface: 'printer:AUTO'` (Windows/Linux
  detectan la impresora USB genérica ESC/POS automáticamente) o el puerto
  específico, por ejemplo `'printer:USB001'` en Windows.
