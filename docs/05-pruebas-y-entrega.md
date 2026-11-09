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
| Backend | Jest | Normalización de consulta, filtro de familia, precios VTEX, imágenes y ausencia de corte artificial. |
| E2E | Maestro | Flujo completo y recuperación sobre el APK. |
| Manual | Dispositivo Android | Accesibilidad, rendimiento, offline, instalación, errores. |

## 2. Pruebas unitarias

- Validación de nombres de lista (1–80 tras `trim`) y de artículo (1–100).
- Transiciones de estado permitidas y prohibidas.
- `canStartShopping`: al menos un artículo, sin otra compra activa.
- `canFinish`: 0 marcados y lista completada (sin supermercado).
- Cálculo de progreso: total, marcados, porcentaje, texto “7 de 12”.
- Formato de fecha:
  - fila “27 oct 2026 · 18:42”;
  - detalle “martes, 27 de octubre de 2026, 18:42”;
  - grupo “octubre 2026”.
- Formateo con fechas fijas; sin depender del ICU del sistema.
- Orden de artículos por `sort_order`.
- Reglas de “no borrar el último artículo en compra”.
- Mensajes de error por código.
- Dinero en céntimos:
  - parseo de `1`, `1,5` y `1.234,56`;
  - rechazo de negativos, más de dos decimales y cantidades fuera de rango;
  - formato `RD$0.00` y subtotal con un solo redondeo.
- Cantidades en milésimas:
  - unidades `unit`, `pound`, `kilogram`, `liter`;
  - hasta tres decimales y rango válido;
  - formato sin ceros sobrantes.
- Detalle de línea:
  - validación todo o nada;
  - marca opcional de hasta 60;
  - precio obligatorio y positivo;
  - id de catálogo opcional de hasta 40.
- Total de compra: exacto, parcial, `null` sin precios y `0` válido.
- Confirmación de cierre (`src/features/listas/finishConfirmation.ts`): siempre pregunta; avisa cuántos quedan sin comprar y refuerza el aviso con 0 marcados.
- Consulta de catálogo: longitud, palabras, stopwords, unidades, cantidades y caracteres inválidos.
- Filtro de backend (`api/_catalogCore.ts`):
  - `commertialOffer`, no `commercialOffer`;
  - `pan` no devuelve `panela`;
  - plurales y acentos en ambos sentidos (`sardina`/`sardinas`, `plátano`/`platano`);
  - variantes en singular cuando el plural no devuelve nada (`platanos` → `platano`, `panes` → `pan`);
  - `1 sardina` se normaliza a `sardinas` y `2 kg de arroz` a `arroz`;
  - todas las presentaciones de la familia, sin corte artificial;
  - `imageUrl` HTTPS y `null` si falta o no es válida;
  - deduplicación y precios inválidos.
- Cliente del catálogo: conserva todos los resultados, envía la consulta sin límite y descarta imágenes que no sean HTTPS.
- Medida y precio por medida (`src/domain/catalogMeasure.ts`):
  - interpreta gramos, kilos, libras, onzas, mililitros, litros, galones y unidades;
  - elige la última medida del texto y no confunde `kg` con `g` ni `lt` con `l`;
  - convierte el precio a libra, litro o unidad con un solo redondeo;
  - devuelve `null` sin medida reconocible o con precio o cantidad inválidos.
- Filtros y orden (`src/domain/catalogResults.ts`):
  - filtra por texto sin distinguir mayúsculas ni acentos sobre marca, nombre y presentación;
  - combina texto y marca;
  - ordena por precio y por precio por medida;
  - agrupa por libra, litro y unidad y deja al final las presentaciones sin medida;
  - recoge las marcas por frecuencia.

## 3. Pruebas de integración con `node:sqlite`

Se usa una base de datos temporal en archivo, no `:memory:`, para probar WAL y la cascada. El adaptador envuelve `DatabaseSync` en promesas; las filas de prototipo nulo se copian a objetos normales; `run` normaliza `changes` y `lastInsertRowid`.

### 3.1 Esquema y restricciones

