# Listapp

App móvil Android para crear listas de compras, marcar artículos durante la compra y guardar cada compra en un historial con fecha, hora y supermercado.

**Estado actual: M0 y M1 completados. Listas y artículos funcionan con persistencia local; el primer APK se generará al cerrar M3.**

## Stack

- Expo SDK 58 (React Native 0.88, React 19.3)
- TypeScript estricto
- SQLite local con `expo-sqlite`
- Expo Router
- EAS Build para generar el APK

## Estructura

- `app/`: rutas, layouts y pantallas de Expo Router.
- `src/infrastructure/`: todo el acceso a SQLite, migraciones, repositorios y adaptadores. Tiene su propio [README](src/infrastructure/README.md).
- `src/domain/`: tipos y reglas de negocio puras, sin React ni SQL.
- `src/useCases/`: operaciones que orquestan dominio e infraestructura.
- `src/features/`: hooks de estado de pantalla.
- `src/components/`: componentes visuales reutilizables.
- `src/theme/` y `src/strings/`: tokens de diseño y textos en español.
- `tests/`: pruebas unitarias, de integración y de componente.

## Documentación

- [Índice de documentación](docs/README.md)
- [Producto y alcance](docs/01-producto-y-alcance.md)
- [Arquitectura](docs/02-arquitectura.md)
- [Modelo de datos](docs/03-modelo-de-datos.md)
- [Navegación y UX/UI](docs/04-navegacion-y-ux.md)
- [Pruebas y entrega del APK](docs/05-pruebas-y-entrega.md)
- [Agentes y proceso de decisión](docs/06-agentes-y-proceso.md)
- [Decisiones pendientes de confirmar](docs/07-decisiones-abiertas.md)

## Decisiones clave

- Una lista completada **es** la compra del historial; no se duplica en otra tabla.
- SQLite es la única fuente de verdad; no hay nube, login ni sincronización.
- Todas las operaciones de base de datos pasan por una cola serial y las escrituras usan transacciones explícitas.
- Una sola compra activa a la vez, garantizada por un índice único.
- El historial guarda fecha y hora local del momento de finalizar, además de UTC para ordenar.
- El supermercado es texto libre con sugerencias de compras anteriores.
- Verde y blanco, tema claro, español, Android vertical.
- El primer APK se genera al final del hito M3, cuando el flujo principal ya es funcional.

## Siguiente paso

Las decisiones bloqueantes están confirmadas: `com.jeanx.listapp`, cuenta personal de EAS con keystore gestionado por EAS, y dispositivo Android 13+ o emulador API 34. M0 y M1 están cerrados. Siguiente paso: hito M2 (empezar compra, marcar y desmarcar artículos, progreso, recuperación y cancelación). El primer APK se compila al terminar M3.
