# 05 — Pruebas y entrega

## 1. Estrategia

La app tiene pocas pantallas, pero mucha responsabilidad sobre los datos. La estrategia prioriza:

1. **Dominio puro** con pruebas rápidas y deterministas.
2. **SQL real** con un adaptador `node:sqlite`, no mocks de la base de datos.
3. **Componentes accesibles** con React Native Testing Library.
4. **Dos flujos E2E** sobre el APK, incluida la recuperación tras cerrar la app.
5. **Checklist manual** para lo que depende del dispositivo: TalkBack, escala de texto, rendimiento, instalación.

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitarias | Jest | Reglas, validadores, progreso, fechas, transiciones. |
| Integración | Jest + `node:sqlite` | Esquema, restricciones, cascada, transacciones, migraciones, consultas. |
| Componentes | Jest + RNTL | Checkbox, progreso, formularios, snackbar, botones, guardas. |
| E2E | Maestro | Flujo completo y recuperación sobre el APK. |
| Manual | Dispositivo Android | Accesibilidad, rendimiento, offline, instalación, errores. |

## 2. Pruebas unitarias

- Validación de nombres de lista (1–80 tras `trim`) y de artículo (1–100).
- Validación de supermercado (1–80).
- Transiciones de estado permitidas y prohibidas.
- `canStartShopping`: al menos un artículo, sin otra compra activa.
- `canFinish`: supermercado, 0 marcados, lista completada.
- Cálculo de progreso: total, marcados, porcentaje, texto “7 de 12”.
- Formato de fecha:
  - fila “27 oct 2026 · 18:42”;
  - detalle “martes, 27 de octubre de 2026, 18:42”;
  - grupo “octubre 2026”.
- Formateo con fechas fijas; sin depender del ICU del sistema.
- Orden de artículos por `sort_order`.
- Reglas de “no borrar el último artículo en compra”.
- Mensajes de error por código.

## 3. Pruebas de integración con `node:sqlite`

Se usa una base de datos temporal en archivo, no `:memory:`, para probar WAL y la cascada. El adaptador envuelve `DatabaseSync` en promesas; las filas de prototipo nulo se copian a objetos normales; `run` normaliza `changes` y `lastInsertRowid`.

### 3.1 Esquema y restricciones

- Crear la BD v1 desde cero.
- `foreign_keys=1` y `journal_mode=wal` verificados.
- `CHECK` de estado, longitudes y cierre de lista.
- `CHECK` de `is_checked`/`checked_at`.
- `sort_order > 0` y único por lista.
- FK con cascada al borrar lista.
- Índice único de una sola compra `shopping`.
- `user_version=1` al terminar.

### 3.2 Transacciones y recuperación

- Rollback con excepción: no queda ninguna fila escrita.
- Cascada dentro de una transacción.
- `COMMIT` correcto.
- Fallo de `COMMIT` simulado:
  - si la sonda pasa, se propaga `DB_WRITE_FAILED` y la conexión sigue usable;
  - si la sonda falla, se marca `DB_BROKEN` y no se reutiliza.
- `ROLLBACK` fallido no se silencia.
- La cola sigue viva después de un error.
- `boot()` single-flight: dos llamadas concurrentes comparten promesa.
- Boot fallido y reintento: se cierra la conexión y se repite.
- `user_version=2`: `SCHEMA_TOO_NEW`, sin borrar datos.
- `user_version=0` con tablas: `UNKNOWN_SCHEMA`.

### 3.3 Casos de uso

