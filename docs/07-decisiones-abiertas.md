# 07 — Decisiones abiertas

## 1. Cómo leer este documento

La arquitectura está cerrada. Lo que falta son decisiones de producto y de entorno que no puedo tomar por ti sin inventar datos.

Hay tres niveles:

1. **Bloqueantes de identidad y entorno:** sin ellas no se puede generar el primer APK ni identificar la app. No tienen un valor por defecto seguro.
2. **Decisiones con valor propuesto:** ya están aplicadas en la documentación. Si no dices lo contrario, se quedan así.
3. **Fuera del MVP:** no requieren acción; están listadas para que no se confundan con olvidos.

Cada fila indica qué documento habría que cambiar si eliges otra cosa.

## 2. Decisiones bloqueantes (cerradas)

**D-01, D-02 y D-03 confirmadas el 28 de octubre de 2026.** No quedan decisiones bloqueantes. El primer APK se compilará al cerrar M3.

| ID | Decisión | Valor propuesto | Por qué bloquea | Doc |
|---|---|---|---|---|
| **D-01** | Identificador Android (`android.package`) | **Confirmado:** `com.jeanx.listapp`. | Es la identidad permanente de la app. Cambiarlo después del primer APK crea una app distinta: no actualiza la anterior y el usuario pierde los datos al instalarla. | 02, 05 |
| **D-02** | Cuenta de Expo/EAS y keystore | **Confirmado:** cuenta personal creada; se usa EAS con keystore gestionado por EAS. | Sin sesión de EAS no hay build en la nube. El keystore define la firma; si se pierde, no se pueden publicar actualizaciones sobre el mismo paquete. | 02, 05 |
| **D-03** | Dispositivo de prueba | **Confirmado:** Android 13+ o emulador API 34; el modelo exacto se anota al instalar el primer APK. | AC-14 exige un dispositivo declarado; Maestro y `adb` necesitan un destino real. También determina si el mínimo Android 7 es suficiente. | 05 |

### 2.1 Qué necesito exactamente

**D-01:** confirmado: `com.jeanx.listapp`.

**D-02:** confirmado. La cuenta es personal (sin `owner` de organización) y el keystore lo gestiona EAS. Cuando toque compilar, ejecutarás `eas login` tú mismo; no hace falta que me pases la contraseña ni el token.

**D-03:** confirmado: Android 13+ o emulador API 34. Anotaré el modelo y la versión exactos del dispositivo que se use para el primer APK y para AC-14.

## 3. Producto: ya decidido, confirma o cambia

| ID | Decisión | Valor propuesto | Si lo cambias | Doc |
|---|---|---|---|---|
| D-04 | ¿Cuántas compras activas a la vez? | **Una.** Índice único parcial en la base de datos. | Permitir varias complica la portada, la recuperación y las guardas; no lo recomiendo para el MVP. | 01, 02, 03 |
| D-05 | ¿Finalizar con 0 artículos marcados? | **Sí, tras confirmación explícita.** | Bloquearlo atrapa al usuario que olvidó marcar. Permitirlo sin confirmación guarda compras vacías por error. | 01, 03, 04 |
| D-06 | ¿Qué pasa con los artículos no comprados? | **Se guardan en el historial como “Sin comprar”.** | La alternativa es descartarlos o crear una lista nueva; ambas pierden información o añaden funciones. | 01, 03 |
| D-07 | ¿Se puede borrar el último artículo en modo compra? | **No.** Para vaciar, se cancela la compra y se edita el borrador. | Permitirlo deja una compra sin artículos y obliga a manejar otro estado límite. | 01, 03, 04 |
| D-08 | ¿Se puede borrar una compra del historial? | **Sí, con confirmación.** El contenido es inmutable; solo se elimina. | Prohibirlo obliga a conservar historial para siempre; editarlo rompe la trazabilidad. | 01, 03, 04 |
| D-09 | ¿Se puede borrar una lista mientras está en compra? | **Sí, con confirmación que avisa de que se pierde el progreso.** | La alternativa es obligar a cancelar primero; añade un paso pero evita borrados accidentales. | 03, 04 |
| D-10 | ¿Se pide el supermercado al finalizar? | **No.** Las compras nuevas guardan `NULL`; las antiguas conservan su texto y el historial lo sigue mostrando. | Preguntar por un dato que el usuario no siempre recuerda frena el cierre; la fecha y el nombre de la lista ya identifican la compra. | 01, 03, 04 |
| D-11 | ¿Supermercado predeterminado? | **Derogada por D-56.** Ya no hay campo ni sugerencias. | Mantener un campo opcional con sugerencias añade UI y estados para un dato que ya no se pide. | 03, 04 |
| D-12 | ¿Cantidades y precios? | **Derogada por D-33.** Ya están estructurados en modo La Sirena. | El alcance cambió el 31 oct 2026. La compra normal sigue sin precios. | 01, 03 |
| D-13 | ¿Se puede añadir un artículo durante la compra? | **Sí, al final de la lista.** | Es el caso real de “se me olvidó algo”; bloquearlo obliga a cancelar. | 01, 03, 04 |
| D-14 | ¿Se puede editar el nombre de la lista en compra? | **Sí.** | Es inocuo y evita cancelar para corregir una errata. | 03, 04 |
| D-15 | ¿Se puede deshacer el borrado de un artículo? | **Sí, 5 segundos; solo el último borrado.** | Sin deshacer, un toque accidental obliga a reescribir el artículo. Un historial de deshaceres añade estado. | 01, 03, 04 |

