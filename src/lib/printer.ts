// Cliente para el agente local de impresión térmica (print-agent).
// La app en Vercel no puede hablar directo con la impresora de la taquilla,
// así que le pide a un pequeño servidor local (corriendo en la PC de la
// taquilla, en la misma red que la impresora) que imprima por ella.

export interface PrintTicketPayload {
  reservationCode: string;
  movieTitle: string;
  cinema: string;
  date: string;
  time: string;
  seats: { id: string }[];
  snacks?: { name: string; price: number; quantity: number }[];
  total?: number;
  paymentMethod?: 'transfer' | 'cash';
}

export interface PrintResult {
  ok: boolean;
  error?: string;
}

function getAgentUrl(): string {
  // Configurable por si el agente corre en otra IP/puerto (poco común: normalmente
  // el navegador de la taquilla y el agente están en la misma PC, o sea localhost).
  return import.meta.env.VITE_PRINTER_AGENT_URL || 'http://localhost:4000';
}

/**
 * Intenta imprimir el ticket en la impresora térmica física de la taquilla.
 * Requiere que print-agent esté corriendo en la PC de la taquilla.
 */
export async function printTicketOnThermalPrinter(
  payload: PrintTicketPayload
): Promise<PrintResult> {
  const agentUrl = getAgentUrl();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${agentUrl}/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || 'La impresora no pudo procesar el ticket.',
      };
    }

    return { ok: true };
  } catch (err) {
    const isAbort = err instanceof DOMException && err.name === 'AbortError';
    return {
      ok: false,
      error: isAbort
        ? 'No se pudo conectar con el agente de impresión (tiempo agotado). ¿Está corriendo en esta PC?'
        : 'No se pudo conectar con el agente de impresión local. Verifica que esté abierto en esta PC (print-agent).',
    };
  }
}
