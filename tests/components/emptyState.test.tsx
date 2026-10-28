import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState } from '@/components/ui/EmptyState';

describe('EmptyState', () => {
  it('muestra título y descripción', async () => {
    await render(
      <EmptyState
        icon="basket-outline"
        title="Aún no hay listas"
        description="Crea una para empezar."
      />,
    );

    expect(screen.getByText('Aún no hay listas')).toBeTruthy();
    expect(screen.getByText('Crea una para empezar.')).toBeTruthy();
  });

  it('oculta la acción si falta el callback', async () => {
    await render(
      <EmptyState
        icon="basket-outline"
        title="Vacío"
        description="Sin datos"
        actionLabel="Crear"
      />,
    );

    expect(screen.queryByText('Crear')).toBeNull();
  });

  it('ejecuta la acción al pulsar el botón', async () => {
    const onAction = jest.fn();

    await render(
      <EmptyState
        icon="basket-outline"
        title="Vacío"
        description="Sin datos"
        actionLabel="Crear lista"
        onAction={onAction}
      />,
    );

    await fireEvent.press(screen.getByText('Crear lista'));
    expect(onAction).toHaveBeenCalledTimes(1);
  });
});