- Crear/renombrar/borrar lista.
- Añadir/renombrar/borrar artículo.
- Iniciar compra con 0 artículos → error.
- Iniciar compra con otra activa → `ACTIVE_SHOPPING_EXISTS`.
- Marcar/desmarcar; consistencia de `checked_at`.
- Marcar en `draft` → `INVALID_STATE`.
- Marcar/desmarcar/borrar/undo en `completed` → `LIST_COMPLETED`.
- Borrar el último artículo en `shopping` → `LAST_ITEM_IN_SHOPPING`.
- Cancelar compra: desmarca todos y vuelve a `draft`.
- Finalizar:
  - con ≥1 marcado;
  - con 0 marcados sin confirmar → `NO_CHECKED`;
  - con 0 marcados confirmado;
  - sin supermercado → `VALIDATION`;
  - doble finalización → idempotente;
  - lista borrada → `NOT_FOUND`;
  - lista en `draft` → `INVALID_STATE`.
- Undo:
  - restaura posición si está libre;
  - si está ocupada, añade al final;
  - si la compra se finalizó, falla sin escribir.
- Historial:
  - orden descendente;
  - agrupación por mes;
  - 300 filas sin problema;
  - detalle con comprados/no comprados.
- Sugerencias de supermercado: últimas 8, sin duplicados por mayúsculas.

### 3.4 Migraciones

- v1 idempotente.
- Fallo inyectado en una migración de prueba: rollback y `user_version` intacto.
- Fixture de versión superior: bloqueo.
- Fixture con tablas y versión 0: `UNKNOWN_SCHEMA`.

## 4. Pruebas de componentes (RNTL)

- `CheckboxRow`:
  - rol checkbox;
  - estado `checked`;
  - etiqueta “Leche, comprado/no comprado”;
  - acción de toque.
- `ProgressBar`: rol progressbar y valor accesible.
- `TextField`: etiqueta visible, error anunciado, foco.
- `PrimaryButton`: deshabilitado, estado de carga, etiqueta.
- `Snackbar`: “Deshacer” y expiración.
- `SupermarketInput`: chips rellenan el campo.
- Guardas de ruta con router simulado:
  - estado incorrecto → `replace`;
  - id inexistente → `+not-found`.
- Pantalla de finalización:
  - botón deshabilitado sin supermercado;
  - confirmación con 0 marcados;
  - `isFinishing` bloquea el botón.
- Historial: agrupación y fila con fecha completa.

RNTL no mide layout nativo. Los objetivos de 48 dp, la escala al 200 % y TalkBack se verifican en el checklist manual.

## 5. Pruebas E2E con Maestro

Se usan dos flujos. Los textos de entrada son ASCII para evitar el límite de `inputText` de Maestro en Android.

### 5.1 Flujo principal

`e2e/01-flujo-principal.yaml`

1. `launchApp` con `clearState: true`.
2. Crear lista “Compra semanal”.
3. Añadir “Leche”, “Pan”, “Huevos”.
4. Renombrar “Pan” a “Pan integral”.
5. Eliminar “Huevos” y comprobar “Deshacer”.
6. Empezar compra.
7. Marcar “Leche” y “Pan integral”.
8. Verificar “2 de 3”.
9. Finalizar con supermercado “Mercadona”.
10. Verificar historial: fecha, hora, supermercado, “2 de 3 comprados”.
11. Abrir detalle: “Huevos” en “Sin comprar”.
12. Eliminar la compra y verificar que desaparece.

### 5.2 Flujo de recuperación

`e2e/02-recuperacion.yaml`

1. `launchApp` con `clearState: true`.
2. Crear lista y añadir “Leche”, “Pan”.
3. Empezar compra.
4. Marcar “Leche”.
5. `killApp`.
6. `launchApp` con `clearState: false`.
7. Verificar “Continuar compra”.
8. Abrir y comprobar que “Leche” sigue marcada y “Pan” no.
9. Finalizar con “Mercadona”.
10. Verificar el historial.

### 5.3 Entorno E2E

- Maestro CLI con JDK 17+.
- `platform-tools` (`adb`) y un dispositivo físico Android 13+ o emulador API 34.
- APK `preview` release instalado.
- Si Maestro no funciona en Windows nativo, usar WSL2 con el dispositivo conectado por `adb`.
- `clearState` explícito en cada flujo: `true` al inicio, `false` en recuperación.
- No se siembran 51 compras: la paginación no está en el MVP.