## 4. Alcance: fuera del MVP

| ID | Función | Decisión | Motivo | Doc |
|---|---|---|---|---|
| D-16 | Backup/export/import | **No en v1.0.** `allowBackup=false`. Export JSON en v1.1. | El requisito es local/offline, no backup. Aceptar que desinstalar borra los datos debe ser explícito. | 01, 02, 03, 05 |
| D-17 | Modo oscuro | **Derogada por D-60.** Tema claro y oscuro con toggle persistente. | El usuario lo pidió; se resolvió con tokens duales, `ThemeProvider` y una prueba de componente, sin librerías nuevas. | 01, 02, 04, 05 |
| D-18 | iOS | **No se valida.** Solo Android y APK. | El entregable es un APK; iOS exigiría otro build y otra campaña de pruebas. | 01, 05 |
| D-19 | Idioma | **Solo español neutro**, sin selector. | Un solo usuario y un solo idioma; i18n añade archivos y pruebas. | 01, 04 |
| D-20 | Historial paginado | **No.** Se cargan todas las compras y se virtualizan con `SectionList`. | El volumen esperado es bajo; paginar añade estados y pruebas. | 01, 02, 03 |
| D-21 | Búsqueda y filtros de historial | **No.** | No se pidió; el historial se agrupa por mes y se ordena por fecha. | 01, 03 |
| D-22 | Listas recurrentes, plantillas o “repetir compra” | **No.** Duplicar una compra queda para v1.1. | Añade un flujo completo y decisiones de copia de checks. | 01, 03 |
| D-23 | Pantalla de ajustes | **No en el MVP.** El tema se cambia desde el header de las tabs; no hay otras preferencias. | Un ajuste de tema no justifica una pantalla completa. Si se añade, será para export/import en v1.1. | 04 |
| D-24 | Precios, ofertas, código de barras, voz, OCR, compartir, recordatorios | **Precios solo en modo La Sirena (D-33).** Ofertas, comparación entre tiendas, código de barras, voz, OCR, compartir y recordatorios siguen fuera. | El usuario pidió precio y total; comparar tiendas u ofertas es otro producto. | 01 |
| D-25 | Cifrado SQLCipher, analítica, crash reporting, OTA | **No.** Hay una consulta de red opcional (catálogo), sin analítica ni reporte de crashes. | El cifrado no cambia: los datos siguen en el dispositivo. La red es una ayuda, no una dependencia. | 01, 02 |

## 5. Identidad, entrega y entorno