- Crear la BD v3 desde cero.
- `foreign_keys=1` y `journal_mode=wal` verificados.
- `CHECK` de estado, longitudes y cierre de lista.
- `CHECK` de `shopping_mode` y `total_cents` por estado.
- `CHECK` de detalle de línea todo o nada y subtotal consistente.
- `CHECK` de `is_checked`/`checked_at`.
- `sort_order > 0` y único por lista.
- FK con cascada al borrar lista.
- Índice único de una sola compra `shopping`.
- `user_version=3` al terminar.

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
- `user_version=4`: `SCHEMA_TOO_NEW`, sin borrar datos.
- `user_version=0` con tablas: `UNKNOWN_SCHEMA`.

### 3.3 Casos de uso

- Crear/renombrar/borrar lista.
- Añadir/renombrar/borrar artículo.
- Iniciar compra con 0 artículos → error.
- Iniciar compra con otra activa → `ACTIVE_SHOPPING_EXISTS`.
- Marcar/desmarcar; consistencia de `checked_at`.
- Marcar/desmarcar con estado absoluto; doble check no invierte el resultado.
- Marcar en `draft` → `INVALID_STATE`.
- Marcar/desmarcar/borrar/undo en `completed` → `LIST_COMPLETED`.
- Añadir artículo durante la compra; se coloca al final.
- Recuperar estado `shopping` y checks tras cerrar y reabrir la base.
- Borrar el último artículo en `shopping` → `LAST_ITEM_IN_SHOPPING`.
- Cancelar compra: desmarca todos y vuelve a `draft`.
- Finalizar:
  - con ≥1 marcado y `supermarket_name = NULL`;
  - con 0 marcados sin confirmar → `NO_CHECKED`;
  - con 0 marcados confirmado;
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
  - detalle con comprados/no comprados;
  - el resumen usa el nombre de la lista cuando no hay supermercado.
- Compra con catálogo:
  - empezar fija `shopping_mode='catalog'`;
  - marcar con detalle guarda subtotal y total;
  - editar y quitar datos sin desmarcar;
  - desmarcar borra el detalle;
  - cancelar limpia checks, detalle, modo y total;
  - finalizar guarda `total_cents` exacto, parcial o `NULL`;
  - rechazar detalle en compra `normal`;
  - restaurar con `Undo` conserva el detalle.
- `getItemForDetail` devuelve artículo y lista juntos; si no existe → `NOT_FOUND`.

### 3.4 Migraciones

- v1 idempotente.
- Fallo inyectado en una migración de prueba: rollback y `user_version` intacto.
- Fixture de versión superior: bloqueo.
- Fixture con tablas y versión 0: `UNKNOWN_SCHEMA`.
- Migración 002 sobre datos v1:
  - conserva listas y artículos;
  - asigna `normal` a compras `shopping`/`completed`;
  - deja `shopping_mode = NULL` en borradores;
  - deja detalle y total nulos;
  - verifica conteos y `foreign_key_check` antes de confirmar.
- Migración 003 sobre datos v2:
  - conserva listas y artículos y mantiene el supermercado antiguo;
  - permite cerrar una compra nueva con `supermarket_name = NULL`;
  - verifica conteos, `foreign_key_check` y la FK de `items` antes de confirmar.

## 4. Pruebas de componentes (RNTL)

- `ShoppingItemRow`:
  - rol checkbox;
  - estado `checked`;
  - etiqueta “Leche, comprado/no comprado”;
  - acción de toque y bloqueo mientras hay una escritura pendiente;
  - en modo `catalog`: rol botón, abre el detalle y no marca;
  - muestra “Bimbo · 1.5 Libra · RD$3.00”.
- `ItemDetailForm`:
  - pinta las marcas ya buscadas sin escribir, con imagen y placeholder;
  - vuelve al placeholder si la imagen falla;
  - virtualiza familias grandes: no monta cientos de filas a la vez;
  - elegir presentación rellena marca, cantidad y precio;
  - muestra el precio por medida y lo incluye en la etiqueta accesible;
  - filtra por texto y por marca sin pedir otra búsqueda;
  - ordena por precio y por mejor precio por medida;
  - avisa cuando ningún resultado coincide y “Limpiar filtros” los restablece;
  - guardar envía el detalle validado;
  - errores por campo bloquean el envío;
  - el buscador no consulta mientras se escribe;
  - “Sin conexión” deja el formulario manual y “Reintentar”.
- `PurchaseTotalRow`: total exacto, parcial, sin precios y chip “Con La Sirena”.
- `useItemDetail`:
  - búsqueda automática única con el nombre del artículo;
  - no repite al enfocar;
  - no busca si ya hay detalle;
  - fallo de red no bloquea;
  - marcar/actualizar/quitar/omitir llaman al caso de uso correcto.
