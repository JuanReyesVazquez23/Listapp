---
name: Listapp Engineering
description: Reglas de ingeniería de Listapp (arquitectura por capas, TypeScript, comentarios, SQL y transacciones, errores, UI accesible, pruebas, Git y definición de terminado). Úsala antes de escribir, revisar o aprobar código del proyecto.
metadata:
  opencode/autoinvoke: true
---

# Reglas de ingeniería de Listapp

## Fuente de verdad

La regla completa vive en el repositorio, no en esta skill:

- `skills/principal-software-engineer.agent.md` — reglas no negociables, capas, TypeScript, nombres, comentarios, SQL, errores, UI, pruebas, Git, definición de terminado, checklist de revisión y prohibiciones.
- `docs/02-arquitectura.md` — arquitectura y contrato de transacción.
- `docs/03-modelo-de-datos.md` — esquema, guardas y algoritmos delicados.
- `docs/04-navegacion-y-ux.md` — rutas, estados y accesibilidad.
- `docs/05-pruebas-y-entrega.md` — criterios de aceptación, hitos y entrega.

Léelas antes de actuar. Si esta skill y esos archivos discrepan, mandan los archivos: esta skill solo resume lo que no se puede olvidar.

## Lo que no se negocia

- **Stack cerrado:** Expo SDK 58, React Native, TypeScript estricto, Expo Router, `expo-sqlite`. Sin ORM, sin store global, sin TanStack Query, sin NativeWind, sin kits de UI, sin librerías de fechas, sin Reanimated/Worklets, sin OTA.
- **Dirección de dependencias:** `app/` y `src/components` → `src/features/*/hooks` → `src/useCases` → `src/domain`; la infraestructura se consume desde los casos de uso. `src/domain` no importa React, Expo ni infraestructura. Solo `src/infrastructure` contiene SQL.
- **Persistencia:** toda escritura pasa por `database.mutate()` con transacción explícita y cola serial. Las lecturas de pantalla usan `database.read()`. No se anidan transacciones. No se usan `withTransactionAsync` ni `withExclusiveTransactionAsync`.
- **Mutaciones:** `UPDATE` condicionado al estado esperado, `changes === 1` comprobado, operaciones idempotentes cuando el doble toque es posible.
- **Idioma:** identificadores y archivos en inglés; textos visibles, comentarios y documentación en español. Nada de literales visibles en JSX: todo sale de `src/strings/es.ts`.
- **Diseño:** colores, espacios, radios y tipografía salen de `src/theme/tokens.ts`.
- **Accesibilidad:** rol, etiqueta y estado en todo control; el color nunca es la única señal; objetivos táctiles de 48 dp.
- **Comentarios:** explican intención, decisión o condición de carrera. Nunca repiten el código, nunca comentan sintaxis, nunca quedan obsoletos.
- **Alcance:** solo lo necesario para crear, comprar, finalizar y consultar una lista. Cualquier extra se rechaza o se registra como decisión.

## Puertas antes de entregar

Ejecutar de verdad y reportar el resultado literal:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm test`
4. Export de Android cuando el cambio afecte a rutas o al bundle.

Un cambio no está terminado si falta una prueba de guarda, de persistencia o de componente para lo que se añadió. No se desactiva ni se ignora una prueba que falla.
