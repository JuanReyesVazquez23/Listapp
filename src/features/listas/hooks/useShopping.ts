import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { ListDetail } from '@/useCases/lists';
import { getListDetail } from '@/useCases/lists';
import { addItem as addShoppingItem } from '@/useCases/items';
import { cancelShopping, finishPurchase, setItemChecked } from '@/useCases/shopping';
import { appDeps } from '@/useCases/deps';
import { computeProgress, type Progress } from '@/domain/progress';
import type { ShoppingList } from '@/domain/list';
import { isAppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';

export type ShoppingStatus = 'loading' | 'ready' | 'not_found' | 'not_shopping' | 'error';

export type FinishShoppingOutcome =
  | { ok: true; purchase: ShoppingList }
  | { ok: false; message: string };

interface ShoppingState {
  status: ShoppingStatus;
  detail: ListDetail | null;
  progress: Progress;
  error: string | null;
  pendingItemIds: ReadonlySet<string>;
  finishing: boolean;
  toggleItem(itemId: string): Promise<void>;
  addItem(name: string): Promise<void>;
  cancel(): Promise<void>;
  finish(confirmZeroChecked: boolean): Promise<FinishShoppingOutcome>;
  reload(): Promise<void>;
}

const EMPTY_PROGRESS = computeProgress([]);

/**
 * Estado de la pantalla de compra.
 *
 * Relee al recuperar el foco para que un cambio hecho en el detalle se vea al
 * volver. Tras un check solo reemplaza la fila afectada y el progreso; no
 * vuelve a leer la lista entera.
 */
export function useShopping(listId: string | undefined): ShoppingState {
  const [status, setStatus] = useState<ShoppingStatus>('loading');
  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [error, setError] = useState<string | null>(null);
  const [pendingItemIds, setPendingItemIds] = useState<ReadonlySet<string>>(new Set());
  const [finishing, setFinishing] = useState(false);

  const detailRef = useRef<ListDetail | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());
  const finishingRef = useRef(false);

  const applyDetail = useCallback((next: ListDetail) => {
    detailRef.current = next;
    setDetail(next);
    setProgress(computeProgress(next.items));
  }, []);

  const load = useCallback(async () => {
    if (!listId) {
      setStatus('not_found');
      return;
    }

    try {
      const result = await getListDetail(appDeps, listId);
      applyDetail(result);
      setStatus(result.list.status === 'shopping' ? 'ready' : 'not_shopping');
      setError(null);
    } catch (loadError) {
      if (isAppError(loadError) && loadError.code === 'NOT_FOUND') {
        setStatus('not_found');
        return;
      }
      setError(toUserMessage(loadError, es.errors.load));
      setStatus('error');
    }
  }, [applyDetail, listId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const toggleItem = useCallback(
    async (itemId: string) => {
      const currentItem = detailRef.current?.items.find((item) => item.id === itemId);
      // Un check en vuelo bloquea otro sobre la misma fila para no encolar
      // dos escrituras con el mismo estado deseado.
      if (!currentItem || pendingRef.current.has(itemId)) {
        return;
      }

      pendingRef.current.add(itemId);
      setPendingItemIds(new Set(pendingRef.current));

      try {
        const result = await setItemChecked(appDeps, itemId, !currentItem.isChecked);
        const currentDetail = detailRef.current;
        if (!currentDetail) {
          return;
        }

        applyDetail({
          ...currentDetail,
          items: currentDetail.items.map((item) =>
            item.id === result.item.id ? result.item : item,
          ),
        });
        setProgress(result.progress);
      } finally {
        pendingRef.current.delete(itemId);
        setPendingItemIds(new Set(pendingRef.current));
      }
    },
    [applyDetail],
  );

  const addItem = useCallback(
    async (name: string) => {
      const currentDetail = detailRef.current;
      if (!currentDetail) {
        return;
      }

      const item = await addShoppingItem(appDeps, currentDetail.list.id, name);
      const latestDetail = detailRef.current;
      if (!latestDetail) {
        return;
      }
      applyDetail({ ...latestDetail, items: [...latestDetail.items, item] });
    },
    [applyDetail],
  );

  const cancel = useCallback(async () => {
    const currentDetail = detailRef.current;
    if (!currentDetail) {
      return;
    }

    // La pantalla navega fuera después de cancelar; no se cambia el estado
    // local para no competir con la redirección.
    await cancelShopping(appDeps, currentDetail.list.id);
  }, []);

  /**
   * Cierra la compra sin preguntar por el supermercado.
   *
   * Un ref bloquea el doble toque antes de que React repinte el botón
   * deshabilitado; la transacción sigue siendo idempotente por sí misma.
   */
  const finish = useCallback(
    async (confirmZeroChecked: boolean): Promise<FinishShoppingOutcome> => {
      const currentDetail = detailRef.current;
      if (!currentDetail || finishingRef.current) {
        return { ok: false, message: es.errors.generic };
      }

      finishingRef.current = true;
      setFinishing(true);
      try {
        const purchase = await finishPurchase(appDeps, {
          listId: currentDetail.list.id,
          confirmZeroChecked,
        });
        return { ok: true, purchase };
      } catch (finishError) {
        return { ok: false, message: toUserMessage(finishError) };
      } finally {
        finishingRef.current = false;
        setFinishing(false);
      }
    },
    [],
  );

  return {
    status,
    detail,
    progress,
    error,
    pendingItemIds,
    finishing,
    toggleItem,
    addItem,
    cancel,
    finish,
    reload: load,
  };
}
