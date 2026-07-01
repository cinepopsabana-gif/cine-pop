// Agente local de impresión para Cine Pop
// Corre en la PC de la taquilla (misma red que la impresora térmica RPT006)
// Recibe peticiones desde la app web (Vercel) y las traduce a comandos ESC/POS.

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ThermalPrinter, PrinterTypes } = require('node-thermal-printer');

const PRINTER_IP = process.env.PRINTER_IP || '192.168.1.100';
const PRINTER_PORT = process.env.PRINTER_PORT || 9100;
const AGENT_PORT = process.env.AGENT_PORT || 4000;
const ALLOWED_ORIGIN = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim());

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
  })
);

function getPrinter() {
  return new ThermalPrinter({
    type: PrinterTypes.EPSON, // Compatible con comandos ESC/POS genéricos como el RPT006
    interface: `tcp://${PRINTER_IP}:${PRINTER_PORT}`,
    removeSpecialCharacters: false,
    lineCharacter: '-',
    options: {
      timeout: 5000,
    },
  });
}

function money(n) {
  return '$' + Math.round(Number(n) || 0).toLocaleString('es-CO');
}

// Salud del agente / prueba rápida de que está corriendo
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cine-pop-print-agent' });
});

// Imprime un ticket de prueba, útil para verificar la conexión con la impresora
app.post('/test', async (_req, res) => {
  try {
    const printer = getPrinter();
    const connected = await printer.isPrinterConnected();
    if (!connected) {
      return res.status(503).json({ ok: false, error: 'No se pudo conectar con la impresora. Revisa la IP/red.' });
    }

    printer.alignCenter();
    printer.bold(true);
    printer.println('CINE POP');
    printer.bold(false);
    printer.println('Ticket de prueba de conexion');
    printer.drawLine();
    printer.println(new Date().toLocaleString('es-CO'));
    printer.cut();
    await printer.execute();

    res.json({ ok: true });
  } catch (err) {
    console.error('Error en /test:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Imprime la boleta de una compra: un ticket físico por cada butaca + un ticket resumen si hay dulcería
app.post('/print', async (req, res) => {
  try {
    const {
      reservationCode,
      movieTitle,
      cinema,
      date,
      time,
      seats = [],
      snacks = [],
      total,
      paymentMethod,
    } = req.body || {};

    if (!movieTitle || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ ok: false, error: 'Faltan datos del ticket (movieTitle, seats).' });
    }

    const printer = getPrinter();
    const connected = await printer.isPrinterConnected();
    if (!connected) {
      return res.status(503).json({
        ok: false,
        error: `No se pudo conectar con la impresora en ${PRINTER_IP}:${PRINTER_PORT}. Verifica que esté encendida y en la misma red.`,
      });
    }

    // Un ticket físico por cada butaca, igual al formato de boleta de taquilla
    for (const seat of seats) {
      printer.alignCenter();
      printer.bold(true);
      printer.setTextSize(1, 1);
      printer.println('CINE POP');
      printer.setTextSize(0, 0);
      printer.bold(false);
      printer.println(cinema || 'Cine Pop');
      printer.newLine();

      printer.alignLeft();
      printer.println(`Sala: ${cinema || '-'}`);
      printer.bold(true);
      printer.println(`Puesto: ${seat.id || seat}`);
      printer.bold(false);
      printer.drawLine();
      printer.println('Pelicula:');
      printer.bold(true);
      printer.println(movieTitle);
      printer.bold(false);
      printer.println(`Hora: ${time || '-'}`);
      printer.println(`Fecha: ${date || '-'}`);
      printer.drawLine();
      if (reservationCode) {
        printer.println(`Reserva: ${reservationCode}`);
      }
      if (paymentMethod) {
        printer.println(`Pago: ${paymentMethod === 'transfer' ? 'PSE / Transferencia' : 'Efectivo en taquilla'}`);
      }
      printer.alignCenter();
      printer.println('--------------------------------');
      printer.println('Disfruta la pelicula');
      printer.cut();
    }

    // Ticket adicional con dulceria y total, si aplica
    if ((snacks && snacks.length > 0) || total) {
      printer.alignCenter();
      printer.bold(true);
      printer.println('CINE POP');
      printer.println('Resumen de compra');
      printer.bold(false);
      printer.drawLine();
      printer.alignLeft();

      if (reservationCode) {
        printer.println(`Reserva: ${reservationCode}`);
      }

      if (snacks && snacks.length > 0) {
        printer.println('Extras:');
        for (const item of snacks) {
          const qty = item.quantity ?? item.qty ?? 1;
          const name = item.name || (item.snack && item.snack.name) || 'Item';
          const price = item.price ?? (item.snack && item.snack.price) ?? 0;
          printer.tableCustom([
            { text: `${qty}x ${name}`, align: 'LEFT', width: 0.7 },
            { text: money(price * qty), align: 'RIGHT', width: 0.3 },
          ]);
        }
        printer.drawLine();
      }

      if (total) {
        printer.bold(true);
        printer.tableCustom([
          { text: 'TOTAL', align: 'LEFT', width: 0.5 },
          { text: money(total), align: 'RIGHT', width: 0.5 },
        ]);
        printer.bold(false);
      }

      printer.alignCenter();
      printer.println('Gracias por elegir Cine Pop');
      printer.cut();
    }

    await printer.execute();
    res.json({ ok: true, ticketsImpresos: seats.length });
  } catch (err) {
    console.error('Error en /print:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.listen(AGENT_PORT, () => {
  console.log('==========================================');
  console.log('  Cine Pop - Agente de impresion local');
  console.log('==========================================');
  console.log(`  Escuchando en:   http://localhost:${AGENT_PORT}`);
  console.log(`  Impresora:       ${PRINTER_IP}:${PRINTER_PORT}`);
  console.log(`  Origenes CORS:   ${ALLOWED_ORIGIN.join(', ')}`);
  console.log('  No cierres esta ventana mientras uses la taquilla.');
  console.log('==========================================');
});
