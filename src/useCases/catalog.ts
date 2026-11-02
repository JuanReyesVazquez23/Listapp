import {
  buildCatalogQuery,
  type CatalogSearchOutcome,
} from '@/domain/catalog';
import type { UseCaseDeps } from '@/useCases/types';

/**
 * Busca en el catálogo con las mismas reglas que el backend.
 *
 * La validación se repite aquí porque el texto puede cambiar entre el render
 * y la llamada. Si la consulta deja de ser válida no se gasta una petición.
 */
export async function searchCatalog(
  deps: UseCaseDeps,
  query: string,
  options?: { signal?: AbortSignal },
): Promise<CatalogSearchOutcome> {
  const validation = buildCatalogQuery(query);
  if (!validation.ok) {
    return { ok: false, reason: 'invalid_query' };
  }
  return deps.catalog.search(validation.query, options);
}
