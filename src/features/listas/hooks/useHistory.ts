import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { ListSummary } from '@/domain/list';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { appDeps } from '@/useCases/deps';
import { getHistory } from '@/useCases/history';

export type HistoryStatus = 'loading' | 'ready' | 'error';

interface HistoryState {
  status: HistoryStatus;
  entries: ListSummary[];
  error: string | null;
  reload(): Promise<void>;
}

/**
 * Estado de la pestaña Historial.
 *
 * Relee al recuperar el foco: una compra recién finalizada o eliminada debe
 * verse al volver, sin suscripciones ni store global.
 */
export function useHistory(): HistoryState {
  const [status, setStatus] = useState<HistoryStatus>('loading');
  const [entries, setEntries] = useState<ListSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getHistory(appDeps);
      setEntries(result);
      setError(null);
      setStatus('ready');
    } catch (loadError) {
      setError(toUserMessage(loadError, es.errors.historyLoad));
      setStatus('error');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { status, entries, error, reload: load };
}
