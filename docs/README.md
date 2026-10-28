# Listapp — Documentación de arquitectura

**Fase 1: implementación en curso. M0 (base y SQLite), M1 (listas y artículos) y M2 (modo compra) completados; el primer APK llega al cerrar M3.**

Esta documentación define qué se va a construir, cómo se organiza, qué datos guarda, cómo se navega, cómo se prueba y cómo se entrega el APK. Es la base para empezar a implementar sin improvisar decisiones estructurales.

## Índice

| Documento | Contenido |
|---|---|
| [01 — Producto y alcance](01-producto-y-alcance.md) | Visión, usuario, alcance MVP, fuera de alcance y criterios de aceptación. |
| [02 — Arquitectura](02-arquitectura.md) | Capas, stack, estructura de carpetas, flujo de datos, transacciones, dependencias y build. |
| [03 — Modelo de datos](03-modelo-de-datos.md) | Tablas, campos, invariantes, índices, ciclo de vida, fechas y migraciones. |
| [04 — Navegación y UX/UI](04-navegacion-y-ux.md) | Rutas, guardas, pantallas, sistema de diseño verde/blanco, accesibilidad y movimiento. |
| [05 — Pruebas y entrega](05-pruebas-y-entrega.md) | Pirámide de pruebas, E2E, checklist manual, hitos y compilación del APK. |
| [06 — Agentes y proceso](06-agentes-y-proceso.md) | Roles, protocolo de debate, rondas realizadas, correcciones y riesgos. |
| [07 — Decisiones abiertas](07-decisiones-abiertas.md) | Preguntas que debes confirmar antes de implementar. |

## Resumen de la decisión

- **Producto:** crear listas, añadir/editar/eliminar artículos, empezar la compra, marcarlos, finalizar y consultar el historial.
- **Plataforma:** Android; APK generado con EAS Build.
- **Arquitectura:** Expo Router + TypeScript + SQLite local; sin ORM, sin store global, sin nube.
- **Datos:** dos tablas (`lists` e `items`); una lista completada es la compra histórica.
- **Consistencia:** una conexión SQLite, cola serial para todas las operaciones y transacciones explícitas.
- **Diseño:** verde y blanco, tema claro, componentes propios, fuente del sistema, accesibilidad AA.
- **Entrega:** primer APK al cerrar M3; APK final tras pruebas manuales y E2E.

## Cómo se tomó la decisión

Se usó el protocolo de los agentes del proyecto:

1. `architect` propuso la arquitectura.
2. `critic` la revisó y encontró 12 objeciones.
3. `reviser` aceptó 11 y ajustó la duodécima.
4. `critic` hizo una segunda ronda y encontró 6 defectos residuales.
5. `reviser` los resolvió con correcciones de contrato de transacción, mutaciones, recuperación y pruebas.
6. El orquestador consolidó la decisión y corrigió seis puntos discutibles (ver `06-agentes-y-proceso.md`).

**Veredicto:** aprobada con reservas. Las reservas están identificadas y tienen mitigación o quedan como riesgo explícito; no bloquearon el inicio de M0.

## Regla de esta fase

No se implementa código hasta que se confirmen las decisiones bloqueantes. **D-01, D-02 y D-03 están confirmadas**; M0, M1 y M2 están cerrados y la implementación continúa con M3. El resto de decisiones tiene un valor por defecto documentado y puede aplicarse sin bloquear el diseño.
