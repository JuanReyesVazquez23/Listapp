# 06 — Agentes y proceso

## 1. Para qué sirve este documento

La arquitectura de Listapp no salió de una sola respuesta: se sometió a un debate por roles con críticas y revisiones sucesivas. Este documento deja constancia de:

- qué papel jugó cada agente;
- qué se le pidió y qué entregó en cada ronda;
- qué objeciones se aceptaron, cuáles se rechazaron y por qué;
- qué corrigió el orquestador frente a lo que propusieron los agentes;
- qué está verificado y qué sigue siendo un supuesto;
- cómo repetir el proceso cuando exista código y evidencia real.

Sin este registro, dentro de un mes solo quedaría la decisión final y se perdería el motivo de las renuncias (por ejemplo, por qué no hay Reanimated o por qué el historial no está paginado).

## 2. Roster

| Rol | Archivo | Modo declarado | Responsabilidad |
|---|---|---|---|
| `orchestrator` | `agents/orchestrator.md` | `primary` | Reformula el problema, encadena las rondas, transporta el contexto completo, verifica hechos y consolida la decisión. No implementa. |
| `architect` | `agents/architect.md` | `subagent` | Propone la solución inicial con decisiones justificadas, riesgos, alternativas descartadas y supuestos. No implementa. |
| `critic` | `agents/critic.md` | `subagent` | Busca defectos reales, los clasifica por gravedad y exige cambios imprescindibles. No repite objeciones ya resueltas. No implementa. |
| `reviser` | `agents/reviser.md` | `subagent` | Evalúa cada objeción, acepta o rechaza con razones y produce la propuesta corregida. No implementa y no afirma pruebas no ejecutadas. |
| `developer` | `agents/developer.md` | `subagent` | Implementa los hitos aprobados con cambios mínimos, pruebas y un informe al orquestador. No participó en el debate de arquitectura; se incorpora en la fase de implementación. |

**Regla de comunicación:** los agentes no hablan entre sí. El orquestador pasa a cada uno el problema original, la propuesta vigente y las críticas completas. Así se evita depender de memoria entre sesiones y se puede auditar qué información tenía cada rol al decidir.

## 3. Cómo se ejecutó realmente

### 3.1 Desviación respecto al protocolo ideal

El protocolo de `orchestrator.md` exige invocar de verdad a los subagentes y no simular sus respuestas. En esta sesión, el runtime de OpenCode solo expuso los subagentes integrados `explore` y `general`; los archivos de `agents/` **no** se cargaron como perfiles nativos.

Para no falsear el proceso:

- cada rol se ejecutó en una **sesión de subagente `general` distinta**;
- el prompt incluía la ruta del archivo del rol y la instrucción de leerlo y seguirlo;
- las respuestas fueron de subagentes reales, no inventadas por el orquestador;
- el orquestador conservó la potestad de verificar hechos y corregir afirmaciones.

Esto es una **desviación de forma, no de fondo**: hubo propuesta, crítica y revisión independientes por invocación, pero el rol era textual, no un perfil registrado con permisos propios. Queda documentado para que nadie atribuya a `critic` o `reviser` una identidad de sistema que en esta fase no existía.

### 3.2 Cómo registrarlos de forma nativa

En OpenCode V2, los agentes de proyecto se descubren en:

```text
.opencode/agents/<nombre>.md
```

No en `agents/`. Por eso los archivos actuales son documentación del rol, no agentes cargados.

Un perfil mínimo para el crítico:

```md
---
description: Revisor técnico escéptico que busca defectos en una propuesta
mode: subagent
permissions:
  - action: edit
    resource: "*"
    effect: deny
  - action: shell
    resource: "*"
    effect: deny
---

Eres un revisor técnico independiente y escéptico...
```

Notas verificadas en la documentación de V2:

- la clave de configuración es `agents` (en plural), no `agent`;
- un archivo en `.opencode/agents/team/reviewer.md` produce el id `team/reviewer`;
- el campo `model` es opcional; si se omite, el agente hereda el modelo del entorno;
- los permisos se expresan como lista de `action` / `resource` / `effect`;
- el cuerpo Markdown es el system prompt.

Durante la fase de diseño, `architect`, `critic`, `reviser` y `orchestrator` deberían registrarse con `edit: deny` y `shell: deny`: ninguno necesita escribir archivos. `developer` es la excepción: necesita editar y ejecutar pruebas, así que su perfil nativo debe permitir `edit` y `shell`, limitados a los hitos aprobados. Si se migran los archivos, conviene moverlos, no duplicarlos, para no acabar con dos fuentes de verdad.

## 4. Rondas realizadas

