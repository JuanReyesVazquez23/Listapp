/**
 * En Jest no hay registro de assets de Metro, así que las fuentes de
 * @expo/vector-icons intentarían cargar un módulo inexistente.
 * Simulamos que la fuente ya está cargada.
 */
jest.mock('expo-font', () => {
  const actual = jest.requireActual<typeof import('expo-font')>('expo-font');
  return {
    ...actual,
    isLoaded: () => true,
    loadAsync: () => Promise.resolve(),
  };
});
