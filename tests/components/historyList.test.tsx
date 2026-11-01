import { fireEvent, render, screen } from '@testing-library/react-native';

import { HistoryList } from '@/components/compras/HistoryList';
import type { ListSummary } from '@/domain/list';

function purchase(
  id: string,
  supermarketName: string,
  completedLocalDate: string,
  completedLocalTime: string,
  checkedCount: number,
  itemCount: number,
): ListSummary {
  return {
    id,
    name: `Compra ${supermarketName}`,
    status: 'completed',
    createdAtUtc: 1,
    updatedAtUtc: 2,
    completedAtUtc: 2,
    completedLocalDate,
    completedLocalTime,
    supermarketName,
    shoppingMode: null,
    totalCents: null,
    itemCount,
    checkedCount,
    unpricedCheckedCount: 0,
  };
}

const purchases: ListSummary[] = [
  purchase('list-1', 'Lidl', '2026-10-27', '18:42', 1, 2),
  purchase('list-2', 'Mercadona', '2026-10-20', '10:15', 2, 2),
  purchase('list-3', 'Aldi', '2026-09-30', '19:05', 0, 3),
];

describe('HistoryList', () => {
  it('agrupa por mes y respeta el orden recibido', async () => {
    await render(
      <HistoryList purchases={purchases} onOpenPurchase={jest.fn()} onGoToLists={jest.fn()} />,
    );

    expect(screen.getAllByText('octubre 2026')).toHaveLength(1);
    expect(screen.getAllByText('septiembre 2026')).toHaveLength(1);

    const rows = screen.getAllByLabelText(/, \d+ de \d+ comprados$/);
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
      '27 oct 2026 · 18:42, Lidl, 1 de 2 comprados',
      '20 oct 2026 · 10:15, Mercadona, 2 de 2 comprados',
      '30 sep 2026 · 19:05, Aldi, 0 de 3 comprados',
    ]);
  });

  it('no repite un mes aunque las fechas locales no sean monótonas', async () => {
    await render(
      <HistoryList
        purchases={[
          purchase('list-1', 'Lidl', '2026-10-27', '18:42', 1, 2),
          purchase('list-2', 'Mercadona', '2026-11-01', '00:10', 2, 2),
          purchase('list-3', 'Aldi', '2026-10-31', '23:50', 0, 3),
        ]}
        onOpenPurchase={jest.fn()}
        onGoToLists={jest.fn()}
      />,
    );

    expect(screen.getAllByText('noviembre 2026')).toHaveLength(1);
    expect(screen.getAllByText('octubre 2026')).toHaveLength(1);

    const rows = screen.getAllByLabelText(/, \d+ de \d+ comprados$/);
    expect(rows.map((row) => row.props.accessibilityLabel)).toEqual([
      '01 nov 2026 · 00:10, Mercadona, 2 de 2 comprados',
      '27 oct 2026 · 18:42, Lidl, 1 de 2 comprados',
      '31 oct 2026 · 23:50, Aldi, 0 de 3 comprados',
    ]);
  });

  it('abre la compra pulsada', async () => {
    const onOpenPurchase = jest.fn();
    await render(
      <HistoryList
        purchases={purchases}
        onOpenPurchase={onOpenPurchase}
        onGoToLists={jest.fn()}
      />,
    );

    await fireEvent.press(
      screen.getByLabelText('20 oct 2026 · 10:15, Mercadona, 2 de 2 comprados'),
    );

    expect(onOpenPurchase).toHaveBeenCalledWith('list-2');
  });

  it('muestra el estado vacío con la acción a Listas', async () => {
    const onGoToLists = jest.fn();
    await render(
      <HistoryList
        purchases={[]}
        onOpenPurchase={jest.fn()}
        onGoToLists={onGoToLists}
      />,
    );

    expect(screen.getByText('Todavía no has finalizado ninguna compra')).toBeTruthy();

    await fireEvent.press(screen.getByText('Ir a Listas'));
    expect(onGoToLists).toHaveBeenCalledTimes(1);
  });
});