| Ronda | Rol | Entrada | Salida | Veredicto |
|---|---|---|---|---|
| R0 | Orquestador | Requisitos del usuario | Reformulación, alcance, criterios de aceptación iniciales y supuestos | — |
| R1 | `architect` | Problema completo | Propuesta v1: Expo, SQLite, dos tablas, repositorios, cola, UX y entrega | — |
| R1 | `critic` | Propuesta v1 + requisitos | 12 objeciones (O-01…O-12) | Aprobar con reservas |
| R1 | `reviser` | Problema + v1 + crítica R1 | 11 aceptadas, 1 parcial; propuesta v2 y decisiones cerradas | — |
| R2 | `critic` | Propuesta v2 | 6 objeciones residuales (O-13…O-18) | Aprobar con reservas |
| R2 | `reviser` | v2 + crítica R2 | O-13…O-18 resueltas; propuesta v3 | — |
| Cierre | Orquestador | v2/v3 + verificación factual | Correcciones, decisión final y esta documentación | Aprobada con reservas |

No hubo una tercera ronda de crítica: las seis objeciones residuales tenían respuesta concreta y el orquestador cerró con correcciones propias. El protocolo permitía hasta tres; detenerse antes es válido si no quedan defectos críticos sin resolver. `developer` no participó en estas rondas: entra cuando empieza la implementación.

## 5. Objeciones y resultado

### 5.1 Ronda 1

| ID | Clase | Objeción | Resultado |
|---|---|---|---|
| O-01 | Crítico | `finishPurchase` validaba fuera de la transacción y no era idempotente. | Aceptada. Relectura de estado, conteo y supermercado dentro de la transacción; `UPDATE` condicionado; doble toque tratado como éxito. |
| O-02 | Crítico | El contrato de transacción y los PRAGMAs no estaban definidos; los helpers de Expo no son exclusivos o no copian PRAGMAs. | Aceptada. Una conexión, cola serial, `BEGIN IMMEDIATE`/`COMMIT`/`ROLLBACK`, PRAGMAs verificados. |
| O-03 | Alto | Entorno E2E sin resolver (Java, `adb`, cuenta EAS). | Aceptada. JDK 17 + `platform-tools` + dispositivo físico o emulador; EAS cloud como camino principal; comprobar en M0. |
| O-04 | Alto | AC-16 exigía una migración v2 inexistente y faltaba guarda de downgrade. | Aceptada. AC-16 reescrito sin v2 ficticia; pantalla de versión incompatible que no borra la BD. |
| O-05 | Alto | Progreso obsoleto si se marca y se vuelve atrás antes del `COMMIT`. | Aceptada en el riesgo, resuelta sin contador de revisión: la cola ordena la lectura de foco detrás de la escritura y el hook actualiza solo la fila. |
| O-06 | Alto | Varios criterios de aceptación no eran falsables (accesibilidad, rendimiento, año, muerte a mitad de escritura). | Aceptada. AC separados en automáticos y manuales; dispositivo, build y método declarados; instrumentación de latencia. |
| O-07 | Medio | Orden de artículos inestable con `created_at` + UUID. | Aceptada. `sort_order` entero, único por lista, asignado en la transacción; sin renumerar al borrar. |
| O-08 | Medio | Exigir ≥1 marcado para finalizar era una regla inventada que atrapaba al usuario. | Aceptada. Se permite finalizar con 0 marcados tras confirmación explícita; se mantiene ≥1 artículo para empezar. |
| O-09 | Medio | El E2E no podía sembrar 51 compras y usaba texto no ASCII; `clearState` estaba mal en recuperación. | Aceptada. Datos ASCII, dos flujos, `clearState:false` en recuperación y paginación fuera del MVP. |
| O-10 | Medio | Rutas y deep links sin guardas de estado. | Aceptada. Cada ruta carga la entidad, valida estado y redirige con `replace`; el modal bloquea el cierre mientras finaliza. |
| O-11 | Medio | Pérdida de datos y acciones destructivas sin red de seguridad. | Aceptada. Deshacer de 5 s al borrar artículo, confirmaciones explícitas, `allowBackup=false` documentado y export en v1.1. |
| O-12 | Medio/bajo | Faltaban dependencias y había ceremonia injustificada. | Parcial. Se añaden `expo-linking`, `expo-constants`, plugin, typed routes y `@types/node`; se eliminan Reanimated/Worklets y `Result`; se reducen capas y componentes. Se conservan `Clock`, IDs, cola, puerto SQL y runner de migraciones. |

### 5.2 Ronda 2