- `ProgressBar`: rol progressbar y valor accesible.
- `AddItemBar`: validación inline y envío del nombre recortado.
- `TextField`: etiqueta visible, error anunciado, foco y ref al `TextInput`.
- `PrimaryButton`: deshabilitado, estado de carga, etiqueta.
- `Snackbar`: “Deshacer” y expiración.
- Guardas de ruta con router simulado:
  - estado incorrecto → `replace`;
  - id inexistente → `+not-found`.
- Cierre de compra desde el modo compra:
  - siempre pide confirmación, también con artículos marcados;
  - con 0 marcados refuerza el aviso;
  - `isFinishing` bloquea el botón;
  - doble toque no lanza dos cierres.
- Historial: agrupación y fila con fecha completa y fallback al nombre de la lista.

RNTL no mide layout nativo. Los objetivos de 48 dp, la escala al 200 % y TalkBack se verifican en el checklist manual.

### 4.1 Pruebas del backend

Las reglas puras de `api/_catalogCore.ts` se prueban con Jest sin levantar Vercel:

- `normalizeQuery`: quita cantidades, números sueltos, stopwords y unidades; pluraliza el sustantivo que sigue a un conteo; pliega tildes; rechaza vacío, una letra, más de cinco palabras y caracteres de control.
- `singularQueryVariants`: genera el singular quitando `-s` o deshaciendo `-es` (`panes` → `pan`), sin variantes si la palabra no acaba en `s`.
- `readTotalFromResources`: lee el total de `resources: 0-49/297` y devuelve `null` si la cabecera falta o está rota.
- `toCatalogResults`:
  - lee `seller.commertialOffer.Price`;
  - ignora `commercialOffer`;
  - convierte a céntimos con redondeo;
  - exige que el primer término aparezca como palabra del nombre, marca o categoría;
  - puntúa los términos restantes y ordena;
  - deduplica, descarta precios `0`, negativos o absurdos;
  - devuelve **todas** las presentaciones de la familia, sin corte;
  - extrae `items[0].images[0].imageUrl` solo si es HTTPS;
  - devuelve `[]` si la respuesta no es un arreglo.

El handler `api/catalog.ts` no se prueba con red real en CI: la verificación del endpoint desplegado es manual (sección 6.5).

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
9. Finalizar compra (sin supermercado) y aceptar la confirmación.
10. Verificar historial: fecha, hora, nombre de la lista, “2 de 3 comprados”.
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
9. Finalizar compra y aceptar la confirmación.
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
- [ ] Fixture `user_version=4`: pantalla de versión incompatible, sin borrar.
- [ ] Deep links a estados incorrectos: redirección segura.
- [ ] Borrar artículo y deshacer dentro de 5 s.
- [ ] Finalizar con y sin marcados: siempre pide confirmación; con 0 refuerza el aviso.
- [ ] Cancelar compra: desmarca y vuelve a borrador.

### 6.5 Catálogo con y sin red

**Endpoint desplegado** (`https://listapp-rose.vercel.app/api/catalog`):

- [ ] `?q=pan` devuelve solo panes: ni `panela`, ni el catálogo completo; aparecen todos los panes de la familia, no solo 8.
- [ ] `?q=leche` devuelve leches; `?q=2%20kg%20de%20arroz` normaliza la cantidad.
- [ ] `?q=1%20sardina` devuelve sardinas (la consulta se normaliza a `sardinas`), no cero.
- [ ] `?q=pl%C3%A1tano` y `?q=platano` devuelven la misma familia; `?q=platanos` no devuelve cero porque reintenta en singular.
- [ ] `?q=panes` no devuelve cero porque reintenta con `pan`.
- [ ] `?q=queso` devuelve las 297 presentaciones de la familia repartidas en todas las páginas de VTEX.
- [ ] Cada resultado trae `imageUrl` HTTPS de La Sirena; si falta, la app muestra el placeholder.
- [ ] Sin `q` o con una sola letra → `400 invalid_query`.
- [ ] `POST` → `405 method_not_allowed`.
- [ ] Respuesta con `{ query, results }`, `priceCents` entero e `imageUrl`.
- [ ] `SIRENA_API_BASE_URL` configurada en Vercel; el APK no contiene esa URL.

