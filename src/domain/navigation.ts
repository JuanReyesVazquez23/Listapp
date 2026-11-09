import type { ListStatus } from '@/domain/list';

/**
 * Destino canónico de una ruta cuando el estado de la lista no es el que la
 * pantalla espera. `null` significa que la pantalla puede renderizar.
 *
 * Vive en el dominio para que la matriz de `docs/04` se pueda probar sin
 * montar React ni Expo; la traducción a `router.replace` está en
 * `src/features/navigation/applyGuard.ts`.
 */
export type GuardTarget = 'not_found' | 'list' | 'shopping' | 'purchase';

/** El detalle solo se pinta en `draft`/`shopping`; una compra cerrada va a su detalle. */
export function listDetailGuard(status: ListStatus): GuardTarget | null {
  return status === 'completed' ? 'purchase' : null;
}

/** El modo compra solo acepta `shopping`; el borrador vuelve al detalle. */
export function shoppingGuard(status: ListStatus): GuardTarget | null {
  if (status === 'draft') {
    return 'list';
  }
  if (status === 'completed') {
    return 'purchase';
  }
  return null;
}

/** El detalle histórico solo acepta `completed`. */
export function purchaseGuard(status: ListStatus): GuardTarget | null {
  if (status === 'draft') {
    return 'list';
  }
  if (status === 'shopping') {
    return 'shopping';
  }
  return null;
}