## 6. Checklist manual

### 6.1 Instalación y arranque

- [ ] Instalar el APK `preview` en un dispositivo físico.
- [ ] Abrir sin crash.
- [ ] Completar el flujo entero.
- [ ] Desinstalar y volver a instalar: la app arranca limpia.
- [ ] Actualizar sobre la versión anterior sin perder datos.

### 6.2 Rendimiento

- [ ] Mediana de 5 arranques en frío ≤2 s con `adb shell am start -W`.
- [ ] Lista de 200 artículos con scroll fluido.
- [ ] Mediana de 20 checks: toque→commit ≤50 ms y toque→fila ≤100 ms.
- [ ] Instrumentación `performance.now()` + logcat con etiqueta `listapp-perf` en build interno.
- [ ] Sin tirones al abrir/cerrar el teclado.

### 6.3 Accesibilidad

- [ ] TalkBack recorre todos los controles.
- [ ] Anuncia “comprado/no comprado” y el progreso.
- [ ] Texto al 200 % sin recortes.
- [ ] Objetivos ≥48 dp.
- [ ] “Reducir movimiento” respetado.
- [ ] Errores no dependen solo del color.
- [ ] Confirmaciones destructivas accesibles.

### 6.4 Datos y errores

- [ ] Modo avión: flujo completo.
- [ ] Cerrar la app a mitad de compra y continuar.
- [ ] Force-stop durante una escritura: al reabrir, estado `shopping` o `completed`, nunca parcial.
- [ ] Provocar un error de migración en un build de prueba: rollback, sin pérdida.
- [ ] Fixture `user_version=2`: pantalla de versión incompatible, sin borrar.
- [ ] Deep links a estados incorrectos: redirección segura.
- [ ] Borrar artículo y deshacer dentro de 5 s.
- [ ] Finalizar con 0 marcados: confirmación.
- [ ] Cancelar compra: desmarca y vuelve a borrador.

## 7. Node y reproducibilidad

- Node **24.22.1** fijado en `.nvmrc` y `engines` (`>=24.22.1 <25`).
- `node:sqlite` verificado en esa versión: exporta `DatabaseSync`; `Database` no existe. Se usa `DatabaseSync`.
- `npm test` preflight:
  - comprueba la versión de Node;
  - comprueba que `DatabaseSync` es una función;
  - falla con un mensaje claro si no.
- El adaptador de test envuelve `DatabaseSync` en promesas.
- El adaptador que simula un `COMMIT` lento usa una espera inyectada y explícita, no un temporal implícito.

## 8. CI

Opcional en el MVP, recomendada cuando el directorio sea un repo git:

- GitHub Actions con Node 24.
- `npm ci`.
- `npx tsc --noEmit`.
- `npm run lint`.
- `npm test`.
- `npx expo-doctor`.
- E2E Maestro en emulador como job nocturno o manual por coste.
- EAS Build manual o en tag.

El repo aún no es git; inicializarlo antes de M0.

## 9. Compilación del APK

### 9.1 Prerrequisitos

- Cuenta de Expo/EAS y `eas login`.
- Node 24.22.1.
- JDK 17+ para Maestro; no se usa para compilar si se usa EAS.
- `platform-tools` (`adb`) y dispositivo Android.
- Paquete Android confirmado.
- Keystore gestionado por EAS; guardar credenciales.

### 9.2 Configuración de app

| Clave | Valor |
|---|---|
| `name` | Listapp |
| `slug` | listapp |
| `scheme` | listapp |
| `version` | 1.0.0 |
| `android.package` | `com.jeanx.listapp` (confirmado; D-01) |
| `android.versionCode` | 1 |
| `orientation` | `portrait` |
| `userInterfaceStyle` | `light` |
| `android.allowBackup` | `false` |
| `plugins` | `expo-router`, `expo-splash-screen` |
| `experiments.typedRoutes` | `true` |
| Icono/splash | Verde con símbolo blanco; adaptativo y monocromo. |