| ID | Decisión | Valor propuesto | Si lo cambias | Doc |
|---|---|---|---|---|
| D-26 | Nombre visible | **“Listapp”**, una palabra, L mayúscula. | Cambia el icono, el splash, el `app.json` y los textos. | 02, 04, 05 |
| D-27 | Verde exacto | **`#15803D`** como primario; `#166534` pulsado; `#F0FDF4` fondo teñido; blanco dominante. | Un verde más brillante (`#16A34A`) no alcanza AA con texto blanco en tamaños normales. Si quieres otro, hay que recalcular contrastes. | 04 |
| D-28 | Icono y splash | **Cesta blanca con check sobre fondo verde**, adaptativo y monocromo. Provisional en M0, definitivo en M4. | Puedes aportar un logo; si no, se diseña uno simple. | 02, 04, 05 |
| D-29 | Android mínimo | **Android 7.0 (API 24)**, objetivo 36 (el que fije SDK 58). | Subirlo excluye dispositivos antiguos; bajarlo no está soportado por SDK 58 y exigiría un build propio fuera del camino previsto. | 02, 05 |
| D-30 | Distribución | **APK por sideload** (`preview` de EAS); sin Play Store. | Publicar en Play Store exige AAB, ficha, política de privacidad y revisión. | 01, 02, 05 |
| D-31 | Versionado | **`version` 1.0.0**, `versionCode` 1, incremento manual en cada entrega. | El versionCode debe subir en cada APK que sustituya a otro. | 02, 05 |
| D-32 | Repositorio Git | **Inicializar antes de M0**, con `.gitignore` para `node_modules`, `.expo`, builds y secretos. | Sin repo no hay historial ni CI; no afecta al APK, pero sí al trabajo. | 05 |

### 5.1 Alcance añadido el 31 de octubre de 2026: precio por artículo y La Sirena

