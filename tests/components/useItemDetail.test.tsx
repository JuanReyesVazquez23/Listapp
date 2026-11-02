import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { ShoppingItem } from '@/domain/item';
import type { ShoppingList } from '@/domain/list';
import { useItemDetail } from '@/features/listas/hooks/useItemDetail';
import { searchCatalog } from '@/useCases/catalog';
import { getItemForDetail } from '@/useCases/items';
import {
  checkItem,
  setItemChecked,
  updateItemDetail,
} from '@/useCases/shopping';

jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    useEffect(callback, [callback]);
  },
}));
jest.mock('@/useCases/items', () => ({
  getItemForDetail: jest.fn(),
}));
jest.mock('@/useCases/catalog', () => ({
  searchCatalog: jest.fn(),
}));
jest.mock('@/useCases/shopping', () => ({
  checkItem: jest.fn(),
  setItemChecked: jest.fn(),
  updateItemDetail: jest.fn(),
}));

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

const list: ShoppingList = {
  id: 'list-1',
  name: 'Compra',
  status: 'shopping',
  createdAtUtc: 1,
  updatedAtUtc: 1,
  completedAtUtc: null,
  completedLocalDate: null,
  completedLocalTime: null,
  supermarketName: null,
  shoppingMode: 'catalog',
  totalCents: null,
};

const products = [
  {
    productId: '1',
    name: 'Pan Blanco',
    brand: 'Bimbo',
    presentation: null,
    priceCents: 17525,
  },
];

const getItemForDetailMock = getItemForDetail as jest.Mock;
const searchCatalogMock = searchCatalog as jest.Mock;
const checkItemMock = checkItem as jest.Mock;
const updateItemDetailMock = updateItemDetail as jest.Mock;
const setItemCheckedMock = setItemChecked as jest.Mock;

describe('useItemDetail', () => {
  beforeEach(() => {
    getItemForDetailMock.mockReset();
    searchCatalogMock.mockReset();
    checkItemMock.mockReset();
    updateItemDetailMock.mockReset();
    setItemCheckedMock.mockReset();

    getItemForDetailMock.mockResolvedValue({ item, list });
    searchCatalogMock.mockResolvedValue({ ok: true, products });
  });

  it('busca sola con el nombre del artículo al abrir el detalle', async () => {
    const { result } = await renderHook(() => useItemDetail(item.id));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));

    expect(searchCatalogMock).toHaveBeenCalledTimes(1);
    expect(searchCatalogMock).toHaveBeenCalledWith(
      expect.anything(),
      'Pan',
      expect.objectContaining({ signal: expect.anything() }),
    );
    expect(result.current.catalog).toMatchObject({
      status: 'ready',
      products,
    });
  });

  it('no repite la búsqueda automática al enfocar de nuevo el modal', async () => {
    const { result, rerender } = await renderHook(() =>
      useItemDetail(item.id),
    );

    await waitFor(() => expect(result.current.catalog.status).toBe('ready'));
    await rerender({});

    expect(searchCatalogMock).toHaveBeenCalledTimes(1);
  });

  it('no busca si la línea ya tiene precio guardado', async () => {
    getItemForDetailMock.mockResolvedValue({
      item: {
        ...item,
        isChecked: true,
        checkedAtUtc: 5,
        detail: {
          brand: 'Bimbo',
          quantityMilli: 1000,
          unit: 'unit',
          unitPriceCents: 17525,
          lineSubtotalCents: 17525,
          catalogProductId: '1',
        },
      },
      list,
    });

    const { result } = await renderHook(() => useItemDetail(item.id));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(searchCatalogMock).not.toHaveBeenCalled();
  });

  it('deja el formulario manual si el catálogo falla', async () => {
    searchCatalogMock.mockResolvedValue({ ok: false, reason: 'offline' });

    const { result } = await renderHook(() => useItemDetail(item.id));

    await waitFor(() =>
      expect(result.current.catalog).toMatchObject({
        status: 'error',
        reason: 'offline',
      }),
    );
    expect(result.current.status).toBe('ready');
  });

  it('no edita una compra normal y no consulta el catálogo', async () => {
    getItemForDetailMock.mockResolvedValue({
      item,
      list: { ...list, shoppingMode: 'normal' },
    });

    const { result } = await renderHook(() => useItemDetail(item.id));

    await waitFor(() => expect(result.current.status).toBe('not_editable'));
    expect(searchCatalogMock).not.toHaveBeenCalled();
  });

  it('marca con detalle si la línea aún no está comprada', async () => {
    checkItemMock.mockResolvedValue({ item, progress: {} });
    const { result } = await renderHook(() => useItemDetail(item.id));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    let ok = false;
    await act(async () => {
      ok = await result.current.save({
        brand: 'Bimbo',
        quantityMilli: 1000,
        unit: 'unit',
        unitPriceCents: 17525,
        catalogProductId: '1',
      });
    });

    expect(ok).toBe(true);
    expect(checkItemMock).toHaveBeenCalledWith(
      expect.anything(),
      item.id,
      {
        brand: 'Bimbo',
        quantityMilli: 1000,
        unit: 'unit',
        unitPriceCents: 17525,
        catalogProductId: '1',
      },
    );
    expect(updateItemDetailMock).not.toHaveBeenCalled();
  });

  it('actualiza el detalle si la línea ya está comprada y permite quitarlo', async () => {
    getItemForDetailMock.mockResolvedValue({
      item: { ...item, isChecked: true, checkedAtUtc: 5 },
      list,
    });
    updateItemDetailMock.mockResolvedValue({ item, progress: {} });

    const { result } = await renderHook(() => useItemDetail(item.id));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.removeData();
    });
    expect(updateItemDetailMock).toHaveBeenCalledWith(
      expect.anything(),
      item.id,
      null,
    );

    await act(async () => {
      await result.current.removeFromPurchase();
    });
    expect(setItemCheckedMock).toHaveBeenCalledWith(
      expect.anything(),
      item.id,
      false,
    );
  });

  it('marca sin precio al omitir', async () => {
    checkItemMock.mockResolvedValue({ item, progress: {} });
    const { result } = await renderHook(() => useItemDetail(item.id));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.skip();
    });

    expect(checkItemMock).toHaveBeenCalledWith(
      expect.anything(),
      item.id,
      null,
    );
  });
});