**En el dispositivo:**

- [ ] Compra normal: marcar y desmarcar con un toque, sin chip, sin total y sin modal.
- [ ] Compra normal: el flujo es idéntico al de la versión anterior.
- [ ] “Con La Sirena”: al abrir un artículo, las marcas aparecen solas, sin escribir, y cada una muestra su imagen.
- [ ] Un artículo llamado “1 sardina” busca “sardinas” y muestra varias presentaciones, no cero.
- [ ] Un artículo llamado “plátanos” encuentra presentaciones de plátano aunque se escriba sin tilde o en plural.
- [ ] Al escribir en los campos del pie del detalle de línea (búsqueda, marca, cantidad, precio), el teclado no tapa el campo enfocado.
- [ ] “Queso” muestra todas las presentaciones de la familia, sin quedarse en 8, y el modal abre y desplaza con fluidez aunque haya cientos.
- [ ] Con una familia larga, el contador dice cuántas presentaciones hay y filtrar por texto o marca reduce la lista al instante, sin volver a cargar.
- [ ] Ordenar por menor precio, mayor precio y mejor precio por medida cambia el orden de forma visible; las presentaciones sin medida quedan al final.
- [ ] Una presentación de `500 g` o `2 L` muestra su precio por libra o litro; una sin tamaño no muestra una cifra inventada.
- [ ] Limpiar filtros devuelve todas las presentaciones y cambia la consulta reinicia filtros y orden.
- [ ] Elegir una presentación rellena marca, precio y cantidad; se puede ajustar cantidad y unidad.
- [ ] Guardar deja la fila con marca, cantidad, subtotal y check; el total de la compra se actualiza.
- [ ] Omitir marca sin precio; el total pasa a parcial o “Aún no hay precios”.
- [ ] Quitar datos mantiene el artículo marcado y baja el total.
- [ ] Quitar de la compra desmarca y borra el detalle.
- [ ] Atrás en el modal pide confirmación; Guardar/Omitir/Quitar cierran sin preguntar.
- [ ] Cierre muestra chip y total; el detalle histórico y el historial muestran el total guardado.
- [ ] Modo avión: el detalle explica “Sin conexión” y permite completar a mano.
- [ ] Servidor caído o lento: aviso y “Reintentar”; el marcado nunca se bloquea.
- [ ] Volver a abrir un artículo ya valorado no repite la búsqueda ni pisa sus datos.
- [ ] Cambiar de modo a mitad de compra no es posible; cancelar vuelve a borrador y limpia modo, detalle y total.

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

El repositorio está inicializado y conectado a GitHub (`JuanReyesVazquez23/Listapp`).

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
| `env.EXPO_PUBLIC_CATALOG_API_URL` | `https://listapp-rose.vercel.app/api/catalog`; se incrusta al compilar. |

### 9.4 Pasos

1. `npx expo-doctor`.
2. `npx expo install --check`.
3. `npx tsc --noEmit`, `npm run lint`, `npm test`.
4. `eas login`.
5. `eas build:configure`.
6. Comprobar `EXPO_PUBLIC_CATALOG_API_URL` en el perfil `preview` de `eas.json`.
7. `eas build -p android --profile preview`.
8. Descargar el APK a `C:\Users\jeanx\Downloads\listapp-preview.apk`.
9. `adb install -r listapp-preview.apk`.
10. Smoke test del flujo normal y del flujo con La Sirena.
11. Guardar el keystore y las credenciales.

**Primer build al cerrar M3.** Se compila cuando el flujo principal ya es funcional, para validar cuenta, credenciales, SDK, paquete y entorno sobre una app usable.

### 9.5 Versionado

- `version` semántica: 1.0.0 para el MVP.
- `android.versionCode` incremental en cada build de entrega.
- En `production`, `autoIncrement`; en `preview`, manual.
- Sin OTA; se reinstala el APK.
- Play Store/AAB queda fuera del MVP.

## 10. Roadmap por hitos

