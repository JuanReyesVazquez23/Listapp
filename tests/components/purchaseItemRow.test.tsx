import { render, screen } from '@testing-library/react-native';

import { PurchaseItemRow } from '@/components/compras/PurchaseItemRow';
import type { ShoppingItem } from '@/domain/item';

function item(name: string, isChecked: boolean): ShoppingItem {
  return {
    id: `item-${name}`,
    listId: 'list-1',
    name,
    isChecked,
    checkedAtUtc: isChecked ? 10 : null,
    sortOrder: 1,
    createdAtUtc: 1,
    updatedAtUtc: 1,
    detail: null,
  };
}

describe('PurchaseItemRow', () => {
  it('muestra el artículo comprado con su etiqueta y sin interacción', async () => {
    await render(<PurchaseItemRow item={item('Leche', true)} />);

    const row = screen.getByLabelText('Leche, comprado');
    expect(row.props.accessibilityRole).toBe('text');
    expect(screen.getByText('Comprado')).toBeTruthy();
    expect(screen.queryByRole('checkbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('muestra el artículo sin comprar como no interactivo', async () => {
    await render(<PurchaseItemRow item={item('Huevos', false)} />);

    const row = screen.getByLabelText('Huevos, no comprado');
    expect(row.props.accessibilityRole).toBe('text');
    expect(screen.queryByText('Comprado')).toBeNull();
  });
});
