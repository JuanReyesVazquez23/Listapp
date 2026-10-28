import type { ShoppingItem } from '@/domain/item';
import { canCancelShopping, canStartShopping, canToggleItem } from '@/domain/lifecycle';
import type { ShoppingList } from '@/domain/list';
import { progressFromCounts, type Progress } from '@/domain/progress';
import {
  clearItemChecks,
  countItemProgress,
  countItems,
  findItemWithListStatus,
  setItemCheckedRow,
} from '@/infrastructure/repositories/itemsRepository';
import {
  cancelShoppingRow,
  findActiveShoppingId,
  findListById,
  startShoppingRow,
  touchList,
} from '@/infrastructure/repositories/listsRepository';
import { AppError } from '@/lib/errors';
import { guardError } from '@/useCases/guards';
import type { UseCaseDeps } from '@/useCases/types';

export interface CheckItemResult {
  item: ShoppingItem;
  progress: Progress;
}

/**
 * Inicia la compra de una lista en borrador.
 *
 * La guarda comprueba el estado, que haya artículos y que no exista otra
 * compra activa. El índice único parcial de SQLite es la última red: aunque
 * dos ventanas intentaran empezar a la vez, solo una transacción puede ganar.
 */
export async function startShopping(
  deps: UseCaseDeps,
  listId: string,
): Promise<ShoppingList> {
  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const list = await findListById(tx, listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId });
    }

    const itemCount = await countItems(tx, listId);
    const activeShoppingId = await findActiveShoppingId(tx);
    const failure = canStartShopping(list, itemCount, activeShoppingId !== null);
    if (failure) {
      throw guardError(failure);
    }

    const changes = await startShoppingRow(tx, listId, nowUtc);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    return { ...list, status: 'shopping', updatedAtUtc: nowUtc };
  });
}

/**
 * Cancela la compra y devuelve la lista a borrador.
 *
 * Desmarcar y cambiar el estado ocurren en la misma transacción: nunca queda
 * una lista en borrador con checks antiguos ni una compra activa a medias.
 */
export async function cancelShopping(
  deps: UseCaseDeps,
  listId: string,
): Promise<ShoppingList> {
  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const list = await findListById(tx, listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId });
    }

    const failure = canCancelShopping(list);
    if (failure) {
      throw guardError(failure);
    }

    const changes = await cancelShoppingRow(tx, listId, nowUtc);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    await clearItemChecks(tx, listId, nowUtc);
    return { ...list, status: 'draft', updatedAtUtc: nowUtc };
  });
}

/**
 * Marca o desmarca un artículo durante la compra.
 *
 * `checked` es el estado deseado, no un toggle. La operación devuelve el
 * artículo actualizado y el progreso recalculado en la misma transacción,
 * de modo que la pantalla no necesita releer toda la lista.
 */
export async function setItemChecked(
  deps: UseCaseDeps,
  itemId: string,
  checked: boolean,
): Promise<CheckItemResult> {
  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const found = await findItemWithListStatus(tx, itemId);
    if (!found) {
      throw new AppError('NOT_FOUND', undefined, { itemId });
    }

    const failure = canToggleItem({ status: found.listStatus });
    if (failure) {
      throw guardError(failure);
    }

    const changes = await setItemCheckedRow(tx, itemId, checked, nowUtc);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    await touchList(tx, found.item.listId, nowUtc);

    const counts = await countItemProgress(tx, found.item.listId);
    return {
      item: {
        ...found.item,
        isChecked: checked,
        checkedAtUtc: checked ? nowUtc : null,
        updatedAtUtc: nowUtc,
      },
      progress: progressFromCounts(counts.total, counts.checked),
    };
  });
}
