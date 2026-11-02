import type { ShoppingItem } from '@/domain/item';
import type { ShoppingList } from '@/domain/list';
import {
  canAddItem,
  canDeleteItem,
  canRenameItem,
  canRestoreItem,
} from '@/domain/lifecycle';
import { validateItemName } from '@/domain/validation';
import {
  countItems,
  deleteItemRow,
  findItemById,
  findItemWithListStatus,
  insertItem,
  renameItemRow,
} from '@/infrastructure/repositories/itemsRepository';
import { findListById, touchList } from '@/infrastructure/repositories/listsRepository';
import { AppError } from '@/lib/errors';
import { guardError, itemNameError } from '@/useCases/guards';
import type { UseCaseDeps } from '@/useCases/types';

export async function addItem(
  deps: UseCaseDeps,
  listId: string,
  name: string,
): Promise<ShoppingItem> {  const validation = validateItemName(name);
  if (!validation.ok) {
    throw itemNameError(validation.reason);
  }

  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const list = await findListById(tx, listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId });
    }

    const failure = canAddItem(list);
    if (failure) {
      throw guardError(failure);
    }

    const item = await insertItem(tx, {
      id: deps.createId(),
      listId,
      name: validation.value,
      nowUtc,
    });
    await touchList(tx, listId, nowUtc);
    return item;
  });
}

export async function renameItem(
  deps: UseCaseDeps,
  itemId: string,
  name: string,
): Promise<ShoppingItem> {
  const validation = validateItemName(name);
  if (!validation.ok) {
    throw itemNameError(validation.reason);
  }

  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const found = await findItemWithListStatus(tx, itemId);
    if (!found) {
      throw new AppError('NOT_FOUND', undefined, { itemId });
    }

    const failure = canRenameItem({ status: found.listStatus });
    if (failure) {
      throw guardError(failure);
    }

    const changes = await renameItemRow(tx, itemId, validation.value, nowUtc);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    await touchList(tx, found.item.listId, nowUtc);
    return { ...found.item, name: validation.value, updatedAtUtc: nowUtc };
  });
}

export async function deleteItem(
  deps: UseCaseDeps,
  itemId: string,
): Promise<ShoppingItem> {
  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const found = await findItemWithListStatus(tx, itemId);
    if (!found) {
      throw new AppError('NOT_FOUND', undefined, { itemId });
    }

    const total = await countItems(tx, found.item.listId);
    const failure = canDeleteItem({ status: found.listStatus }, total);
    if (failure) {
      throw guardError(failure);
    }

    const changes = await deleteItemRow(tx, itemId);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    await touchList(tx, found.item.listId, nowUtc);
    return found.item;
  });
}

export async function restoreItem(
  deps: UseCaseDeps,
  item: ShoppingItem,
): Promise<ShoppingItem> {
  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const list = await findListById(tx, item.listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId: item.listId });
    }

    const failure = canRestoreItem(list);
    if (failure) {
      throw guardError(failure);
    }

    const existing = await findItemById(tx, item.id);
    if (existing) {
      throw guardError('INVALID_STATE');
    }

    const checked = list.status === 'shopping' && item.isChecked;
    const restored = await insertItem(tx, {
      id: item.id,
      listId: item.listId,
      name: item.name,
      nowUtc,
      isChecked: checked,
      checkedAtUtc: checked ? item.checkedAtUtc : null,
      preferredSortOrder: item.sortOrder,
      // Deshacer un borrado conserva precio y cantidad: la fila vuelve con el
      // mismo detalle que tenía y el total no cambia.
      detail: checked ? item.detail : null,
    });
    await touchList(tx, item.listId, nowUtc);
    return restored;
  });
}

export interface ItemDetailContext {
  item: ShoppingItem;
  list: ShoppingList;
}

/**
 * Lee el artículo y su lista para el modal de detalle.
 *
 * El modal necesita el modo de compra y el estado de la lista para decidir si
 * puede editar; devolverlos juntos evita una segunda consulta desde la UI y
 * mantiene la guarda y los datos en la misma lectura.
 */
export async function getItemForDetail(
  deps: UseCaseDeps,
  itemId: string,
): Promise<ItemDetailContext> {
  const context = await deps.database.read(async (reader) => {
    const found = await findItemWithListStatus(reader, itemId);
    if (!found) {
      return null;
    }
    const list = await findListById(reader, found.item.listId);
    if (!list) {
      return null;
    }
    return { item: found.item, list };
  });

  if (!context) {
    throw new AppError('NOT_FOUND', undefined, { itemId });
  }
  return context;
}
