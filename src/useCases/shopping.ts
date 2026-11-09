import { toLocalDateString, toLocalTimeString } from '@/domain/dates';
import {
  itemDetailFromInput,
  type ItemDetail,
  type ItemDetailInput,
  type ShoppingItem,
} from '@/domain/item';
import {
  canCancelShopping,
  canFinishPurchase,
  canSaveItemDetail,
  canStartShopping,
  canToggleItem,
} from '@/domain/lifecycle';
import { isShoppingMode, type ShoppingList, type ShoppingMode } from '@/domain/list';
import { progressFromCounts, type Progress } from '@/domain/progress';
import {
  checkItemRow,
  clearItemChecks,
  countItemProgress,
  countItems,
  findItemById,
  findItemWithListStatus,
  findPricedTotals,
  setItemCheckedRow,
  updateItemDetailRow,
} from '@/infrastructure/repositories/itemsRepository';
import {
  cancelShoppingRow,
  findActiveShoppingId,
  findListById,
  finishShoppingRow,
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

export interface FinishPurchaseInput {
  listId: string;
  confirmZeroChecked: boolean;
}

/**
 * Inicia la compra de una lista en borrador.
 *
 * La guarda comprueba el estado, que haya artículos y que no exista otra
 * compra activa. El índice único parcial de SQLite respalda esa comprobación:
 * la cola serial y `BEGIN IMMEDIATE` impiden que dos escrituras se solapen, y
 * el índice mantiene la garantía estructural de una sola compra activa.
 */
export async function startShopping(
  deps: UseCaseDeps,
  listId: string,
  mode: ShoppingMode,
): Promise<ShoppingList> {
  if (!isShoppingMode(mode)) {
    throw new AppError('INVALID_STATE', 'El modo de compra no es válido.');
  }

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

    const changes = await startShoppingRow(tx, listId, mode, nowUtc);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    return {
      ...list,
      status: 'shopping',
      updatedAtUtc: nowUtc,
      shoppingMode: mode,
    };
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
    return {
      ...list,
      status: 'draft',
      updatedAtUtc: nowUtc,
      shoppingMode: null,
      totalCents: null,
    };
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
        // Al desmarcar, la sentencia borra el detalle; el objeto devuelto lo
        // refleja para que la fila no muestre un precio que ya no existe.
        detail: checked ? found.item.detail : null,
      },
      progress: progressFromCounts(counts.total, counts.checked),
    };
  });
}

/**
 * Marca un artículo con su detalle (o sin él, si el usuario omite) en una
 * compra de catálogo.
 *
 * La escritura y la comprobación de modo ocurren en la misma transacción. Si
 * el `UPDATE` condicionado no afecta a ninguna fila, se relee para distinguir
 * un doble toque idempotente de un estado inválido.
 */
export async function checkItem(
  deps: UseCaseDeps,
  itemId: string,
  detailInput: ItemDetailInput | null,
): Promise<CheckItemResult> {
  const nowUtc = deps.clock.now().getTime();
  const detail = detailInput ? itemDetailFromInput(detailInput) : null;

  return deps.database.mutate(async (tx) => {
    const found = await findItemWithListStatus(tx, itemId);
    if (!found) {
      throw new AppError('NOT_FOUND', undefined, { itemId });
    }

    const failure = canSaveItemDetail({
      status: found.listStatus,
      shoppingMode: found.shoppingMode,
    });
    if (failure) {
      throw guardError(failure);
    }

    const changes = await checkItemRow(tx, itemId, detail, nowUtc);
    if (changes !== 1) {
      const current = await findItemById(tx, itemId);
      if (!current) {
        throw new AppError('NOT_FOUND', undefined, { itemId });
      }
      if (current.isChecked && sameDetail(current.detail, detail)) {
        const counts = await countItemProgress(tx, current.listId);
        return {
          item: current,
          progress: progressFromCounts(counts.total, counts.checked),
        };
      }
      throw guardError('INVALID_STATE');
    }

    await touchList(tx, found.item.listId, nowUtc);
    const counts = await countItemProgress(tx, found.item.listId);
    return {
      item: {
        ...found.item,
        isChecked: true,
        checkedAtUtc: nowUtc,
        updatedAtUtc: nowUtc,
        detail,
      },
      progress: progressFromCounts(counts.total, counts.checked),
    };
  });
}

