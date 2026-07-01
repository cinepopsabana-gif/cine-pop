import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SaleRecord } from '../types';

type OccupiedMap = Record<string, Record<string, 'vendido' | 'apartado'>>;

export function useSupabaseOccupiedSeats(fallback: OccupiedMap) {
  const [occupiedSeats, setOccupiedSeatsState] = useState<OccupiedMap>(fallback);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipNextSync = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase.from('occupied_seats').select('*');
      if (error) {
        console.error('Error cargando occupied_seats desde Supabase:', error.message);
        setIsLoaded(true);
        return;
      }
      if (!isMounted) return;

      if (data && data.length > 0) {
        const map: OccupiedMap = {};
        data.forEach((row: any) => {
          if (!map[row.showtime_id]) map[row.showtime_id] = {};
          map[row.showtime_id][row.seat_id] = row.status;
        });
        skipNextSync.current = true;
        setOccupiedSeatsState(map);
      } else if (Object.keys(fallback).length > 0) {
        const rows: any[] = [];
        Object.entries(fallback).forEach(([showtimeId, seats]) => {
          Object.entries(seats).forEach(([seatId, status]) => {
            rows.push({ showtime_id: showtimeId, seat_id: seatId, status });
          });
        });
        if (rows.length > 0) {
          await supabase.from('occupied_seats').insert(rows);
        }
      }
      setIsLoaded(true);
    }

    load();

    const channel = supabase
      .channel('public:occupied_seats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'occupied_seats' }, () => {
        load();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // setOccupiedSeats genérico: usado por el panel admin para liberar asientos,
  // apartar manualmente, etc. Aquí sí hacemos un reemplazo completo de la tabla
  // porque el admin puede hacer cambios masivos (ej. liberar todos los asientos).
  useEffect(() => {
    if (!isLoaded) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    async function sync() {
      const rows: any[] = [];
      Object.entries(occupiedSeats).forEach(([showtimeId, seats]) => {
        Object.entries(seats).forEach(([seatId, status]) => {
          rows.push({ showtime_id: showtimeId, seat_id: seatId, status });
        });
      });

      // Reemplazo completo: borra todo y reinserta el estado actual.
      // Es aceptable aquí porque estas mutaciones masivas vienen del panel
      // admin (liberar asientos), no de la compra en tiempo real (que usa
      // confirmPurchase, una función SQL atómica e independiente de esto).
      await supabase.from('occupied_seats').delete().neq('showtime_id', '__never__');
      if (rows.length > 0) {
        await supabase.from('occupied_seats').insert(rows);
      }
    }

    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occupiedSeats, isLoaded]);

  const setOccupiedSeats = useCallback(
    (updater: OccupiedMap | ((prev: OccupiedMap) => OccupiedMap)) => {
      setOccupiedSeatsState((prev) => (typeof updater === 'function' ? (updater as (p: OccupiedMap) => OccupiedMap)(prev) : updater));
    },
    []
  );

  /**
   * Confirma una compra de forma segura: revisa y reserva los asientos en una
   * sola transacción atómica en el servidor (Supabase), evitando que dos
   * compradores se queden con el mismo asiento si compran al mismo tiempo.
   *
   * Devuelve { success: true } si todo salió bien, o
   * { success: false, error: 'seat_taken', seatId } si alguien se adelantó.
   */
  const confirmPurchase = useCallback(
    async (showtimeId: string, seatIds: string[], sale: SaleRecord) => {
      const { data, error } = await supabase.rpc('confirm_purchase', {
        p_showtime_id: showtimeId,
        p_seat_ids: seatIds,
        p_sale: sale,
      });

      if (error) {
        console.error('Error confirmando compra:', error.message);
        return { success: false, error: 'network_error' as const };
      }

      if (data?.success) {
        // Refleja el cambio localmente de inmediato (el realtime también lo hará,
        // esto solo evita un parpadeo visual mientras llega el evento)
        skipNextSync.current = true;
        setOccupiedSeatsState((prev) => {
          const current = prev[showtimeId] || {};
          const updated = { ...current };
          seatIds.forEach((id) => {
            updated[id] = 'vendido';
          });
          return { ...prev, [showtimeId]: updated };
        });
      }

      return data as { success: boolean; error?: string; seat_id?: string };
    },
    []
  );

  return { occupiedSeats, setOccupiedSeats, confirmPurchase };
}
