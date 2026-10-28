import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { isAppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { appDeps } from '@/useCases/deps';
import { getListDetail, type ListDetail } from '@/useCases/lists';

export type ListDetailStatus = 'loading' | 'ready' | 'not_found' | 'error';

interface ListDetailState {
  status: ListDetailStatus;
  detail: ListDetail | null;
  error: string | null;
  reload(): Promise<void>;
}

export function useListDetail(listId: string | undefined): ListDetailState {
  const [status, setStatus] = useState<ListDetailStatus>('loading');
  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!listId) {
      setStatus('not_found');
      return;
    }

    try {
      const result = await getListDetail(appDeps, listId);
      setDetail(result);
      setStatus('ready');
      setError(null);
    } catch (loadError) {
      if (isAppError(loadError) && loadError.code === 'NOT_FOUND') {
        setStatus('not_found');
        return;
      }
      setError(toUserMessage(loadError, es.errors.load));
      setStatus('error');
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return { status, detail, error, reload: load };
}