### 9.3 Perfil `preview`

| Clave | Valor |
|---|---|
| `distribution` | `internal` |
| `android.buildType` | `apk` |
| `developmentClient` | `false` |
| `channel` | No se usa OTA. |

### 9.4 Pasos

1. `npx expo-doctor`.
2. `npx expo install --check`.
3. `eas login`.
4. `eas build:configure`.
5. `eas build -p android --profile preview`.
6. Descargar el APK.
7. `adb install -r listapp.apk`.
8. Smoke test del flujo completo.
9. Guardar el keystore y las credenciales.

**Primer build en M0.** No se espera al final: valida cuenta, credenciales, SDK, paquete y entorno antes de que haya funcionalidad que perder.

### 9.5 Versionado

- `version` semántica: 1.0.0 para el MVP.
- `android.versionCode` incremental en cada build de entrega.
- En `production`, `autoIncrement`; en `preview`, manual.
- Sin OTA; se reinstala el APK.
- Play Store/AAB queda fuera del MVP.

## 10. Roadmap por hitos

| Hito | Contenido | Criterio de salida |
|---|---|---|
| **M0 — Base y APK** | Scaffold Expo 58, TypeScript estricto, Expo Router, tokens, `DatabaseManager`, migración v1, EAS `preview`, primer APK. | El APK instala, abre y muestra una pantalla vacía; `boot()` y PRAGMAs verificados; build reproducible. |
| **M1 — Listas y artículos** | CRUD de listas e ítems, validación, persistencia, estados vacíos. | AC-01, AC-02, AC-03; tests unitarios/integración/componente. |
| **M2 — Compra** | Empezar, marcar/desmarcar, progreso, añadir, recuperación, cancelar. | AC-04, AC-05, AC-11, AC-20; E2E de recuperación. |
| **M3 — Finalizar e historial** | Modal, supermercado, 0 marcados, transacción, historial, detalle, eliminar. | AC-06 a AC-10; E2E principal. |
| **M4 — Diseño y accesibilidad** | Pulido visual, icono/splash, TalkBack, 200 %, reduce motion, hápticos. | AC-13; checklist manual. |
| **M5 — Pruebas y APK final** | E2E, migraciones, rendimiento, instalación limpia, checklist de release. | AC-12, AC-14 a AC-22; APK final. |

## 11. Definición de terminado (MVP)

- Todos los AC-01 a AC-22 verificados o marcados como manuales realizados.
- `npx tsc --noEmit`, lint y tests en verde.
- APK `preview` instalado en un dispositivo físico.
- Flujo completo offline.
- Recuperación tras cerrar la app.
- Historial con fecha, hora y supermercado.
- TalkBack y texto al 200 % sin bloqueos.
- Sin pérdida de datos en rollback, cierre forzado o migración fallida.
- Documentación de decisiones y riesgos actualizada.

## 12. Riesgos de entrega

| Riesgo | Mitigación |
|---|---|
| Cuenta EAS confirmada, pero el primer build y el keystore aún no se han probado. | Verificar en M0 antes de implementar. |
| Paquete Android sin confirmar. | Confirmar en `07-decisiones-abiertas.md`. |
| Maestro no funciona en Windows nativo. | WSL2 o E2E manual; documentar. |
| `expo-sqlite` con transacciones manuales no se comporta como se espera. | Smoke test en M0; si falla, reconsiderar el contrato antes de escribir la app. |
| Pérdida de datos al desinstalar. | Aviso; export JSON en v1.1. |
| Historial sin paginación. | `SectionList`; v1.1 si el volumen lo exige. |
| Reloj del dispositivo incorrecto. | Documentado; no hay servidor. |
