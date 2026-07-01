import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Showtime } from '../types';

type ShowtimesMap = Record<string, Showtime[]>;

function rowToShowtime(row: any): Showtime {
  return {
    id: row.id,
    time: row.time,
    cinema: row.cinema,
    date: row.date,
    priceStandard: Number(row.price_standard),
    priceVip: Number(row.price_vip),
  };
}

function showtimeToRow(movieId: string, s: Showtime) {
  return {
    id: s.id,
    movie_id: movieId,
    time: s.time,
    cinema: s.cinema,
    date: s.date,
    price_standard: s.priceStandard,
    price_vip: s.priceVip,
  };
}

function mapToFlatRows(map: ShowtimesMap) {
  const rows: ReturnType<typeof showtimeToRow>[] = [];
  Object.entries(map).forEach(([movieId, list]) => {
    list.forEach((s) => rows.push(showtimeToRow(movieId, s)));
  });
  return rows;
}

export function useSupabaseShowtimes(fallback: ShowtimesMap) {
  const [showtimes, setShowtimesState] = useState<ShowtimesMap>(fallback);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipNextSync = useRef(false);
  const lastKnownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase.from('showtimes').select('*');
      if (error) {
        console.error('Error cargando showtimes desde Supabase:', error.message);
        setIsLoaded(true);
        return;
      }
      if (!isMounted) return;

      if (data && data.length > 0) {
        const map: ShowtimesMap = {};
        data.forEach((row: any) => {
          if (!map[row.movie_id]) map[row.movie_id] = [];
          map[row.movie_id].push(rowToShowtime(row));
        });
        lastKnownIds.current = new Set(data.map((r: any) => r.id));
        skipNextSync.current = true;
        setShowtimesState(map);
      } else {
        const fallbackRows = mapToFlatRows(fallback);
        lastKnownIds.current = new Set(fallbackRows.map((r) => r.id));
        if (fallbackRows.length > 0) {
          await supabase.from('showtimes').insert(fallbackRows);
        }
      }
      setIsLoaded(true);
    }

    load();

    const channel = supabase
      .channel('public:showtimes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'showtimes' }, () => {
        load();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    async function sync() {
      const flatRows = mapToFlatRows(showtimes);
      const currentIds = new Set(flatRows.map((r) => r.id));
      const idsToDelete = [...lastKnownIds.current].filter((id) => !currentIds.has(id));

      if (idsToDelete.length > 0) {
        await supabase.from('showtimes').delete().in('id', idsToDelete);
      }
      if (flatRows.length > 0) {
        await supabase.from('showtimes').upsert(flatRows);
      }
      lastKnownIds.current = currentIds;
    }

    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showtimes, isLoaded]);

  const setShowtimes = useCallback(
    (updater: ShowtimesMap | ((prev: ShowtimesMap) => ShowtimesMap)) => {
      setShowtimesState((prev) => (typeof updater === 'function' ? (updater as (p: ShowtimesMap) => ShowtimesMap)(prev) : updater));
    },
    []
  );

  return [showtimes, setShowtimes] as const;
}
