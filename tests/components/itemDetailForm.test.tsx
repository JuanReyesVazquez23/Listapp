import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { ItemDetailForm } from '@/components/compras/ItemDetailForm';
import type { ShoppingItem } from '@/domain/item';

type FormProps = ComponentProps<typeof ItemDetailForm>;

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
    imageUrl: 'https://gruporamos.vteximg.com.br/arquivos/ids/164483/pan.jpg',
  },
];

const mixedProducts = [
  products[0],
  {
    productId: '2',
    name: 'Pan Integral',
    brand: 'Zerca',
    presentation: 'Pan Integral 2 Lb',
    priceCents: 12000,
    imageUrl: null,
  },
  {
    productId: '3',
    name: 'Leche Entera',
    brand: 'Rica',
    presentation: 'Leche Entera 1 L',
    priceCents: 9500,
    imageUrl: null,
  },
];

function resultNames(): string[] {
  return screen
    .getAllByLabelText(/^Elegir /)
    .map((node) => (node.props.accessibilityLabel as string).split(', ')[1]);
}

function renderForm(overrides: Partial<FormProps> = {}) {
  const onSave = jest.fn();
  const onSkip = jest.fn();
  const onRemoveData = jest.fn();
  const onRemoveFromPurchase = jest.fn();
  const onSearch = jest.fn();

  const element = (extra: Partial<FormProps> = {}) => (
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
      {...extra}
    />
  );

  return render(element()).then((view) => ({
    view,
    onSave,
    onSkip,
    onRemoveData,
    onRemoveFromPurchase,
    onSearch,
    rerender: (extra: Partial<FormProps>) => view.rerender(element(extra)),
  }));
}

describe('ItemDetailForm', () => {
  it('lista las marcas ya buscadas sin que el usuario escriba', async () => {
    await renderForm();

    expect(screen.getByText('Marcas y presentaciones')).toBeTruthy();
    expect(screen.getAllByText('Bimbo').length).toBeGreaterThan(0);
    expect(screen.getByText('Pan Blanco')).toBeTruthy();
    expect(screen.getByText('Pan Blanco Grande 500 g')).toBeTruthy();
    expect(screen.getByText('RD$175.25')).toBeTruthy();
    expect(screen.getByTestId('catalog-product-image')).toBeTruthy();
  });

  it('muestra un placeholder cuando la presentación no tiene imagen', async () => {
    await renderForm({
      catalog: {
        status: 'ready',
        query: 'pan',
        products: [{ ...products[0], imageUrl: null }],
      },
    });

    expect(
      screen.getByTestId('catalog-product-image-placeholder'),
    ).toBeTruthy();
    expect(screen.queryByTestId('catalog-product-image')).toBeNull();
  });

  it('filtra por texto y por marca sin pedir otra búsqueda', async () => {
    const { onSearch } = await renderForm({
      catalog: { status: 'ready', query: 'pan', products: mixedProducts },
    });

    expect(screen.getByText('3 presentaciones')).toBeTruthy();

    await fireEvent.changeText(
      screen.getByLabelText('Filtrar resultados'),
      'integral',
    );
    expect(resultNames()).toEqual(['Pan Integral']);
    expect(screen.getByText('1 de 3 presentaciones')).toBeTruthy();

    await fireEvent.changeText(screen.getByLabelText('Filtrar resultados'), '');
    await fireEvent.press(screen.getByLabelText('Zerca'));
    expect(resultNames()).toEqual(['Pan Integral']);

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('ordena por precio y por mejor precio por medida', async () => {
    await renderForm({
      catalog: { status: 'ready', query: 'pan', products: mixedProducts },
    });

    await fireEvent.press(screen.getByLabelText('Menor precio'));
    expect(resultNames()).toEqual([
      'Leche Entera',
      'Pan Integral',
      'Pan Blanco',
    ]);

    await fireEvent.press(screen.getByLabelText('Mayor precio'));
    expect(resultNames()).toEqual([
      'Pan Blanco',
      'Pan Integral',
      'Leche Entera',
    ]);

    await fireEvent.press(
      screen.getByLabelText('Mejor precio por medida'),
    );
    expect(resultNames()).toEqual([
      'Pan Integral',
      'Pan Blanco',
      'Leche Entera',
    ]);
  });

  it('avisa cuando ningún resultado coincide y permite limpiar los filtros', async () => {
    await renderForm({
      catalog: { status: 'ready', query: 'pan', products: mixedProducts },
    });

    await fireEvent.press(screen.getByLabelText('Bimbo'));
    await fireEvent.changeText(
      screen.getByLabelText('Filtrar resultados'),
      'zzz',
    );

    expect(
      screen.getByText('Ninguna presentación coincide con el filtro.'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Limpiar filtros'));
    expect(resultNames()).toHaveLength(3);
  });

  it('reinicia filtros y orden cuando cambia la consulta', async () => {
    const { rerender } = await renderForm({
      catalog: { status: 'ready', query: 'pan', products: mixedProducts },
    });

    await fireEvent.press(screen.getByLabelText('Bimbo'));
    await fireEvent.press(screen.getByLabelText('Mayor precio'));
    expect(resultNames()).toEqual(['Pan Blanco']);

    await rerender({
      catalog: { status: 'ready', query: 'leche', products: mixedProducts },
    });

    expect(resultNames()).toEqual([
      'Pan Blanco',
      'Pan Integral',
      'Leche Entera',
    ]);
  });

  it('al elegir una presentación rellena marca, precio y cantidad', async () => {
    await renderForm();

    await fireEvent.press(
      screen.getByLabelText(
        'Elegir Bimbo, Pan Blanco, RD$175.25, RD$158.98/lb',
      ),
    );

    expect(screen.getByLabelText('Marca').props.value).toBe('Bimbo');
    expect(screen.getByLabelText('Precio por unidad').props.value).toBe('175.25');
    expect(screen.getByLabelText('Cantidad').props.value).toBe('1');
  });

  it('muestra el precio por medida cuando la presentación declara tamaño', async () => {
    await renderForm();

    expect(screen.getByText('RD$158.98/lb')).toBeTruthy();
  });

  it('guarda el detalle validado con el producto del catálogo', async () => {
    const { onSave } = await renderForm();

    await fireEvent.press(
      screen.getByLabelText(
        'Elegir Bimbo, Pan Blanco, RD$175.25, RD$158.98/lb',
      ),
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
