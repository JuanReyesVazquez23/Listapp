# Listapp

App móvil Android para crear listas de compras, marcar artículos durante la compra y guardar cada compra en un historial con fecha, hora y total. Todo el flujo principal funciona sin red; el catálogo de La Sirena es una ayuda opcional.

**Estado actual: M0 a M3 implementados.** Listas, artículos, modo compra, cierre, historial, catálogo opcional con La Sirena y tema claro/oscuro funcionan con persistencia local. Hay un APK `preview` disponible en EAS; queda la validación en dispositivo físico y los flujos E2E.

## Funcionalidad

- Listas y artículos con validación, renombrado y deshacer al borrar.
- Compra con progreso, recuperación tras cerrar la app, añadir artículos y cancelar.
- Cierre con confirmación explícita, también con 0 artículos marcados; el supermercado ya no se pregunta.
- Historial agrupado por mes, detalle de solo lectura y eliminación con confirmación.
- Modo opcional “Con La Sirena”: búsqueda automática, marcas y presentaciones con imagen, filtros y orden locales, precio por libra/litro/unidad y total de la compra.
- Tema claro/oscuro con toggle persistente en el header de las tabs; sin preferencia guardada se sigue el esquema del sistema.
- Accesibilidad: roles, etiquetas y estados; objetivos táctiles de 48 dp; el color nunca es la única señal.

## Stack

- Expo SDK 58 (React Native 0.88, React 19.3)
- TypeScript estricto
- SQLite local con `expo-sqlite`
- Expo Router
- EAS Build para generar el APK
- Backend propio en Vercel como proxy del catálogo de La Sirena

## Estructura

- `app/`: rutas, layouts y pantallas de Expo Router.
- `api/`: backend de Vercel que normaliza la búsqueda y consulta el catálogo de La Sirena.
- `src/infrastructure/`: todo el acceso a SQLite, migraciones, repositorios, adaptadores y cliente del catálogo. Tiene su propio [README](src/infrastructure/README.md).
- `src/domain/`: tipos y reglas de negocio puras, sin React ni SQL.
- `src/useCases/`: operaciones que orquestan dominio e infraestructura.
- `src/features/`: hooks de estado de pantalla.
- `src/components/`: componentes visuales reutilizables.
- `src/theme/`: tokens claro/oscuro, `ThemeProvider` y hooks `useTheme()`/`useThemedStyles()`.
- `src/strings/`: todos los textos visibles en español.
- `tests/`: pruebas unitarias, de integración y de componente.

## Verificación

```bash
npx tsc --noEmit
npm run lint
npm test
npx expo export --platform android
```

Estado verificado: TypeScript y lint correctos, **37 suites / 274 pruebas en verde** y export de Android correcto. APK `preview` más reciente en EAS: build `b0fff7ad-50ef-4ae2-81bd-c2f964da0a54`, versionCode 6.

## Documentación

- [Índice de documentación](docs/README.md)
- [Producto y alcance](docs/01-producto-y-alcance.md)
- [Arquitectura](docs/02-arquitectura.md)
- [Modelo de datos](docs/03-modelo-de-datos.md)
- [Navegación y UX/UI](docs/04-navegacion-y-ux.md)
- [Pruebas y entrega del APK](docs/05-pruebas-y-entrega.md)
- [Agentes y proceso de decisión](docs/06-agentes-y-proceso.md)
- [Decisiones y registro](docs/07-decisiones-abiertas.md)

## Decisiones clave

- Una lista completada **es** la compra del historial; no se duplica en otra tabla.
- SQLite es la única fuente de verdad; no hay nube, login ni sincronización de datos.
- Todas las operaciones de base de datos pasan por una cola serial y las escrituras usan transacciones explícitas.
- Una sola compra activa a la vez, garantizada por un índice único parcial.
- El historial guarda fecha y hora local del momento de finalizar, además de UTC para ordenar.
- El supermercado es opcional: las compras nuevas guardan `NULL` y las antiguas conservan su valor.
- El catálogo de La Sirena es solo lectura y nunca participa en una transacción local; si falla, la compra continúa a mano.
- El tema se elige con un toggle persistente en `expo-sqlite/kv-store`; sin elección previa se sigue el esquema del sistema.
- Verde y blanco en claro, azul muy oscuro en oscuro; español y Android vertical.

## Siguiente paso

Instalar el APK `preview` en un dispositivo físico, ejecutar los flujos E2E de Maestro y completar el checklist manual de [pruebas y entrega](docs/05-pruebas-y-entrega.md), incluidas la sección 6.5 (catálogo con y sin red) y la 6.6 (tema claro y oscuro).
