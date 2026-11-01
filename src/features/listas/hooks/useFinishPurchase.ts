import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { ShoppingList } from '@/domain/list';
import { isAppError } from '@/lib/errors';
import { toUserMessage } from '@/lib/errorMessages';
import { es } from '@/strings/es';
import { appDeps } from '@/useCases/deps';
import { getSupermarketSuggestions } from '@/useCases/history';
import { getListDetail, type ListDetail } from '@/useCases/lists';
import { finishPurchase } from '@/useCases/shopping';

export type FinishPurchaseStatus =
  | 'loading'
  | 'ready'
  | 'not_found'
  | 'not_shopping'
  | 'error';

export type FinishPurchaseOutcome =
  | { ok: true; purchase: ShoppingList }
  | { ok: false; message: string };

interface FinishPurchaseState {
  status: FinishPurchaseStatus;
  detail: ListDetail | null;
  suggestions: string[];
  supermarketName: string;
  error: string | null;
  finishing: boolean;
  changeSupermarketName(value: string): void;
  submit(confirmZeroChecked: boolean): Promise<FinishPurchaseOutcome>;
  reload(): Promise<void>;
}

/**
 * Estado del modal de cierre de compra.
 *
 * La escritura no se hace hasta que el usuario confirma. El hook mantiene el
 * formulario y el resultado; la navegación y las confirmaciones viven en la
 * pantalla, que es quien conoce el contexto de la ruta.
 */
export function useFinishPurchase(listId: string | undefined): FinishPurchaseState {
  const [status, setStatus] = useState<FinishPurchaseStatus>('loading');
  const [detail, setDetail] = useState<ListDetail | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [supermarketName, setSupermarketName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);

  // Un ref evita que dos toques rápidos abran dos transacciones antes de que
  // React vuelva a renderizar el botón deshabilitado.
  const finishingRef = useRef(false);

  const load = useCallback(async () => {
    if (!listId) {
      setStatus('not_found');
      return;
    }

    try {
      const result = await getListDetail(appDeps, listId);
      setDetail(result);
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
  }, [listId]);

  const loadSuggestions = useCallback(async () => {
    try {
      setSuggestions(await getSupermarketSuggestions(appDeps));
    } catch (suggestionsError) {
      // Las sugerencias son una ayuda, no un requisito: el campo sigue siendo
      // utilizable y el cierre no se bloquea. El fallo se registra para no
      // perder el diagnóstico si la ayuda aparece siempre vacía.
      console.warn('[Listapp] No se pudieron cargar las sugerencias', suggestionsError);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      void loadSuggestions();
    }, [load, loadSuggestions]),
  );

  const changeSupermarketName = useCallback((value: string) => {
    setSupermarketName(value);
    setError(null);
  }, []);

  const submit = useCallback(
    async (confirmZeroChecked: boolean): Promise<FinishPurchaseOutcome> => {
      if (!listId || finishingRef.current) {
        return { ok: false, message: es.errors.generic };
      }

      finishingRef.current = true;
      setFinishing(true);
      setError(null);

      try {
        const purchase = await finishPurchase(appDeps, {
          listId,
          supermarketName,
          confirmZeroChecked,
        });
        return { ok: true, purchase };
      } catch (submitError) {
        const message = toUserMessage(submitError);
        setError(message);
        return { ok: false, message };
      } finally {
        finishingRef.current = false;
        setFinishing(false);
      }
    },
    [listId, supermarketName],
  );

  return {
    status,
    detail,
    suggestions,
    supermarketName,
    error,
    finishing,
    changeSupermarketName,
    submit,
    reload: load,
  };
}
