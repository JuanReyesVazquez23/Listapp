import { canDeleteList, canRenameList } from '@/domain/lifecycle';
import type { ListSummary, ShoppingList } from '@/domain/list';
import { validateListName } from '@/domain/validation';
import type { ShoppingItem } from '@/domain/item';
import {
  deleteListRow,
  findListById,
  findListSummaries,
  insertList,
  renameListRow,
} from '@/data/repositories/listsRepository';
import { findItemsByList } from '@/data/repositories/itemsRepository';
import { AppError } from '@/lib/errors';
import { guardError, listNameError } from '@/useCases/guards';
import type { UseCaseDeps } from '@/useCases/types';

export interface ListsOverview {
  shopping: ListSummary | null;
  drafts: ListSummary[];
}

export interface ListDetail {
  list: ShoppingList;
  items: ShoppingItem[];
}

export async function createList(
  deps: UseCaseDeps,
  input: { name: string },
): Promise<ShoppingList> {
  const validation = validateListName(input.name);
  if (!validation.ok) {
    throw listNameError(validation.reason);
  }

  const now = deps.clock.now();
  const list: ShoppingList = {
    id: deps.createId(),
    name: validation.value,
    status: 'draft',
    createdAtUtc: now.getTime(),
    updatedAtUtc: now.getTime(),
    completedAtUtc: null,
    completedLocalDate: null,
    completedLocalTime: null,
    supermarketName: null,
  };

  await deps.database.mutate((tx) =>
    insertList(tx, { id: list.id, name: list.name, nowUtc: now.getTime() }),
  );

  return list;
}

export async function getListsOverview(deps: UseCaseDeps): Promise<ListsOverview> {
  const summaries = await deps.database.read(findListSummaries);
  return {
    shopping: summaries.find((list) => list.status === 'shopping') ?? null,
    drafts: summaries.filter((list) => list.status === 'draft'),
  };
}

export async function getListDetail(
  deps: UseCaseDeps,
  listId: string,
): Promise<ListDetail> {
  const detail = await deps.database.read(async (reader) => {
    const list = await findListById(reader, listId);
    if (!list) {
      return null;
    }
    const items = await findItemsByList(reader, listId);
    return { list, items };
  });

  if (!detail) {
    throw new AppError('NOT_FOUND', undefined, { listId });
  }
  return detail;
}

export async function renameList(
  deps: UseCaseDeps,
  listId: string,
  name: string,
): Promise<ShoppingList> {
  const validation = validateListName(name);
  if (!validation.ok) {
    throw listNameError(validation.reason);
  }

  const nowUtc = deps.clock.now().getTime();

  return deps.database.mutate(async (tx) => {
    const list = await findListById(tx, listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId });
    }

    const failure = canRenameList(list);
    if (failure) {
      throw guardError(failure);
    }

    const changes = await renameListRow(tx, listId, validation.value, nowUtc);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }

    return { ...list, name: validation.value, updatedAtUtc: nowUtc };
  });
}

export async function deleteList(deps: UseCaseDeps, listId: string): Promise<void> {
  await deps.database.mutate(async (tx) => {
    const list = await findListById(tx, listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId });
    }

    const failure = canDeleteList(list);
    if (failure) {
      throw guardError(failure);
    }

    const changes = await deleteListRow(tx, listId);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }
  });
}
