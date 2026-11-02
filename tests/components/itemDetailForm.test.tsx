import { fireEvent, render, screen } from '@testing-library/react-native';

import { ItemDetailForm } from '@/components/compras/ItemDetailForm';
import type { ShoppingItem } from '@/domain/item';

const item: ShoppingItem = {
  id: 'item-1',
  listId: 'list-1',
  name: 'Pan',
  isChecked: false,
  checkedAtUtc: null,
  sortOrder: 1,
  createdAtUtc: 1,
  updatedAtUtc: 1,
  detail: null,
};

const products = [
  {
    productId: '1',
    name: 'Pan Blanco',
    brand: 'Bimbo',
    presentation: 'Pan Blanco Grande 500 g',
    priceCents: 17525,
  },
];

function renderForm(overrides: Record<string, unknown> = {}) {
  const onSave = jest.fn();
  const onSkip = jest.fn();
  const onRemoveData = jest.fn();
  const onRemoveFromPurchase = jest.fn();
  const onSearch = jest.fn();

  return render(
    <ItemDetailForm
      item={item}
      catalog={{ status: 'ready', query: 'pan', products }}
      isSaving={false}
      saveError={null}
      onSearch={onSearch}
      onSave={onSave}
      onSkip={onSkip}
      onRemoveData={onRemoveData}
      onRemoveFromPurchase={onRemoveFromPurchase}
      {...overrides}
    />,
  ).then((view) => ({
    view,
    onSave,
    onSkip,
    onRemoveData,
    onRemoveFromPurchase,
    onSearch,
  }));
}

describe('ItemDetailForm', () => {
  it('lista las marcas ya buscadas sin que el usuario escriba', async () => {
    await renderForm();

    expect(screen.getByText('Marcas y presentaciones')).toBeTruthy();
    expect(screen.getByText('Bimbo')).toBeTruthy();
    expect(screen.getByText('Pan Blanco')).toBeTruthy();
    expect(screen.getByText('Pan Blanco Grande 500 g')).toBeTruthy();
    expect(screen.getByText('RD$175.25')).toBeTruthy();
  });

  it('al elegir una presentación rellena marca, precio y cantidad', async () => {
    await renderForm();

    await fireEvent.press(
      screen.getByLabelText('Elegir Bimbo, Pan Blanco, RD$175.25'),
    );

    expect(screen.getByLabelText('Marca').props.value).toBe('Bimbo');
    expect(screen.getByLabelText('Precio por unidad').props.value).toBe('175.25');
    expect(screen.getByLabelText('Cantidad').props.value).toBe('1');
  });

  it('guarda el detalle validado con el producto del catálogo', async () => {
    const { onSave } = await renderForm();

    await fireEvent.press(
      screen.getByLabelText('Elegir Bimbo, Pan Blanco, RD$175.25'),
    );
    await fireEvent.changeText(screen.getByLabelText('Cantidad'), '1.5');
    await fireEvent.press(screen.getByLabelText('Libra'));
    await fireEvent.press(screen.getByLabelText('Guardar detalle'));

    expect(onSave).toHaveBeenCalledWith({
      brand: 'Bimbo',
      quantityMilli: 1500,
      unit: 'pound',
      unitPriceCents: 17525,
      catalogProductId: '1',
    });
  });

  it('muestra los errores por campo y no guarda un formulario inválido', async () => {
    const { onSave } = await renderForm();
    onSave.mockClear();

    await fireEvent.press(screen.getByLabelText('Guardar detalle'));

    expect(screen.getByText('Escribe el precio.')).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('permite corregir la consulta sin buscar mientras se escribe', async () => {
    const { onSearch } = await renderForm();

    await fireEvent.changeText(screen.getByLabelText('Buscar en La Sirena'), 'pan integral');
    expect(onSearch).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByLabelText('Buscar'));
    expect(onSearch).toHaveBeenCalledWith('pan integral');
  });

  it('explica el fallo del catálogo y deja el formulario manual', async () => {
    const { onSearch } = await renderForm({
      catalog: { status: 'error', query: 'pan', reason: 'offline' },
    });

    expect(
      screen.getByText('Sin conexión. Puedes continuar a mano.'),
    ).toBeTruthy();
    expect(screen.getByLabelText('Marca')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Reintentar'));
    expect(onSearch).toHaveBeenCalledWith('Pan');
  });

  it('ofrece omitir cuando el artículo aún no está marcado', async () => {
    const { onSkip } = await renderForm();

    await fireEvent.press(screen.getByLabelText('Omitir'));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