| ID | Decisión | Valor confirmado | Consecuencia | Doc |
|---|---|---|---|---|
| D-33 | Detalle al marcar | **Marca, cantidad, unidad y precio por unidad**, solo en modo La Sirena. | Migración v2, formulario nuevo y total por compra. La compra normal no cambia. | 01, 03, 04 |
| D-34 | Unidades | **Unidad, libra, kilogramo y litro.** | La cantidad se guarda como entero en milésimas y la unidad como código corto. | 03 |
| D-35 | Cuándo se elige el modo | **Al iniciar la compra**, con un selector explícito; no se cambia a mitad. | Se guarda en la lista y se muestra en la cabecera. | 01, 04 |
| D-36 | ¿El detalle es obligatorio? | **No.** “Omitir” marca el artículo sin datos y el total se marca como parcial. | Nunca se bloquea el marcado por falta de precio o de red. | 01, 04 |
| D-37 | Dinero y cantidades | **Céntimos enteros y milésimas enteras**; un único redondeo por línea; moneda fija `DOP`. | Evita `REAL`, deriva y totales que no cuadran. | 03 |
| D-38 | Backend de catálogo | **Node.js en Vercel**, con búsqueda por el nombre del artículo y todas las presentaciones de la familia, sin límite artificial. | El APK apunta a una URL HTTPS configurable; el backend no guarda datos del usuario. | 02, 05 |
| D-39 | Fuente de precios | **Endpoint público VTEX de `sirena.do`**, normalizado por el backend y con timeout y caché corta. | Si el endpoint cambia, se corrige solo el backend; la app sigue funcionando en manual. | 02, 05 |
| D-40 | Total en el historial | **Se guarda el subtotal de cada línea y el total de la compra al finalizar.** | El detalle histórico muestra precio, cantidad y total sin recalcular. | 03, 04 |
| D-41 | Precio del catálogo | **Por paquete/SKU.** Al elegir un resultado se propone cantidad 1 y unidad `unit`. | Evita interpretar «Azúcar Wala 5 Lb · RD$175» como 5 lb × RD$175. | 03, 04 |
| D-42 | Desmarcar | **Borra el detalle de la línea** en la misma sentencia. | Un precio en una línea «Sin comprar» es un registro falso; lo impone un CHECK. | 03 |
| D-43 | Modo y total al cerrar | **`shopping_mode` se conserva al completar y se borra al cancelar; `total_cents` solo existe en `completed`.** | El historial muestra modo y total sin recalcular. | 03 |
| D-44 | Total sin precios | **`total_cents = NULL` si no hay ninguna línea marcada con precio.** | No mostrar un total falso; `0` sí es un total real y se muestra `RD$0.00`. | 03, 04 |
| D-45 | Caché del catálogo | **Sin caché en el cliente**; solo caché HTTP del CDN del backend. | La app no guarda precios ni respuestas: cada apertura consulta o cae a manual. | 02, 04 |
| D-46 | Formato de dinero | **Visual `RD$1,234.56`; editable `1234.56`.** | El parser no acepta separador de miles; la ida y vuelta se hace con el valor editable. | 03, 04 |
| D-47 | Timeout del catálogo en el móvil | **15 s con `AbortController`**, aborto al desmontar o al repetir la búsqueda. | El backend pagina varias veces; el formulario sigue sin quedar en carga indefinida. | 02, 04 |
| D-48 | Paginación y caché del backend | **Todas las páginas anunciadas por VTEX**, de 50 en 50 y hasta un tope de seguridad de 2000 productos crudos; deadline de 12 s; respuesta pública cacheada 300 s; errores sin caché. | Muestra la familia completa sin disparar peticiones sin fin. | 02, 05 |
| D-49 | Logs de la consulta | **Sin logs de aplicación con `q`**; los logs de acceso del CDN pueden conservar la URL. | Se documenta la retención real en lugar de prometer privacidad absoluta. | 02 |
| D-50 | Copia antes de la migración 002 | **Sin copia automática de archivo**: migración atómica con verificación de conteos y FK. Copia manual antes del primer APK con datos reales. | `VACUUM INTO` no funciona dentro de la transacción y una ruta de archivo añade un fallo nuevo. | 03, 05 |
| D-51 | Visibilidad del modo | **Chip “Con La Sirena” solo en modo catálogo**; la compra normal conserva su interfaz actual. | Mostrar un chip en normal contradice “idéntica a hoy”. | 01, 04 |
| D-52 | Sugerencias al marcar | **Automáticas:** al abrir el detalle se busca con el nombre del artículo y se muestran sus marcas y presentaciones sin escribir nada. El campo de búsqueda solo corrige la consulta. | Es el comportamiento inteligente que pidió el usuario; obligarle a teclear convierte la ayuda en trabajo. | 01, 04 |
| D-53 | Consulta e imágenes del catálogo | **La consulta descarta cantidades y números sueltos, pliega tildes y pluraliza el sustantivo** (`1 sardina` → `sardinas`, `plátano` → `platano`); cada resultado incluye la `imageUrl` de La Sirena y un placeholder si falta. | VTEX devuelve cero con `1 sardina` y el usuario pidió reconocer cada presentación por su imagen. | 01, 02, 04 |
| D-54 | Filtros, orden y precio por medida | **Todo se calcula en el cliente sobre los resultados ya cargados.** El tamaño se interpreta desde nombre y presentación, se compara por libra, litro o unidad y se muestra redondeado a céntimos; sin medida reconocible no se muestra precio por medida. Los filtros se reinician al cambiar la consulta. | Con familias de cientos de presentaciones el precio suelto no permite comparar; el backend no devuelve una medida estructurada y no hace falta otra petición. | 01, 04, 05 |
| D-55 | Virtualización del catálogo | **Una `FlatList` con cabecera y pie fijos** sustituye al `ScrollView`; las filas se memoizan, se montan de 8 en 8 y se liberan fuera de la ventana visible. | Con 208 presentaciones e imágenes, montar todo de golpe bloqueaba el modal en móviles modestos; la virtualización mantiene el coste ligado a lo visible. | 02, 04, 05 |
| D-56 | Supermercado opcional | **Dejar de preguntar dónde se compró.** Las compras nuevas guardan `supermarket_name = NULL`; la migración 003 relaja el `CHECK` reconstruyendo `lists` e `items` y conserva el dato de las compras antiguas. | El cierre debe ser inmediato; el historial usa el nombre de la lista cuando no hay supermercado. | 01, 02, 03, 04, 05 |
| D-57 | Búsqueda insensible a tildes y plurales | **Plegar tildes antes de consultar y reintentar en singular si VTEX devuelve 0** (`platanos` → `platano`, `panes` → `pan`). | VTEX no reconoce todos los plurales ni todas las tildes; el usuario escribe como habla y debe encontrar la familia igual. | 01, 02, 04, 05 |
| D-58 | Confirmación antes de finalizar | **Preguntar siempre “¿Seguro que quieres terminar la compra?”** antes de escribir; con 0 marcados el aviso explica que se guardará vacía. | El cierre es irreversible y un toque accidental no debe cerrar la compra; la confirmación sustituye al antiguo modal sin añadir campos. | 01, 04, 05 |
| D-59 | Teclado sobre el header nativo | **`KeyboardAvoidingView` descuenta la altura del header** con `useHeaderHeight`; el detalle de línea además desplaza el campo enfocado. | Sin ese descuento el padding se queda corto por la franja del header y el campo inferior sigue tapado. | 04, 05 |

## 6. Decisiones de proceso que ya están tomadas

No hace falta que las confirmes; están en la documentación y se aplican salvo que decidas cambiarlas:

- El primer APK se genera al cerrar **M3**, no en M0.
- No se escribe código de la app hasta confirmar D-01, D-02 y D-03.
- No se usa ORM, store global, Reanimated, NativeWind, librería de UI, `Intl` en la UI ni librería de fechas.
- Las transacciones son explícitas y todas las operaciones pasan por una cola serial.
- Las lecturas de foco se encolan detrás de las escrituras; no hay contador de revisión.
- El historial no se pagina; se prueba con 300 filas.
- Los tests de integración usan `node:sqlite` con Node 24.22.1 y `DatabaseSync`.
- Las pruebas E2E usan Maestro sobre el APK; si Windows nativo falla, WSL2 o checklist manual.

## 7. Cómo responder

No hace falta escribir un documento. Basta con:

```text
D-01: com.jeanx.listapp
D-02: cuenta <correo>; keystore gestionado por EAS
D-03: <modelo>, Android <versión>
D-04…D-32: de acuerdo con los valores propuestos
```

O, si prefieres cambiar algo:

```text
D-07: permitir borrar el último artículo en compra
D-27: usar #16A34A y ajustar contrastes
```

## 8. Qué pasa si no respondes

No quedan decisiones bloqueantes. D-01, D-02 y D-03 están confirmadas.

- **D-04 a D-40:** se aplican los valores propuestos; están documentados y son reversibles con una migración o un cambio de UI. Las excepciones confirmadas por el usuario están en el registro.

## 9. Registro de decisiones

Cuando confirmes, este documento se convierte en el registro. Cada decisión cerrada se anota así:

| ID | Fecha | Decisión final | Confirmada por |
|---|---|---|---|
| D-01 | 28 oct 2026 | `com.jeanx.listapp` | Usuario |
| D-02 | 28 oct 2026 | EAS confirmado; cuenta personal; keystore gestionado por EAS | Usuario |
| D-03 | 28 oct 2026 | Android 13+ o emulador API 34; modelo exacto a documentar | Usuario |
| D-04 | — | Pendiente | — |
| D-33 | 31 oct 2026 | Detalle de marca, cantidad, unidad y precio solo en modo La Sirena | Usuario |
| D-34 | 31 oct 2026 | Unidad, libra, kilogramo y litro | Usuario |
| D-35 | 31 oct 2026 | Modo elegido al iniciar la compra; fijo durante la compra | Usuario |
| D-36 | 31 oct 2026 | Detalle opcional; “Omitir” no bloquea y el total se marca parcial | Orquestador, derivado de D-36 y del requisito de no bloquear |
| D-37 | 31 oct 2026 | Céntimos y milésimas enteras; moneda DOP | Orquestador, regla de dinero de la skill |
| D-38 | 31 oct 2026 | Backend Node.js en Vercel; búsqueda por nombre y sin límite artificial de resultados | Usuario (Vercel) |
| D-53 | 5 nov 2026 | Limpiar cantidades, pluralizar el sustantivo y devolver la imagen de cada presentación | Usuario |
| D-54 | 7 nov 2026 | Filtros y orden locales; precio por libra, litro o unidad calculado desde el texto | Usuario |
| D-55 | 7 nov 2026 | Virtualizar los resultados del catálogo para familias grandes | Orquestador, derivado del reporte de lentitud |
| D-56 | 8 nov 2026 | Supermercado opcional; compras nuevas con `NULL` y migración 003 que conserva las antiguas | Usuario |
| D-57 | 8 nov 2026 | Búsqueda sin tildes y reintento en singular cuando el plural no devuelve nada | Usuario |
| D-58 | 9 nov 2026 | Confirmación explícita antes de finalizar la compra, también con artículos marcados | Usuario |
| D-59 | 9 nov 2026 | Descontar la altura del header nativo en el `KeyboardAvoidingView` y desplazar el campo enfocado | Usuario, derivado del reporte de teclado |
| D-60 | 12 nov 2026 | Tema claro/oscuro con toggle persistente en el header de las tabs; sin preferencia guardada se sigue el esquema del sistema | Usuario |
| D-39 | 31 oct 2026 | Fuente VTEX pública de `sirena.do`, normalizada y con timeout | Orquestador, verificado con petición real |
| D-40 | 31 oct 2026 | Subtotal por línea y total de compra guardados al finalizar | Orquestador, derivado de AC-25 y AC-27 |
| … | — | — | — |

Las decisiones cerradas se trasladan al documento temático correspondiente y este registro solo conserva la fecha y el resultado. Así no hay dos fuentes de verdad.