/**
 * Cambia el detalle de una línea ya marcada. `detail = null` quita los datos
 * sin desmarcar; el artículo sigue comprado y el total pasa a parcial.
 */
export async function updateItemDetail(
  deps: UseCaseDeps,
  itemId: string,
  detailInput: ItemDetailInput | null,
): Promise<CheckItemResult> {
  const nowUtc = deps.clock.now().getTime();
  const detail = detailInput ? itemDetailFromInput(detailInput) : null;

  return deps.database.mutate(async (tx) => {
    const found = await findItemWithListStatus(tx, itemId);
    if (!found) {
      throw new AppError('NOT_FOUND', undefined, { itemId });
    }

    const failure = canSaveItemDetail({
      status: found.listStatus,
      shoppingMode: found.shoppingMode,
    });
    if (failure) {
      throw guardError(failure);
    }

    const changes = await updateItemDetailRow(tx, itemId, detail, nowUtc);
    if (changes !== 1) {
      const current = await findItemById(tx, itemId);
      if (!current) {
        throw new AppError('NOT_FOUND', undefined, { itemId });
      }
      if (current.isChecked && sameDetail(current.detail, detail)) {
        const counts = await countItemProgress(tx, current.listId);
        return {
          item: current,
          progress: progressFromCounts(counts.total, counts.checked),
        };
      }
      throw guardError('INVALID_STATE');
    }

    await touchList(tx, found.item.listId, nowUtc);
    const counts = await countItemProgress(tx, found.item.listId);
    return {
      item: {
        ...found.item,
        updatedAtUtc: nowUtc,
        detail,
      },
      progress: progressFromCounts(counts.total, counts.checked),
    };
  });
}

function sameDetail(a: ItemDetail | null, b: ItemDetail | null): boolean {
  if (a === null || b === null) {
    return a === b;
  }
  return (
    a.brand === b.brand &&
    a.quantityMilli === b.quantityMilli &&
    a.unit === b.unit &&
    a.unitPriceCents === b.unitPriceCents &&
    a.lineSubtotalCents === b.lineSubtotalCents &&
    a.catalogProductId === b.catalogProductId
  );
}

/**
 * Finaliza la compra y la convierte en el registro histórico.
 *
 * Todo ocurre dentro de una transacción: si algo falla después de escribir,
 * el rollback deja la lista en `shopping` y no queda una compra a medias.
 */
export async function finishPurchase(
  deps: UseCaseDeps,
  input: FinishPurchaseInput,
): Promise<ShoppingList> {
  return deps.database.mutate(async (tx) => {
    const list = await findListById(tx, input.listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId: input.listId });
    }

    // Doble toque: la compra ya está cerrada. Se devuelve tal cual sin
    // escribir, para que repetir la acción no duplique ni muestre error.
    if (list.status === 'completed') {
      return list;
    }

    const counts = await countItemProgress(tx, input.listId);
    const failure = canFinishPurchase(
      list,
      counts.total,
      counts.checked,
      input.confirmZeroChecked,
    );
    if (failure) {
      throw guardError(failure);
    }

    const now = deps.clock.now();
    const nowUtc = now.getTime();
    const localDate = toLocalDateString(now);
    const localTime = toLocalTimeString(now);

    // El total se suma dentro de la misma transacción que el cierre. Una
    // compra sin ninguna línea con precio guarda NULL, no un cero falso.
    const priced = await findPricedTotals(tx, input.listId);
    const totalCents = priced.priced > 0 ? priced.totalCents : null;

    const changes = await finishShoppingRow(tx, {
      id: input.listId,
      nowUtc,
      localDate,
      localTime,
      supermarketName: null,
      totalCents,
    });

    if (changes !== 1) {
      // Defensa del contrato: el `UPDATE` va condicionado a `shopping` y debe
      // afectar exactamente a una fila. Si no lo hace, se relee dentro de la
      // misma transacción para devolver la compra ya cerrada (idempotencia)
      // o el error de estado correspondiente.
      const current = await findListById(tx, input.listId);
      if (!current) {
        throw new AppError('NOT_FOUND', undefined, { listId: input.listId });
      }
      if (current.status === 'completed') {
        return current;
      }
      throw guardError('INVALID_STATE');
    }

    return {
      ...list,
      status: 'completed',
      updatedAtUtc: nowUtc,
      completedAtUtc: nowUtc,
      completedLocalDate: localDate,
      completedLocalTime: localTime,
      supermarketName: null,
      totalCents,
    };
  });
}