| Hito | Contenido | Criterio de salida |
|---|---|---|
| **M0 — Base** | Scaffold Expo 58, TypeScript estricto, Expo Router, tokens, `DatabaseManager`, migración v1. | `boot()` y PRAGMAs verificados; tests de integración en verde; bundle de Android correcto. |
| **M1 — Listas y artículos** | CRUD de listas e ítems, validación, persistencia, estados vacíos, deshacer de 5 s. | AC-01, AC-02, AC-03; tests unitarios, integración y componente. |
| **M2 — Compra** | Empezar, marcar/desmarcar, progreso, añadir, recuperación, cancelar. | AC-04, AC-05, AC-11, AC-20; E2E de recuperación. |
| **M3 — Finalizar e historial** | Cierre directo desde el modo compra, 0 marcados, transacción, historial, detalle, eliminar. **Primer APK `preview`.** | AC-06 a AC-10; E2E principal; APK instalado y probado en dispositivo. |
| **M4 — Diseño y accesibilidad** | Pulido visual, icono/splash, TalkBack, 200 %, reduce motion, hápticos. | AC-13; checklist manual. |
| **M5 — Pruebas y APK final** | E2E, migraciones, rendimiento, instalación limpia, checklist de release. | AC-12, AC-14 a AC-22; APK final. |

**Estado:** M0, M1, M2 y M3 implementados. El cierre de compra es directo desde el modo compra, siempre con confirmación explícita y sin preguntar por el supermercado; las compras nuevas guardan `NULL` y la migración 003 conserva el dato de las antiguas. La compra con La Sirena está implementada sobre la migración 002: modo de compra, detalle de línea, total, proxy Vercel, búsqueda automática, limpieza de cantidades, plegado de tildes y reintento en singular, imágenes por presentación, familia completa sin corte artificial, filtros y orden locales, precio por libra, litro o unidad y resultados virtualizados. El teclado descuenta la altura del header nativo y el detalle de línea desplaza el campo enfocado; el panel de diagnóstico de base de datos se eliminó. Verificación local: `npx tsc --noEmit`, `npm run lint`, 35 suites / 267 pruebas en verde y `npx expo export --platform android` correcto. Backend de producción desplegado y verificado con `plátano`/`platano` (7 resultados), `platanos` (7) y `panes` (37). APK `preview` más reciente: build `b0fff7ad-50ef-4ae2-81bd-c2f964da0a54` (versionCode 6), disponible en EAS; no se descarga en la carpeta local. Queda pendiente de entrega: instalar el APK en un dispositivo físico, ejecutar los flujos E2E de Maestro y el checklist manual, incluida la sección 6.5.

## 11. Definición de terminado (MVP)

- Todos los AC-01 a AC-22 verificados o marcados como manuales realizados.
- `npx tsc --noEmit`, lint y tests en verde.
- APK `preview` instalado en un dispositivo físico.
- Flujo completo sin red; el catálogo solo añade una ayuda opcional.
- Recuperación tras cerrar la app.
- Historial con fecha, hora, nombre de la compra y total de catálogo.
- Compra normal idéntica a la versión anterior.
- Catálogo con La Sirena: búsqueda automática, todas las presentaciones de la familia con imagen y fallback manual.
- TalkBack y texto al 200 % sin bloqueos.
- Sin pérdida de datos en rollback, cierre forzado o migración fallida.
- Documentación de decisiones y riesgos actualizada.

## 12. Riesgos de entrega

| Riesgo | Mitigación |
|---|---|
| Cuenta EAS confirmada, pero el primer build y el keystore aún no se han probado. | Verificar al cerrar M3, antes de entregar el APK. |
| Paquete Android sin confirmar. | Confirmado: `com.jeanx.listapp`. |
| Maestro no funciona en Windows nativo. | WSL2 o E2E manual; documentar. |
| `expo-sqlite` con transacciones manuales no se comporta como se espera. | Contrato validado con `node:sqlite`; smoke test en el primer APK (M3); si falla, reconsiderar antes de la entrega. |
| Pérdida de datos al desinstalar. | Aviso; export JSON en v1.1. |
| Historial sin paginación. | `SectionList`; v1.1 si el volumen lo exige. |
| Reloj del dispositivo incorrecto. | Documentado; no hay servidor. |
| La API de La Sirena cambia o bloquea el proxy. | Fallback manual; timeout; verificar el endpoint antes de cada entrega. |
| El APK se compila sin `EXPO_PUBLIC_CATALOG_API_URL`. | Comprobar `eas.json` antes del build; si falta, el detalle muestra error de catálogo pero sigue permitiendo el marcado manual. |
