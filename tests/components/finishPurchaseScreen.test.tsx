import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { AccessibilityInfo } from 'react-native';

import { useFinishPurchase } from '@/features/listas/hooks/useFinishPurchase';

import FinishPurchaseScreen from '../../app/lista/[id]/finalizar';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), dismissTo: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ id: 'list-1' })),
  Stack: { Screen: () => null },
}));
jest.mock('@/features/listas/hooks/useFinishPurchase');

const useFinishPurchaseMock = useFinishPurchase as jest.Mock;
const replace = router.replace as jest.Mock;
const dismissTo = router.dismissTo as jest.Mock;
const push = router.push as jest.Mock;

function hookState(overrides: Record<string, unknown> = {}) {
  return {
    status: 'ready',
    detail: {
      list: { id: 'list-1', status: 'shopping' },
      items: [{ id: 'item-1', isChecked: true }],
    },
    suggestions: [],
    supermarketName: 'Mercadona',
    error: null,
    finishing: false,
    changeSupermarketName: jest.fn(),
    submit: jest.fn(),
    reload: jest.fn(),
    ...overrides,
  };
}

describe('pantalla de finalizar compra', () => {
  beforeEach(() => {
    replace.mockClear();
    dismissTo.mockClear();
    push.mockClear();
    useFinishPurchaseMock.mockReset();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => {});
  });

  it('sustituye un id inexistente por la pantalla global', async () => {
    useFinishPurchaseMock.mockReturnValue(
      hookState({ status: 'not_found', detail: null }),
    );

    await render(<FinishPurchaseScreen />);

    expect(replace).toHaveBeenCalledWith('/+not-found');
  });

  it('una compra ya cerrada abre su detalle histórico', async () => {
    useFinishPurchaseMock.mockReturnValue(
      hookState({
        status: 'not_shopping',
        detail: { list: { id: 'list-1', status: 'completed' }, items: [] },
      }),
    );

    await render(<FinishPurchaseScreen />);

    expect(replace).toHaveBeenCalledWith({
      pathname: '/compra/[id]',
      params: { id: 'list-1' },
    });
  });

  it('un borrador vuelve a su detalle editable', async () => {
    useFinishPurchaseMock.mockReturnValue(
      hookState({
        status: 'not_shopping',
        detail: { list: { id: 'list-1', status: 'draft' }, items: [] },
      }),
    );

    await render(<FinishPurchaseScreen />);

    expect(replace).toHaveBeenCalledWith({
      pathname: '/lista/[id]',
      params: { id: 'list-1' },
    });
  });

  it('tras guardar deja Historial como raíz y apila el detalle de la compra', async () => {
    const submit = jest.fn().mockResolvedValue({
      ok: true,
      purchase: { id: 'purchase-1' },
    });
    useFinishPurchaseMock.mockReturnValue(hookState({ submit }));

    await render(<FinishPurchaseScreen />);
    await fireEvent.press(screen.getByLabelText('Finalizar compra'));

    await waitFor(() => {
      expect(submit).toHaveBeenCalledWith(false);
      expect(dismissTo).toHaveBeenCalledWith('/historial');
    });
    expect(push).toHaveBeenCalledWith({
      pathname: '/compra/[id]',
      params: { id: 'purchase-1' },
    });
  });

  it('si el guardado falla no navega y conserva el formulario', async () => {
    const submit = jest.fn().mockResolvedValue({ ok: false, message: 'Error' });
    useFinishPurchaseMock.mockReturnValue(
      hookState({ submit, saveError: 'No se pudo guardar. Reintenta.' }),
    );

    await render(<FinishPurchaseScreen />);
    await fireEvent.press(screen.getByLabelText('Finalizar compra'));

    await waitFor(() => expect(submit).toHaveBeenCalled());
    expect(dismissTo).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Supermercado').props.value).toBe('Mercadona');
  });
});
