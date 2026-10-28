import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { ListsOverview } from '@/useCases/lists';
import { getListsOverview } from '@/useCases/lists';
import { appDeps } from '@/useCases/deps';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';

interface ListsState {
  overview: ListsOverview | null;
  loading: boolean;
  error: string | null;
  reload(): Promise<void>;
}

export function useLists(): ListsState {
  const [overview, setOverview] = useState<ListsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const result = await getListsOverview(appDeps);
      setOverview(result);
      setError(null);
    } catch (loadError) {
      setError(toUserMessage(loadError, es.errors.load));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { overview, loading, error, reload: load };
}
