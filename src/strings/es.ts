/**
 * Todos los textos visibles. La UI no escribe cadenas literales.
 */
export const es = {
  appName: 'Listapp',
  tabs: {
    lists: 'Listas',
    history: 'Historial',
  },
  lists: {
    emptyTitle: 'Aún no hay listas',
    emptyBody: 'Aquí aparecerán tus listas y la compra en curso.',
  },
  history: {
    emptyTitle: 'Todavía no has finalizado ninguna compra',
    emptyBody: 'Cuando termines una compra, aparecerá aquí con la fecha y el supermercado.',
  },
  notFound: {
    header: 'No encontrado',
    title: 'Esta lista no existe o se ha eliminado.',
    body: 'Vuelve a Listas para continuar.',
    action: 'Volver a Listas',
  },
  boot: {
    genericTitle: 'No se pudo abrir la base de datos',
    genericBody: 'Cierra la app y vuelve a abrirla. Si el problema continúa, reinstala el APK.',
    retry: 'Reintentar',
    schemaTitle: 'Versión no compatible',
    schemaBody: (detected: number, supported: number) =>
      `La base de datos usa la versión ${detected} y esta app admite hasta la ${supported}. Instala el APK más reciente.`,
    unknownSchemaBody: 'La base de datos no tiene un esquema reconocible. Reinstala el APK.',
    brokenTitle: 'Base de datos bloqueada',
    brokenBody: 'Cierra la app desde el selector de aplicaciones y vuelve a abrirla.',
    technicalCode: 'Código',
  },
  diagnostics: {
    title: 'Diagnóstico de base de datos',
    sqlite: 'SQLite',
    schema: 'Esquema',
    journal: 'WAL',
    foreignKeys: 'foreign_keys',
    write: 'Escritura',
    rollback: 'Rollback',
    yes: 'Sí',
    no: 'No',
    running: 'Comprobando…',
    failed: 'Error',
    version: (version: number) => `v${version}`,
  },
} as const;
