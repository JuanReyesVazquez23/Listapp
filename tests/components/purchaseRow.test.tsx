import { fireEvent, render, screen } from '@testing-library/react-native';

import { PurchaseRow } from '@/components/compras/PurchaseRow';
import type { ListSummary } from '@/domain/list';

const purchase: ListSummary = {
  id: 'list-1',
  name: 'Compra semanal',
  status: 'completed',
  createdAtUtc: 1,
  updatedAtUtc: 2,
  completedAtUtc: 2,
  completedLocalDate: '2026-10-27',
  completedLocalTime: '18:42',
  supermarketName: 'Mercadona',
  shoppingMode: null,
  totalCents: null,
  itemCount: 10,
  checkedCount: 8,
  unpricedCheckedCount: 0,
};

describe('PurchaseRow', () => {
  it('muestra fecha completa, supermercado y progreso', async () => {
    await render(<PurchaseRow purchase={purchase} onPress={jest.fn()} />);

    expect(screen.getByText('27 oct 2026 · 18:42')).toBeTruthy();
    expect(screen.getByText('Mercadona')).toBeTruthy();
    expect(screen.getByText('8 de 10 comprados')).toBeTruthy();
  });

  it('expone una etiqueta accesible con las tres piezas', async () => {
    await render(<PurchaseRow purchase={purchase} onPress={jest.fn()} />);

    const row = screen.getByLabelText('27 oct 2026 · 18:42, Mercadona, 8 de 10 comprados');
    expect(row.props.accessibilityRole).toBe('button');
  });

  it('abre la compra al pulsar la fila', async () => {
    const onPress = jest.fn();
    await render(<PurchaseRow purchase={purchase} onPress={onPress} />);

    await fireEvent.press(
      screen.getByLabelText('27 oct 2026 · 18:42, Mercadona, 8 de 10 comprados'),
    );

    expect(onPress).toHaveBeenCalledWith('list-1');
  });
});
