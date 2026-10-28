import { useCallback, useEffect, useState } from 'react';

import { getDatabase } from '@/infrastructure/database';
import type { DatabaseState } from '@/infrastructure/databaseManager';

export type BootStatus =
  | { status: 'booting' }
  | { status: 'ready'; databaseState: DatabaseState }
  | { status: 'failed'; error: unknown };

/**
 * Ejecuta `boot()` una vez al montar el layout raíz.
 *
 * El splash nativo se mantiene hasta que este hook deja de estar en `booting`.
 * `retry` vuelve a mostrar el estado de arranque antes de reintentar.
 */
export function useDatabaseBoot() {
  const [state, setState] = useState<BootStatus>({ status: 'booting' });

  const runBoot = useCallback(async () => {
    try {
      const database = getDatabase();
      await database.boot();
      setState({ status: 'ready', databaseState: database.getState() });
    } catch (error) {
      setState({ status: 'failed', error });
    }
  }, []);

  const retry = useCallback(() => {
    setState({ status: 'booting' });
    void runBoot();
  }, [runBoot]);

  useEffect(() => {
    // `boot()` es una operación externa asíncrona: el estado solo cambia
    // después del await, no de forma síncrona dentro del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void runBoot();
  }, [runBoot]);

  return {
    state,
    retry,
  };
}
