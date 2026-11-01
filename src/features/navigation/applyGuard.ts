import { router } from 'expo-router';

import type { GuardTarget } from '@/domain/navigation';

/**
 * Ejecuta el destino de guarda con `replace`.
 *
 * Nunca usa `push`: una ruta con estado incorrecto no debe quedar en el
 * historial de navegación. `not_found` se sustituye por la pantalla global
 * para no mantener una URL inválida ni una cabecera engañosa.
 */
export function applyGuard(target: GuardTarget | null, listId: string): void {
  switch (target) {
    case null:
      return;
    case 'not_found':
      router.replace('/+not-found');
      return;
    case 'list':
      router.replace({ pathname: '/lista/[id]', params: { id: listId } });
      return;
    case 'shopping':
      router.replace({ pathname: '/lista/[id]/comprar', params: { id: listId } });
      return;
    case 'purchase':
      router.replace({ pathname: '/compra/[id]', params: { id: listId } });
  }
}
