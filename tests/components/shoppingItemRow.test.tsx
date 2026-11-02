import { fireEvent, render, screen } from '@testing-library/react-native';

import { ShoppingItemRow } from '@/components/listas/ShoppingItemRow';
import type { ShoppingItem } from '@/domain/item';

const milk: ShoppingItem = {
  id: 'item-1',
  listId: 'list-1',
  name: 'Leche',
  isChecked: false,
  checkedAtUtc: null,
  sortOrder: 1,
  createdAtUtc: 1,
  updatedAtUtc: 1,
  detail: null,
};

describe('ShoppingItemRow', () => {
  it('expone el estado no comprado y su etiqueta accesible', async () => {
    await render(
      <ShoppingItemRow item={milk} pending={false} onToggle={jest.fn()} />,
    );

    const row = screen.getByLabelText('Leche, no comprado');
    expect(row.props.accessibilityState).toEqual({ checked: false, disabled: false });
    expect(row.props.accessibilityHint).toBe('Toca para cambiar');
  });

  it('muestra el check y el texto Comprado al estar marcado', async () => {
    await render(
      <ShoppingItemRow
        item={{ ...milk, isChecked: true, checkedAtUtc: 10 }}
        pending={false}
        onToggle={jest.fn()}
      />,
    );

    const row = screen.getByLabelText('Leche, comprado');
    expect(row.props.accessibilityState).toEqual({ checked: true, disabled: false });
    expect(screen.getByText('Comprado')).toBeTruthy();
  });

  it('avisa del artículo al pulsar la fila', async () => {
    const onToggle = jest.fn();
    await render(
      <ShoppingItemRow item={milk} pending={false} onToggle={onToggle} />,
    );

    await fireEvent.press(screen.getByLabelText('Leche, no comprado'));
    expect(onToggle).toHaveBeenCalledWith('item-1');
  });

  it('se deshabilita mientras hay una escritura en curso', async () => {
    const onToggle = jest.fn();
    await render(
      <ShoppingItemRow item={milk} pending onToggle={onToggle} />,
    );

    const row = screen.getByLabelText('Leche, no comprado');
    expect(row.props.accessibilityState).toEqual({ checked: false, disabled: true });

    await fireEvent.press(row);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('en modo catálogo abre el detalle en vez de marcar', async () => {
    const onToggle = jest.fn();
    const onOpenDetail = jest.fn();
    await render(
      <ShoppingItemRow
        item={milk}
        pending={false}
        onToggle={onToggle}
        catalogMode
        onOpenDetail={onOpenDetail}
      />,
    );

    const row = screen.getByLabelText('Abre el detalle de Leche, sin precio');
    expect(row.props.accessibilityRole).toBe('button');
    expect(row.props.accessibilityHint).toBe('Toca para elegir marca, cantidad y precio');

    await fireEvent.press(row);
    expect(onOpenDetail).toHaveBeenCalledWith('item-1');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('en modo catálogo muestra la línea con marca, cantidad y subtotal', async () => {
    const withDetail = {
      ...milk,
      isChecked: true,
      checkedAtUtc: 10,
      detail: {
        brand: 'Bimbo',
        quantityMilli: 1500,
        unit: 'pound' as const,
        unitPriceCents: 200,
        lineSubtotalCents: 300,
        catalogProductId: '1',
      },
    };

    await render(
      <ShoppingItemRow
        item={withDetail}
        pending={false}
        onToggle={jest.fn()}
        catalogMode
        onOpenDetail={jest.fn()}
      />,
    );

    expect(screen.getByText('Bimbo · 1.5 Libra · RD$3.00')).toBeTruthy();
    expect(screen.getByText('Comprado')).toBeTruthy();
  });
});
