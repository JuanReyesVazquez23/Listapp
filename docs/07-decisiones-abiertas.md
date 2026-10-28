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
| D-10 | ¿Supermercado como catálogo o texto libre? | **Texto libre, obligatorio al finalizar, con sugerencias de las últimas 8 compras.** | Un catálogo exige mantener datos, altas y duplicados; no aporta al MVP. | 01, 03 |
| D-11 | ¿Supermercado predeterminado? | **No.** Se muestran las últimas 8 compras como sugerencias, pero el campo no se rellena solo. | Rellenarlo acelera el flujo, pero puede guardar el supermercado equivocado sin que el usuario lo note. | 03, 04 |
| D-12 | ¿Cantidades y precios? | **No estructurados.** La cantidad va en el nombre (“2 kg de patatas”). | Añadir campos, totales y moneda multiplica la UI, el modelo y las pruebas. | 01, 03 |
| D-13 | ¿Se puede añadir un artículo durante la compra? | **Sí, al final de la lista.** | Es el caso real de “se me olvidó algo”; bloquearlo obliga a cancelar. | 01, 03, 04 |
| D-14 | ¿Se puede editar el nombre de la lista en compra? | **Sí.** | Es inocuo y evita cancelar para corregir una errata. | 03, 04 |
| D-15 | ¿Se puede deshacer el borrado de un artículo? | **Sí, 5 segundos; solo el último borrado.** | Sin deshacer, un toque accidental obliga a reescribir el artículo. Un historial de deshaceres añade estado. | 01, 03, 04 |

## 4. Alcance: fuera del MVP

| ID | Función | Decisión | Motivo | Doc |
|---|---|---|---|---|
| D-16 | Backup/export/import | **No en v1.0.** `allowBackup=false`. Export JSON en v1.1. | El requisito es local/offline, no backup. Aceptar que desinstalar borra los datos debe ser explícito. | 01, 02, 03, 05 |
| D-17 | Modo oscuro | **No.** Tema claro verde/blanco. | Duplica tokens y pruebas; no se pidió. | 01, 04 |
| D-18 | iOS | **No se valida.** Solo Android y APK. | El entregable es un APK; iOS exigiría otro build y otra campaña de pruebas. | 01, 05 |
| D-19 | Idioma | **Solo español neutro**, sin selector. | Un solo usuario y un solo idioma; i18n añade archivos y pruebas. | 01, 04 |
| D-20 | Historial paginado | **No.** Se cargan todas las compras y se virtualizan con `SectionList`. | El volumen esperado es bajo; paginar añade estados y pruebas. | 01, 02, 03 |
| D-21 | Búsqueda y filtros de historial | **No.** | No se pidió; el historial se agrupa por mes y se ordena por fecha. | 01, 03 |
| D-22 | Listas recurrentes, plantillas o “repetir compra” | **No.** Duplicar una compra queda para v1.1. | Añade un flujo completo y decisiones de copia de checks. | 01, 03 |
| D-23 | Pantalla de ajustes | **No en el MVP.** | No hay preferencias que configurar; todo es automático. Si se añade, será para export/import en v1.1. | 04 |
| D-24 | Precios, ofertas, código de barras, voz, OCR, compartir, recordatorios | **No.** | Fuera del job to be done. | 01 |
| D-25 | Cifrado SQLCipher, analítica, crash reporting, OTA | **No.** | No hay datos sensibles declarados ni red en ejecución; el APK se reinstala. | 01, 02 |

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

- **D-04 a D-32:** se aplican los valores propuestos; están documentados y son reversibles con una migración o un cambio de UI.

## 9. Registro de decisiones

Cuando confirmes, este documento se convierte en el registro. Cada decisión cerrada se anota así:

| ID | Fecha | Decisión final | Confirmada por |
|---|---|---|---|
| D-01 | 28 oct 2026 | `com.jeanx.listapp` | Usuario |
| D-02 | 28 oct 2026 | EAS confirmado; cuenta personal; keystore gestionado por EAS | Usuario |
| D-03 | 28 oct 2026 | Android 13+ o emulador API 34; modelo exacto a documentar | Usuario |
| D-04 | — | Pendiente | — |
| … | — | — | — |

Las decisiones cerradas se trasladan al documento temático correspondiente y este registro solo conserva la fecha y el resultado. Así no hay dos fuentes de verdad.
