import { es } from '@/strings/es';

export interface FinishConfirmation {
  title: string;
  message: string;
  confirmLabel: string;
  confirmZeroChecked: boolean;
}

/**
 * Texto de la confirmación que precede al cierre de la compra.
 *
 * El botón de finalizar siempre pregunta; solo cambia el aviso cuando no hay
 * ningún artículo marcado, porque ese caso guarda una compra vacía.
 */
export function buildFinishConfirmation(
  checkedCount: number,
  totalCount: number,
): FinishConfirmation {
  const unchecked = Math.max(totalCount - checkedCount, 0);

  return {
    title: es.finish.confirmTitle,
    message:
      checkedCount === 0
        ? es.finish.confirmZeroBody
        : es.finish.confirmBody(unchecked),
    confirmLabel: es.finish.submit,
    confirmZeroChecked: checkedCount === 0,
  };
}
