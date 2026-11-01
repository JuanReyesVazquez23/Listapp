import { router } from 'expo-router';

import {
  finishGuard,
  listDetailGuard,
  purchaseGuard,
  shoppingGuard,
} from '@/domain/navigation';
import { applyGuard } from '@/features/navigation/applyGuard';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
}));

const replace = router.replace as jest.Mock;

describe('guardas de ruta', () => {
  it('el detalle de lista deja pasar borradores y compras activas', () => {
    expect(listDetailGuard('draft')).toBeNull();
    expect(listDetailGuard('shopping')).toBeNull();
  });

  it('el detalle de lista sustituye una compra cerrada por su historial', () => {
    expect(listDetailGuard('completed')).toBe('purchase');
  });

  it('el modo compra vuelve al detalle desde un borrador', () => {
    expect(shoppingGuard('draft')).toBe('list');
  });

  it('el modo compra deja pasar solo el estado shopping', () => {
    expect(shoppingGuard('shopping')).toBeNull();
    expect(shoppingGuard('completed')).toBe('purchase');
  });

  it('el modal de finalizar comparte las guardas del modo compra', () => {
    expect(finishGuard('draft')).toBe('list');
    expect(finishGuard('shopping')).toBeNull();
    expect(finishGuard('completed')).toBe('purchase');
  });

  it('el detalle histórico redirige cada estado activo a su ruta', () => {
    expect(purchaseGuard('completed')).toBeNull();
    expect(purchaseGuard('draft')).toBe('list');
    expect(purchaseGuard('shopping')).toBe('shopping');
  });
});

describe('applyGuard', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('no navega cuando la pantalla puede renderizar', () => {
    applyGuard(null, 'list-1');
    expect(replace).not.toHaveBeenCalled();
  });

  it('sustituye un id inexistente por la pantalla global', () => {
    applyGuard('not_found', 'list-1');
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/+not-found');
  });

  it('sustituye cada destino canónico conservando el id', () => {
    applyGuard('list', 'list-1');
    expect(replace).toHaveBeenLastCalledWith({
      pathname: '/lista/[id]',
      params: { id: 'list-1' },
    });

    applyGuard('shopping', 'list-1');
    expect(replace).toHaveBeenLastCalledWith({
      pathname: '/lista/[id]/comprar',
      params: { id: 'list-1' },
    });

    applyGuard('purchase', 'list-1');
    expect(replace).toHaveBeenLastCalledWith({
      pathname: '/compra/[id]',
      params: { id: 'list-1' },
    });
  });
});
