import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';

import { FinishPurchaseForm } from '@/components/compras/FinishPurchaseForm';

type FormProps = ComponentProps<typeof FinishPurchaseForm>;

async function renderForm(overrides: Partial<FormProps> = {}) {
  const onSubmit = jest.fn();
  const onChangeSupermarket = jest.fn();

  const element = (extra: Partial<FormProps> = {}) => (
    <FinishPurchaseForm
      checkedCount={8}
      uncheckedCount={2}
      supermarket="Mercadona"
      onChangeSupermarket={onChangeSupermarket}
      suggestions={[]}
      isSubmitting={false}
      saveError={null}
      onSubmit={onSubmit}
      {...overrides}
      {...extra}
    />
  );

  const view = await render(element());

  return {
    onSubmit,
    onChangeSupermarket,
    rerender: (extra: Partial<FormProps>) => view.rerender(element(extra)),
  };
}

describe('FinishPurchaseForm', () => {
  it('muestra el resumen y el aviso de artículos sin comprar', async () => {
    await renderForm();

    expect(screen.getByText('8 comprados · 2 sin comprar')).toBeTruthy();
    expect(screen.getByText('Se guardarán como no comprados.')).toBeTruthy();
  });

  it('deshabilita el botón mientras no hay supermercado', async () => {
    const { onSubmit } = await renderForm({ supermarket: '' });

    const button = screen.getByLabelText('Finalizar compra');
    expect(button.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('no muestra error de supermercado antes de tocar el campo', async () => {
    await renderForm({ supermarket: '' });

    expect(screen.queryByText('Escribe el supermercado.')).toBeNull();
  });

  it('muestra el error inline al salir del campo vacío', async () => {
    await renderForm({ supermarket: '' });

    await fireEvent(screen.getByLabelText('Supermercado'), 'blur');

    expect(screen.getByText('Escribe el supermercado.')).toBeTruthy();
  });

  it('habilita el botón y envía cuando el supermercado es válido', async () => {
    const { onSubmit, onChangeSupermarket } = await renderForm();

    await fireEvent.changeText(screen.getByLabelText('Supermercado'), 'Lidl');
    expect(onChangeSupermarket).toHaveBeenCalledWith('Lidl');

    const button = screen.getByLabelText('Finalizar compra');
    expect(button.props.accessibilityState).toEqual({ disabled: false });

    await fireEvent.press(button);
    expect(onSubmit).toHaveBeenCalledWith(false);
  });

  it('rellena el campo con un chip de sugerencia', async () => {
    const { onChangeSupermarket } = await renderForm({
      suggestions: ['Mercadona', 'Lidl'],
    });

    await fireEvent.press(screen.getByLabelText('Usar Lidl'));

    expect(onChangeSupermarket).toHaveBeenCalledWith('Lidl');
  });

  it('pide confirmación antes de cerrar con 0 marcados', async () => {
    const { onSubmit } = await renderForm({ checkedCount: 0, uncheckedCount: 3 });

    expect(screen.getByText('No has marcado ningún artículo.')).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Finalizar compra'));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(
      screen.getByText('Se guardará la compra con 0 comprados. ¿Continuar?'),
    ).toBeTruthy();

    await fireEvent.press(screen.getByLabelText('Finalizar con 0 comprados'));
    expect(onSubmit).toHaveBeenCalledWith(true);
  });

  it('vuelve al botón normal al cancelar la confirmación', async () => {
    await renderForm({ checkedCount: 0, uncheckedCount: 3 });

    await fireEvent.press(screen.getByLabelText('Finalizar compra'));
    await fireEvent.press(screen.getByLabelText('Cancelar'));

    expect(
      screen.queryByText('Se guardará la compra con 0 comprados. ¿Continuar?'),
    ).toBeNull();
    expect(screen.getByLabelText('Finalizar compra')).toBeTruthy();
  });

  it('deshabilita el botón y muestra el progreso al enviar', async () => {
    const { onSubmit } = await renderForm({ isSubmitting: true });

    const button = screen.getByLabelText('Guardando…');
    expect(button.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el progreso también al confirmar 0 marcados', async () => {
    const { onSubmit, rerender } = await renderForm({
      checkedCount: 0,
      uncheckedCount: 3,
    });

    await fireEvent.press(screen.getByLabelText('Finalizar compra'));
    await rerender({ isSubmitting: true });

    const button = screen.getByLabelText('Guardando…');
    expect(button.props.accessibilityState).toEqual({ disabled: true });

    await fireEvent.press(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('muestra el error de guardado', async () => {
    await renderForm({ saveError: 'No se pudo guardar. Reintenta.' });

    expect(screen.getByText('No se pudo guardar. Reintenta.')).toBeTruthy();
    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
