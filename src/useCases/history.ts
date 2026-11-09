import { canDeletePurchase } from '@/domain/lifecycle';
import type { ListSummary } from '@/domain/list';
import {
  deleteCompletedListRow,
  findCompletedPurchaseSummaries,
  findListById,
} from '@/infrastructure/repositories/listsRepository';
import { AppError } from '@/lib/errors';
import { guardError } from '@/useCases/guards';
import { getListDetail, type ListDetail } from '@/useCases/lists';
import type { UseCaseDeps } from '@/useCases/types';

/**
 * Historial completo, de la compra más reciente a la más antigua.
 *
 * No se pagina en el MVP: el documento de arquitectura fija `SectionList` con
 * todas las compras y deja la paginación por claves para v1.1.
 */
export async function getHistory(deps: UseCaseDeps): Promise<ListSummary[]> {
  return deps.database.read(findCompletedPurchaseSummaries);
}

/**
 * Detalle de una compra: la lista y sus artículos.
 *
 * Devuelve la lista en cualquier estado; la pantalla decide la redirección
 * canónica de `draft` y `shopping`. Comparte la consulta con el detalle de
 * lista para no mantener dos lecturas del mismo agregado.
 */
export async function getPurchaseDetail(
  deps: UseCaseDeps,
  listId: string,
): Promise<ListDetail> {
  return getListDetail(deps, listId);
}

/**
 * Elimina una compra del historial.
 *
 * Solo se permite sobre listas `completed`: el borrado de una lista activa
 * tiene su propio camino y sus propias guardas. Los artículos desaparecen por
 * la cascada de la clave foránea.
 */
export async function deletePurchase(
  deps: UseCaseDeps,
  listId: string,
): Promise<void> {
  await deps.database.mutate(async (tx) => {
    const list = await findListById(tx, listId);
    if (!list) {
      throw new AppError('NOT_FOUND', undefined, { listId });
    }

    const failure = canDeletePurchase(list);
    if (failure) {
      throw guardError(failure);
    }

    const changes = await deleteCompletedListRow(tx, listId);
    if (changes !== 1) {
      throw guardError('INVALID_STATE');
    }
  });
}
