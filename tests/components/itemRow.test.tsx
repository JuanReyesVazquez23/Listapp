import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ItemRow } from '@/components/listas/ItemRow';
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
};

describe('ItemRow', () => {
  it('muestra el nombre y las acciones accesibles', async () => {
    await render(<ItemRow item={milk} onRename={jest.fn()} onDelete={jest.fn()} />);

    expect(screen.getByText('Leche')).toBeTruthy();
    expect(screen.getByLabelText('Editar Leche')).toBeTruthy();
    expect(screen.getByLabelText('Eliminar Leche')).toBeTruthy();
  });

  it('elimina el artículo al pulsar la papelera', async () => {
    const onDelete = jest.fn();
    await render(<ItemRow item={milk} onRename={jest.fn()} onDelete={onDelete} />);

    await fireEvent.press(screen.getByLabelText('Eliminar Leche'));
    expect(onDelete).toHaveBeenCalledWith(milk);
  });

  it('renombra con el valor recortado', async () => {
    const onRename = jest.fn().mockResolvedValue(undefined);
    await render(<ItemRow item={milk} onRename={onRename} onDelete={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Editar Leche'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del artículo'), '  Leche entera  ');
    await fireEvent.press(screen.getByLabelText('Guardar'));

    await waitFor(() => expect(onRename).toHaveBeenCalledWith('item-1', 'Leche entera'));
  });

  it('no guarda un nombre vacío y muestra el error', async () => {
    const onRename = jest.fn();
    await render(<ItemRow item={milk} onRename={onRename} onDelete={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Editar Leche'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del artículo'), '   ');
    await fireEvent.press(screen.getByLabelText('Guardar'));

    expect(await screen.findByText('Escribe un nombre para el artículo.')).toBeTruthy();
    expect(onRename).not.toHaveBeenCalled();
  });

  it('cancela la edición sin llamar a onRename', async () => {
    const onRename = jest.fn();
    await render(<ItemRow item={milk} onRename={onRename} onDelete={jest.fn()} />);

    await fireEvent.press(screen.getByLabelText('Editar Leche'));
    await fireEvent.changeText(screen.getByLabelText('Nombre del artículo'), 'Otra cosa');
    await fireEvent.press(screen.getByLabelText('Cancelar'));

    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Leche')).toBeTruthy();
  });
});