| ID | Clase | Objeción | Resultado |
|---|---|---|---|
| O-13 | Crítico | Una llamada a `read()` dentro de `mutate()` se encola detrás de sí misma y congela la app; faltaba un gate de arranque. | Aceptada. Repositorios reciben `Tx`; prohibición estructural de importar el gestor dentro de una transacción; `boot()` único, encolado y bloqueante; watchdog de 10 s como red de seguridad. |
| O-14 | Crítico | Marcar, desmarcar o deshacer podían escribir sobre una compra ya finalizada. | Aceptada. Guarda condicional de estado en la misma sentencia para toda mutación de artículo; `changes=0` distingue estados; el snackbar se cancela al finalizar y un undo tardío falla sin escribir. |
| O-15 | Moderado | Un `ROLLBACK` fallido podía dejar la conexión envenenada y todas las escrituras fallar. | Aceptada. El error de rollback no se silencia; sonda `BEGIN`/`ROLLBACK`; si falla, `DB_BROKEN` y pantalla bloqueante. |
| O-16 | Moderado | AC-14 no era falsable y una señal de revisión podía provocar doble relectura y re-render completo. | Aceptada en el riesgo, resuelta sin señal de revisión: instrumentación `performance.now()` + logcat, actualización local de la fila y ninguna relectura tras el check. |
| O-17 | Moderado | El runner dependía de `node:sqlite` sin versión de Node fijada. | Aceptada con corrección factual. Se fija Node 24.22.1 y se usa `DatabaseSync`; la afirmación de que `DatabaseSync` es alias obsoleto de `Database` no se cumple en este entorno. |
| O-18 | Preferencia con hueco real | La matriz de guardas no cubría ids inexistentes fuera de `/lista/[id]`; el botón “Actualizar” de la pantalla de downgrade no tenía destino. | Aceptada. `+not-found` en las cuatro rutas; pantalla de versión con instrucciones de instalación, sin botón muerto. |

## 6. Correcciones del orquestador

El orquestador no aceptó todo lo que propusieron los agentes. Estas correcciones cambiaron la arquitectura final:

### 6.1 API de `node:sqlite`

El crítico afirmó que `DatabaseSync` era un alias obsoleto de `Database`. Se comprobó en el entorno real:

```text
Node v24.22.1
exports: DatabaseSync, StatementSync, Session, constants, backup
typeof Database === "undefined"
PRAGMA foreign_keys → 1
```

**Decisión:** fijar Node 24.22.1 y usar `DatabaseSync` en el adaptador de tests. No se adopta una API que no existe en la versión instalada.

### 6.2 Reentrada: prohibición estructural, no un flag global

El crítico y el revisor propusieron que `read()`/`mutate()` lanzaran `REENTRANT_OPERATION` si había una tarea activa. Un flag global de “tarea en curso” también rechazaría lecturas externas legítimas que simplemente están esperando su turno en la cola, y no distingue “llamada anidada” de “llamada concurrente normal”.

**Decisión:** la prevención es de API y de tipos:

- los repositorios reciben un `Tx`, no el gestor ni la cola;
- los casos de uso son los únicos que llaman a `read`/`mutate`;
- una regla de lint prohíbe importar el gestor en `useCases` y `repositories`;
- el watchdog de 10 s detecta un bloqueo y muestra una pantalla de reinicio.

Es una defensa más fuerte que un booleano, porque el error se detecta al compilar, no en producción.

### 6.3 El watchdog bloquea, no libera la cola

La propuesta inicial liberaba la cola con `DB_TIMEOUT` y seguía operando. Eso es peligroso: la tarea anterior puede seguir viva y escribir sobre un handle que la app ya considera libre.

**Decisión:** al agotarse el watchdog, la sesión se marca como no fiable, se muestra una pantalla bloqueante y se pide cerrar y volver a abrir. No se reutiliza la conexión ni se reanuda la cola. Se pierde disponibilidad, no integridad.

### 6.4 Sin contador de revisión ni store global

La ronda 1 introdujo una señal `revision`; la ronda 2 pidió definir su entrega con `useSyncExternalStore`. El orquestador eliminó la señal:

- la cola serial ya garantiza que una lectura de foco se ejecute después de las escrituras pendientes;
- el caso de uso devuelve la fila actualizada y el progreso;
- el hook reemplaza solo esa fila y actualiza el contador;
- al recuperar el foco se relee.

No hay store global, no hay suscripción que diseñar y no hay doble relectura. La objeción de fondo (evitar progreso obsoleto y re-render completo) queda cubierta por el orden de la cola y la actualización estrecha.

### 6.5 Recuperación en caliente: no

La propuesta contemplaba cerrar y reabrir la conexión automáticamente tras un fallo. Reabrir mientras una tarea antigua puede seguir viva es más arriesgado que pedir un reinicio.

**Decisión:** solo se reabre en el arranque (`boot()`), y el reintento tras un fallo de boot cierra y vuelve a empezar. En ejecución, `DB_BROKEN` es terminal hasta que el usuario reinicia la app.

