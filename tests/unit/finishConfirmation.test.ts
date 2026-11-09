import { buildFinishConfirmation } from '@/features/listas/finishConfirmation';
import { es } from '@/strings/es';

describe('confirmación de finalizar compra', () => {
  it('pregunta siempre antes de cerrar, aunque estén todos marcados', () => {
    const confirmation = buildFinishConfirmation(3, 3);

    expect(confirmation.message).toBe('¿Seguro que quieres terminar la compra?');
    expect(confirmation.confirmLabel).toBe(es.finish.submit);
    expect(confirmation.confirmZeroChecked).toBe(false);
  });

  it('avisa cuántos artículos quedarán sin comprar', () => {
    expect(buildFinishConfirmation(2, 3).message).toBe(
      '¿Seguro que quieres terminar la compra? Se guardará 1 artículo sin comprar.',
    );
    expect(buildFinishConfirmation(2, 4).message).toBe(
      '¿Seguro que quieres terminar la compra? Se guardarán 2 artículos sin comprar.',
    );
  });

  it('refuerza el aviso cuando no hay ningún artículo marcado', () => {
    const confirmation = buildFinishConfirmation(0, 3);

    expect(confirmation.message).toBe(es.finish.confirmZeroBody);
    expect(confirmation.message).toContain('0 comprados');
    expect(confirmation.confirmZeroChecked).toBe(true);
  });
});
