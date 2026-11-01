import { act, render } from '@testing-library/react-native';

import { useFinishPurchase } from '@/features/listas/hooks/useFinishPurchase';
import { finishPurchase } from '@/useCases/shopping';

jest.mock('expo-router', () => ({ useFocusEffect: () => {} }));
jest.mock('@/useCases/deps', () => ({ appDeps: {} }));
jest.mock('@/useCases/shopping');
jest.mock('@/useCases/lists');
jest.mock('@/useCases/history');

const finishPurchaseMock = finishPurchase as jest.Mock;

type HookState = ReturnType<typeof useFinishPurchase>;

function harness() {
  const state: { current: HookState | null } = { current: null };

  function Harness() {
    state.current = useFinishPurchase('list-1');
    return null;
  }

  return { state, Harness };
}

describe('useFinishPurchase', () => {
  beforeEach(() => {
    finishPurchaseMock.mockReset();
  });

  it('ignora un segundo envío mientras la transacción está en vuelo', async () => {
    let release!: (purchase: unknown) => void;
    finishPurchaseMock.mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const { state, Harness } = harness();
    await render(<Harness />);

    let first!: Promise<unknown>;
    let second!: Promise<unknown>;
    await act(async () => {
      first = state.current!.submit(false);
      second = state.current!.submit(false);
    });

    expect(finishPurchaseMock).toHaveBeenCalledTimes(1);
    expect(await second).toEqual({
      ok: false,
      message: 'No se pudo guardar. Reintenta.',
    });

    await act(async () => {
      release({ id: 'purchase-1', status: 'completed' });
      await first;
    });
  });

  it('conserva el supermercado y expone el error si el guardado falla', async () => {
    finishPurchaseMock.mockRejectedValue(new Error('disco lleno'));

    const { state, Harness } = harness();
    await render(<Harness />);

    await act(async () => {
      state.current!.changeSupermarketName('Lidl');
    });

    let outcome: unknown;
    await act(async () => {
      outcome = await state.current!.submit(false);
    });

    expect(outcome).toEqual({
      ok: false,
      message: 'No se pudo guardar. Reintenta.',
    });
    expect(state.current!.supermarketName).toBe('Lidl');
    expect(state.current!.error).toBe('No se pudo guardar. Reintenta.');
  });
});
