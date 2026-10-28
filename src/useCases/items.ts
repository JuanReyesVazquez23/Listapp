import type { ShoppingItem } from '@/domain/item';
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
} from '@/data/repositories/itemsRepository';
import { findListById, touchList } from '@/data/repositories/listsRepository';
import { AppError } from '@/lib/errors';
import { guardError, itemNameError } from '@/useCases/guards';
import type { UseCaseDeps } from '@/useCases/types';

export async function addItem(
  deps: UseCaseDeps,
  listId: string,
  name: string,
): Promise<ShoppingItem> {
  const validation = validateItemName(name);
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
    });
    await touchList(tx, item.listId, nowUtc);
    return restored;
  });
}
