/**
 * URL del backend de catálogo.
 *
 * Se inyecta en el build mediante `EXPO_PUBLIC_CATALOG_API_URL`; las variables
 * `EXPO_PUBLIC_*` se sustituyen en tiempo de compilación, así que cambiarla
 * exige un APK nuevo. Si no está configurada, la app sigue funcionando a mano.
 */
export const CATALOG_API_URL = (
  process.env.EXPO_PUBLIC_CATALOG_API_URL ?? ''
).trim();

export const isCatalogConfigured = CATALOG_API_URL.length > 0;
