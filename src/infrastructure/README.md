# Infraestructura

Esta carpeta contiene **todo el código que habla con el almacenamiento local**. Es la única parte de `src` que conoce SQLite, las migraciones, la cola serial y la implementación de Expo.

## Qué contiene

| Archivo / carpeta | Responsabilidad |
|---|---|
| `database.ts` | Instancia única de `DatabaseManager` para la app. |
| `databaseManager.ts` | `boot`, `read`, `mutate`, `close`, PRAGMAs, recuperación y estado. |
| `serialQueue.ts` | Cola que serializa todas las operaciones de base de datos. |
| `sqlDatabase.ts` | Puerto `SqlDatabase`, `SqlReader` y `Tx`; no depende de Expo. |
| `expoSqliteAdapter.ts` | Implementación de producción con `expo-sqlite`. |
| `migrations/` | Migraciones forward-only y versión de esquema. |
| `repositories/` | Consultas SQL y mapeo de filas a tipos de dominio. |
| `diagnostics.ts` | Comprobación de humo de PRAGMAs, escritura y rollback. |

## Qué no debe entrar aquí

- Componentes, pantallas o hooks de React.
- Reglas de negocio puras: viven en `src/domain`.
- Textos visibles: viven en `src/strings`.
- Tokens de diseño: viven en `src/theme`.

## Regla de imports

- `src/domain` **no** importa de esta carpeta.
- `src/useCases`, `src/features` y los tests pueden importar de `src/infrastructure`.
- `app/` y `src/components` no deben importar SQL ni el `DatabaseManager` directamente; usan casos de uso o hooks.

El alias `@/infrastructure/*` apunta aquí desde cualquier archivo del proyecto.
