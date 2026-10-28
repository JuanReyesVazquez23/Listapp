import { fireEvent, render, screen } from '@testing-library/react-native';

import { AddItemBar } from '@/components/listas/AddItemBar';
import { ProgressBar } from '@/components/listas/ProgressBar';
import { computeProgress } from '@/domain/progress';

describe('ProgressBar', () => {
  it('expone el valor accesible con el progreso actual', async () => {
    await render(
      <ProgressBar
        progress={computeProgress([{ isChecked: true }, { isChecked: false }])}
      />,
    );

    const bar = screen.getByRole('progressbar');
    expect(bar.props.accessibilityValue).toEqual({
      min: 0,
      max: 2,
      now: 1,
      text: '1 de 2, 50%',
    });
    expect(screen.getByText('1 de 2')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
  });
});

describe('AddItemBar', () => {
  it('no envía un nombre vacío y anuncia el error', async () => {
    const onAdd = jest.fn();
    await render(<AddItemBar onAdd={onAdd} />);

    await fireEvent.changeText(screen.getByLabelText('Añadir artículo'), '   ');
    await fireEvent.press(screen.getByLabelText('Añadir'));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe un nombre para el artículo.')).toBeTruthy();
  });

  it('envía el nombre recortado y limpia el campo', async () => {
    const onAdd = jest.fn().mockResolvedValue(undefined);
    await render(<AddItemBar onAdd={onAdd} />);

    await fireEvent.changeText(screen.getByLabelText('Añadir artículo'), '  Leche  ');
    await fireEvent.press(screen.getByLabelText('Añadir'));

    expect(onAdd).toHaveBeenCalledWith('Leche');
    expect(screen.getByLabelText('Añadir artículo').props.value).toBe('');
  });
});
