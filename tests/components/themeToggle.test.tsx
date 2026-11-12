import { fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';

import { AppText } from '@/components/ui/AppText';
import { ThemeToggleButton } from '@/components/ui/ThemeToggleButton';
import { es } from '@/strings/es';
import { ThemeProvider } from '@/theme/ThemeProvider';
import {
  ThemeContext,
  useTheme,
  type ThemeContextValue,
} from '@/theme/themeContext';
import { nextThemeMode } from '@/theme/themeMode';
import { saveThemeMode } from '@/theme/themeStorage';
import { themes, type ThemeMode } from '@/theme/tokens';

jest.mock('@/theme/themeStorage', () => ({
  readStoredThemeMode: jest.fn(() => null),
  saveThemeMode: jest.fn(() => Promise.resolve()),
}));

function ModeProbe() {
  const { mode } = useTheme();
  return <AppText>{`modo:${mode}`}</AppText>;
}

function Harness({ initial }: { initial: ThemeMode }) {
  const [mode, setMode] = useState<ThemeMode>(initial);
  const value: ThemeContextValue = {
    mode,
    colors: themes[mode],
    isDark: mode === 'dark',
    setMode,
    toggle: () => setMode(nextThemeMode(mode)),
  };

  return (
    <ThemeContext.Provider value={value}>
      <ModeProbe />
      <ThemeToggleButton />
    </ThemeContext.Provider>
  );
}

describe('ThemeToggleButton', () => {
  it('muestra el destino y cambia de claro a oscuro y de vuelta', async () => {
    await render(<Harness initial="light" />);

    expect(screen.getByText('modo:light')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(es.theme.toDark));

    expect(screen.getByText('modo:dark')).toBeTruthy();
    expect(screen.getByLabelText(es.theme.toLight)).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(es.theme.toLight));

    expect(screen.getByText('modo:light')).toBeTruthy();
    expect(screen.getByLabelText(es.theme.toDark)).toBeTruthy();
  });

  it('expone el modo oscuro como estado del interruptor', async () => {
    await render(<Harness initial="dark" />);

    const toggle = screen.getByLabelText(es.theme.toLight);
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
  });
});

describe('ThemeProvider', () => {
  it('alterna el tema y guarda la elección', async () => {
    await render(
      <ThemeProvider>
        <ModeProbe />
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    const wasLight = screen.queryByText('modo:light') !== null;
    const target = wasLight ? 'dark' : 'light';

    await fireEvent.press(
      screen.getByLabelText(wasLight ? es.theme.toDark : es.theme.toLight),
    );

    expect(screen.getByText(`modo:${target}`)).toBeTruthy();
    expect(saveThemeMode).toHaveBeenCalledWith(target);
  });
});
