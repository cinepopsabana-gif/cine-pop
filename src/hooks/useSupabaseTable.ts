import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

/**
 * Hook genérico para "tablas de catálogo": listas completas (películas, snacks,
 * promos) que el panel admin reemplaza libremente con setX(newArray).
 *
 * Se comporta como useState (misma forma [value, setValue]) pero:
 *  - Carga el valor inicial desde Supabase.
 *  - Cada vez que cambie localmente, sincroniza la tabla completa en Supabase
 *    (borra lo que ya no está, inserta lo nuevo, actualiza lo existente).
 *  - Escucha cambios en tiempo real de otros navegadores/pestañas y actualiza
 *    el estado local automáticamente.
 *
 * toRow: convierte un objeto del dominio (camelCase) a una fila de la tabla (snake_case)
 * fromRow: convierte una fila de la tabla a un objeto del dominio
 */
export function useSupabaseTable<T extends { id: string }>(
  tableName: string,
  toRow: (item: T) => Record<string, any>,
  fromRow: (row: any) => T,
  fallback: T[]
) {
  const [items, setItemsState] = useState<T[]>(fallback);
  const [isLoaded, setIsLoaded] = useState(false);
  const skipNextSync = useRef(false);
  const lastKnownIds = useRef<Set<string>>(new Set());

  // Carga inicial + suscripción en tiempo real
  useEffect(() => {
    let isMounted = true;

    async function load() {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.error(`Error cargando ${tableName} desde Supabase:`, error.message);
        setIsLoaded(true);
        return;
      }
      if (!isMounted) return;

      if (data && data.length > 0) {
        const mapped = data.map(fromRow);
        lastKnownIds.current = new Set(mapped.map((m) => m.id));
        skipNextSync.current = true;
        setItemsState(mapped);
      } else {
        // Tabla vacía: usamos el fallback y lo sembramos en Supabase
        lastKnownIds.current = new Set(fallback.map((f) => f.id));
        if (fallback.length > 0) {
          await supabase.from(tableName).insert(fallback.map(toRow));
        }
      }
      setIsLoaded(true);
    }

    load();

    const channel = supabase
      .channel(`public:${tableName}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          // Otro cliente cambió la tabla: recargamos todo para mantenernos sincronizados
          load();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableName]);

  // Sincroniza hacia Supabase cuando el estado local cambia por una acción del usuario
  useEffect(() => {
    if (!isLoaded) return;
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }

    async function sync() {
      const currentIds = new Set(items.map((i) => i.id));
      const idsToDelete = [...lastKnownIds.current].filter((id) => !currentIds.has(id));

      if (idsToDelete.length > 0) {
        await supabase.from(tableName).delete().in('id', idsToDelete);
      }
      if (items.length > 0) {
        await supabase.from(tableName).upsert(items.map(toRow));
      }
      lastKnownIds.current = currentIds;
    }

    sync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, isLoaded, tableName]);

  const setItems = useCallback(
    (updater: T[] | ((prev: T[]) => T[])) => {
      setItemsState((prev) => (typeof updater === 'function' ? (updater as (p: T[]) => T[])(prev) : updater));
    },
    []
  );

  return [items, setItems] as const;
}
