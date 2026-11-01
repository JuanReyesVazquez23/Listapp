import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { usePurchaseDetail } from '@/features/listas/hooks/usePurchaseDetail';

import PurchaseDetailScreen from '../../app/compra/[id]';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'list-1' })),
  Stack: {
    Screen: ({ options }: { options?: { headerRight?: () => unknown } }) =>
      options?.headerRight ? options.headerRight() : null,
  },
}));
jest.mock('@/features/listas/hooks/usePurchaseDetail');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

const usePurchaseDetailMock = usePurchaseDetail as jest.Mock;
const replace = router.replace as jest.Mock;

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ready',
    detail: {
      list: {
        id: 'list-1',
        status: 'completed',
        supermarketName: 'Mercadona',
        completedLocalDate: '2026-10-27',
        completedLocalTime: '18:42',
      },
      items: [{ id: 'item-1', name: 'Leche', isChecked: true }],
    },
    error: null,
    isDeleting: false,
    deleteError: null,
    remove: jest.fn().mockResolvedValue(true),
    clearDeleteError: jest.fn(),
    reload: jest.fn(),
    ...overrides,
  };
}

describe('pantalla de detalle de compra', () => {
  let alert: jest.SpyInstance;

  beforeEach(() => {
    replace.mockClear();
    usePurchaseDetailMock.mockReset();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    alert.mockClear();
  });

  it('sustituye un id inexistente por la pantalla global', async () => {
    usePurchaseDetailMock.mockReturnValue(
      hookState({ status: 'not_found', detail: null }),
    );

    await render(<PurchaseDetailScreen />);

    expect(replace).toHaveBeenCalledWith('/+not-found');
  });

  it('un borrador vuelve a su detalle editable', async () => {
    usePurchaseDetailMock.mockReturnValue(hookState({ status: 'draft' }));

    await render(<PurchaseDetailScreen />);

    expect(replace).toHaveBeenCalledWith({
      pathname: '/lista/[id]',
      params: { id: 'list-1' },
    });
  });

  it('una compra activa vuelve al modo compra', async () => {
    usePurchaseDetailMock.mockReturnValue(hookState({ status: 'shopping' }));

    await render(<PurchaseDetailScreen />);

    expect(replace).toHaveBeenCalledWith({
      pathname: '/lista/[id]/comprar',
      params: { id: 'list-1' },
    });
  });

  it('elimina tras confirmar y vuelve al historial', async () => {
    const remove = jest.fn().mockResolvedValue(true);
    usePurchaseDetailMock.mockReturnValue(hookState({ remove }));

    await render(<PurchaseDetailScreen />);
    await fireEvent.press(screen.getByLabelText('Opciones de la compra'));

    const menu = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      menu.find((button) => button.text === 'Eliminar compra')?.onPress?.();
    });

    const confirmation = alert.mock.calls[1][2] ?? [];
    const deleteAction = confirmation.find((button) => button.text === 'Eliminar');
    expect(deleteAction).toBeDefined();

    await act(async () => {
      deleteAction?.onPress?.();
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledWith('/historial');
  });

  it('si el borrado falla no navega y conserva el aviso', async () => {
    const remove = jest.fn().mockResolvedValue(false);
    usePurchaseDetailMock.mockReturnValue(
      hookState({ remove, deleteError: 'No se pudo guardar. Reintenta.' }),
    );

    await render(<PurchaseDetailScreen />);
    await fireEvent.press(screen.getByLabelText('Opciones de la compra'));

    const menu = alert.mock.calls[0][2] ?? [];
    await act(async () => {
      menu.find((button) => button.text === 'Eliminar compra')?.onPress?.();
    });

    const confirmation = alert.mock.calls[1][2] ?? [];
    await act(async () => {
      confirmation.find((button) => button.text === 'Eliminar')?.onPress?.();
    });

    expect(remove).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalledWith('/historial');
    expect(screen.getByText('No se pudo guardar. Reintenta.')).toBeTruthy();
  });
});
