/**
 * Diagnóstico visible solo en desarrollo y en builds `preview`.
 * El APK de entrega no muestra esta sección.
 */
export const SHOW_DB_DIAGNOSTICS =
  __DEV__ || process.env.EXPO_PUBLIC_DB_DIAGNOSTICS === '1';
