import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { isAppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { appDeps } from '@/useCases/deps';
import { deletePurchase, getPurchaseDetail } from '@/useCases/history';
import type { ListDetail } from '@/useCases/lists';

/**
 * Estados de la ruta de detalle histórico. `draft` y `shopping` no se pintan:
 * la pantalla redirige al destino canónico de cada estado.
 */
export type PurchaseDetailStatus =
  | 'loading'
  | 'ready'
  | 'draft'
  | 'shopping'
  | 'not_found'
  | 'error';

export interface PurchaseDetailState {
  status: PurchaseDetailStatus;
  detail: ListDetail | null;
  error: string | null;
  isDeleting: boolean;
  deleteError: string | null;
  remove(): Promise<boolean>;
  clearDeleteError(): void;
  reload(): Promise<void>;
}

/**
 * Detalle de una compra histórica y su eliminación.
 *
 * La lectura devuelve la lista en cualquier estado; la guarda de ruta vive en
 * la pantalla. El borrado es idempotente desde la UI: mientras hay una
 * escritura en vuelo, otro toque no encola una segunda.
 */
export function usePurchaseDetail(listId: string | undefined): PurchaseDetailState {
  const [status, setStatus] = useState<PurchaseDetailStatus>('loading');
  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deletingRef = useRef(false);

  const load = useCallback(async () => {
    if (!listId) {
      setStatus('not_found');
      return;
    }

    try {
      const result = await getPurchaseDetail(appDeps, listId);
      setDetail(result);
      setError(null);
      if (result.list.status === 'completed') {
        setStatus('ready');
      } else {
        setStatus(result.list.status === 'shopping' ? 'shopping' : 'draft');
      }
    } catch (loadError) {
      if (isAppError(loadError) && loadError.code === 'NOT_FOUND') {
        setStatus('not_found');
        return;
      }
      setError(toUserMessage(loadError, es.errors.purchaseLoad));
      setStatus('error');
    }
  }, [listId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!listId || deletingRef.current) {
      return false;
    }

    deletingRef.current = true;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deletePurchase(appDeps, listId);
      return true;
    } catch (deleteFailure) {
      setDeleteError(toUserMessage(deleteFailure));
      return false;
    } finally {
      deletingRef.current = false;
      setIsDeleting(false);
    }
  }, [listId]);

  const clearDeleteError = useCallback(() => setDeleteError(null), []);

  return {
    status,
    detail,
    error,
    isDeleting,
    deleteError,
    remove,
    clearDeleteError,
    reload: load,
  };
}
