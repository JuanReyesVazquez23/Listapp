import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { CatalogProduct } from '@/domain/catalog';
import type { ItemDetailInput } from '@/domain/item';
import { canSaveItemDetail } from '@/domain/lifecycle';
import { isAppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { searchCatalog } from '@/useCases/catalog';
import { appDeps } from '@/useCases/deps';
import {
  getItemForDetail,
  type ItemDetailContext,
} from '@/useCases/items';
import {
  checkItem,
  setItemChecked,
  updateItemDetail,
} from '@/useCases/shopping';

export type ItemDetailStatus =
  | 'loading'
  | 'ready'
  | 'not_found'
  | 'not_editable'
  | 'error';

export type CatalogFailureReason =
  | 'offline'
  | 'timeout'
  | 'unavailable'
  | 'invalid_response'
  | 'invalid_query';

export type CatalogState =
  | { status: 'idle' }
  | { status: 'searching'; query: string }
  | { status: 'ready'; query: string; products: CatalogProduct[] }
  | { status: 'error'; query: string; reason: CatalogFailureReason };

export interface ItemDetailState {
  status: ItemDetailStatus;
  context: ItemDetailContext | null;
  error: string | null;
  catalog: CatalogState;
  isSaving: boolean;
  saveError: string | null;
  search(query: string): Promise<void>;
  save(detail: ItemDetailInput): Promise<boolean>;
  skip(): Promise<boolean>;
  removeData(): Promise<boolean>;
  removeFromPurchase(): Promise<boolean>;
  clearSaveError(): void;
  reload(): Promise<void>;
}

/**
 * Estado del modal de detalle de una línea de catálogo.
 *
 * La búsqueda se lanza sola una vez, al cargar el artículo, con su nombre; el
 * campo de búsqueda solo sirve para corregir la consulta. Cada búsqueda
 * cancela la anterior y un fallo de red nunca bloquea el formulario manual.
 */
export function useItemDetail(itemId: string | undefined): ItemDetailState {
  const [status, setStatus] = useState<ItemDetailStatus>('loading');
  const [context, setContext] = useState<ItemDetailContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogState>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const autoSearchedItemRef = useRef<string | null>(null);
  const savingRef = useRef(false);

  const runSearch = useCallback(async (rawQuery: string) => {
    const query = rawQuery.trim();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setCatalog({ status: 'searching', query });

    const outcome = await searchCatalog(appDeps, query, {
      signal: controller.signal,
    });

    // Una búsqueda sustituida por otra no puede pisar el estado más reciente.
    if (controller.signal.aborted) {
      return;
    }

    if (outcome.ok) {
      setCatalog({ status: 'ready', query, products: outcome.products });
      return;
    }
    if (outcome.reason === 'cancelled') {
      return;
    }
    setCatalog({ status: 'error', query, reason: outcome.reason });
  }, []);

  const load = useCallback(async () => {
    if (!itemId) {
      setStatus('not_found');
      return;
    }

    try {
      const result = await getItemForDetail(appDeps, itemId);
      setContext(result);
      setError(null);

      const guard = canSaveItemDetail(result.list);
      if (guard !== null) {
        setStatus('not_editable');
        return;
      }
      setStatus('ready');

      // La búsqueda automática ocurre una sola vez por artículo: al enfocar de
      // nuevo el modal tras un fallo no se repite ni se pisa lo que el usuario
      // haya escrito. Si la línea ya tiene detalle, no hace falta buscar.
      if (
        result.item.detail === null &&
        autoSearchedItemRef.current !== itemId
      ) {
        autoSearchedItemRef.current = itemId;
        void runSearch(result.item.name);
      }
    } catch (loadError) {
      if (isAppError(loadError) && loadError.code === 'NOT_FOUND') {
        setStatus('not_found');
        return;
      }
      setError(toUserMessage(loadError, es.errors.load));
      setStatus('error');
    }
  }, [itemId, runSearch]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const runMutation = useCallback(
    async (operation: () => Promise<unknown>): Promise<boolean> => {
      if (savingRef.current) {
        return false;
      }
      savingRef.current = true;
      setIsSaving(true);
      setSaveError(null);
      try {
        await operation();
        return true;
      } catch (mutationError) {
        setSaveError(toUserMessage(mutationError));
        return false;
      } finally {
        savingRef.current = false;
        setIsSaving(false);
      }
    },
    [],
  );

  const save = useCallback(
    (detail: ItemDetailInput): Promise<boolean> => {
      if (!itemId || !context) {
        return Promise.resolve(false);
      }
      return runMutation(() =>
        context.item.isChecked
          ? updateItemDetail(appDeps, itemId, detail)
          : checkItem(appDeps, itemId, detail),
      );
    },
    [context, itemId, runMutation],
  );

  const skip = useCallback((): Promise<boolean> => {
    if (!itemId) {
      return Promise.resolve(false);
    }
    return runMutation(() => checkItem(appDeps, itemId, null));
  }, [itemId, runMutation]);

  const removeData = useCallback((): Promise<boolean> => {
    if (!itemId) {
      return Promise.resolve(false);
    }
    return runMutation(() => updateItemDetail(appDeps, itemId, null));
  }, [itemId, runMutation]);

  const removeFromPurchase = useCallback((): Promise<boolean> => {
    if (!itemId) {
      return Promise.resolve(false);
    }
    return runMutation(() => setItemChecked(appDeps, itemId, false));
  }, [itemId, runMutation]);

  const clearSaveError = useCallback(() => setSaveError(null), []);

  return {
    status,
    context,
    error,
    catalog,
    isSaving,
    saveError,
    search: runSearch,
    save,
    skip,
    removeData,
    removeFromPurchase,
    clearSaveError,
    reload: load,
  };
}