### 6.6 Paginación del historial fuera del MVP

La paginación añadía estados de carga, cursores, pruebas de dos páginas y siembra de datos en E2E para un volumen que el MVP no alcanza.

**Decisión:** `SectionList` con todas las compras completadas; prueba de integración con 300 filas; paginación por claves en v1.1 si el volumen lo exige.

## 7. Qué está verificado y qué no

### 7.1 Verificado en el entorno

| Hecho | Cómo se comprobó |
|---|---|
| Node instalado es 24.22.1. | `node -v`. |
| `node:sqlite` exporta `DatabaseSync`, `StatementSync`, `Session`, `constants` y `backup`. | Inspección de exports en tiempo de ejecución. |
| `Database` no existe en esa versión. | `typeof Database === "undefined"`. |
| `PRAGMA foreign_keys` se puede activar y leer en `node:sqlite`. | Consulta en una BD en memoria. |
| La configuración de agentes de OpenCode V2 vive en `.opencode/agents/<nombre>.md`. | Documentación oficial de V2. |
| Los archivos de `agents/` no son un directorio de descubrimiento. | El runtime solo expuso `explore` y `general`. |
| El Java local es 1.8, insuficiente para Maestro/Android moderno. | Comprobación de versión. |

### 7.2 No verificado

- El comportamiento de `expo-sqlite` con `BEGIN IMMEDIATE`, `COMMIT` y `ROLLBACK` manuales en un dispositivo real.
- Que el watchdog de 10 s no interfiera con operaciones legítimas lentas (no debería: son milisegundos).
- La cuenta de EAS ya está confirmada; faltan el keystore y el primer build. El `android.package` (`com.jeanx.listapp`) y el dispositivo están confirmados.
- Maestro en Windows nativo.
- Los ratios de contraste calculados en el sistema de diseño, con una herramienta WCAG.
- Los objetivos de rendimiento de AC-14.
- Cualquier prueba de la app: **no se ha ejecutado ninguna**.

Estas carencias son la razón del veredicto “aprobada con reservas”, no un detalle menor. El hito M0 existe para convertirlas en evidencia antes de escribir la funcionalidad.

## 8. Riesgos del proceso

| Riesgo | Por qué importa | Mitigación |
|---|---|---|
| Los roles los ejecutó el mismo modelo base. | Los puntos ciegos pueden estar correlacionados: el crítico no ve lo que el arquitecto no sabe. | Verificación factual externa (Node, documentación), revisión humana y pruebas en M0. |
| No hay código todavía. | El diseño no ha sufrido el contacto con `expo-sqlite`, Android ni el dispositivo. | Smoke test de transacciones y build en M0; reabrir el debate con evidencia. |
| Los documentos son extensos. | Pueden quedar desactualizados respecto al código. | Una sola fuente por tema; actualizar el documento afectado en el mismo cambio que el código. |
| El veredicto “aprobada” puede leerse como “sin riesgos”. | No lo es: hay reservas explícitas. | Este apartado y la tabla de riesgos de `02-arquitectura.md`. |
| Los artefactos completos de las rondas están en el directorio temporal de la sesión. | Se pueden perder. | Las conclusiones y los motivos están consolidados aquí y en los documentos 01–05. |

## 9. Cuándo reabrir el debate

El proceso se reabre cuando exista evidencia nueva, no por preferencia estética. Disparadores concretos:

1. **M0:** el contrato de transacción falla en dispositivo (por ejemplo, `BEGIN IMMEDIATE` no se comporta como se espera con `expo-sqlite`).
2. **M0:** EAS no está disponible o el paquete/keystore no se puede configurar.
3. **M1/M2:** una operación de la cola supera de forma repetida el watchdog o aparece un bloqueo.
4. **M3:** el historial crece hasta un punto en que `SectionList` sin paginación se nota.
5. **M5:** Maestro no es viable en el entorno disponible.

En cada reapertura:

- se aporta la evidencia (log, medición, error reproducible);
- el crítico parte de la propuesta vigente, no de cero;
- se registra la decisión y se actualiza el documento correspondiente;
- no se aceptan cambios que añadan complejidad sin un beneficio medible.

## 10. Resumen del veredicto

- **Arquitectura:** aprobada con reservas.
- **Reservas críticas:** contrato de transacción no probado en dispositivo; cuenta EAS, paquete y dispositivo confirmados, pero keystore y primer build aún sin verificar.
- **Reservas moderadas:** Maestro en Windows, rendimiento no medido, contraste sin validar con herramienta, crecimiento del historial.
- **Ninguna reserva bloquea el inicio de M0**, pero sí bloquean el cierre del MVP hasta que se resuelvan o se acepten explícitamente.
