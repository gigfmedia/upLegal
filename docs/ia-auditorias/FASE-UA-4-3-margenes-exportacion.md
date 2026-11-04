# Redacción Asistida — UA-4 Fase 3: márgenes y exportación

## Objetivo

Permitir que cada borrador de `ai_case_drafts` conserve su propia configuración
de página y exportar el documento con esa geometría, sin alterar el HTML
persistido ni el flujo de generación/edición existente.

## Alcance

- Cuatro márgenes independientes (superior, derecho, inferior, izquierdo).
- Rango 1–5 cm, paso 0,1 cm.
- Persistencia por borrador en `document_settings` (JSONB).
- Exportación a PDF mediante el diálogo de impresión del navegador.
- Sin cambios en versiones, comparador, comentario IA ni otras tablas.

## Modelo de datos

Migración aditiva `supabase/migrations/20261031000000_ai_case_draft_document_settings.sql`:

```sql
document_settings jsonb NOT NULL DEFAULT '{}'::jsonb
```

Forma persistida:

```json
{ "margins_cm": { "top": 2.5, "right": 2.5, "bottom": 2.5, "left": 2.5 } }
```

- `{}` o ausencia de `margins_cm` ⇒ 2,5 cm (compatibilidad total).
- El servidor solo acepta los cuatro márgenes completos, numéricos y dentro de
  rango; normaliza a 0,1 cm. Un payload inválido responde
  `400 INVALID_REQUEST` sin crear versión.
- Un PUT sin `document_settings` conserva la configuración vigente.
- La migración **no se aplica automáticamente**; requiere despliegue autorizado.

## Frontend

- `letterPageGeometry.ts`: límites, normalización, claves de comparación,
  lectura/escritura de `document_settings` y `createPageLayout` seguro.
- `AICaseDrafts.tsx`: estado `marginsCm`, panel “Márgenes”, autosave de la
  configuración, detección de cambios al cerrar/cambiar de borrador y el mismo
  tratamiento de conflictos OCC que el contenido.
- `letterPagination.ts`: opción `getLayout` para recalcular la paginación sin
  recrear la instancia de TipTap.
- `draftExport.ts`: genera un HTML de impresión aislado con
  `@page { size: Letter; margin: ... }` y lo imprime en un iframe. El documento
  exportado es el `getHTML()` del editor, nunca el stack visual de páginas.
- Exportación accesible desde la barra inferior y desde un segundo botón junto
  a **Cerrar**, con bloqueo compartido para evitar aperturas simultáneas.
- La toolbar y el panel de márgenes comparten un bloque sticky; en móvil la
  toolbar usa una sola fila con desplazamiento horizontal.

## Pruebas y verificación

Suites:

```bash
npm run test:run -- src/__tests__/caseDrafts.test.tsx src/__tests__/letterPagination.test.ts src/__tests__/draftExport.test.ts server/ai/caseDraft.route.test.mjs
```

Resultado: **4 archivos, 154 tests aprobados**. Incluye:

- Legacy sin settings: GET funciona y PUT posterior inicializa sin alterar contenido.
- PUT sin `document_settings`: conserva la configuración existente.
- Payload incompleto, no numérico o fuera de rango: `400 INVALID_REQUEST` y
  ninguna versión nueva.
- UI: autosave de márgenes, reversión de valores inválidos, cierre con margen
  pendiente, conflicto OCC solo-márgenes y reutilización de la instancia TipTap.
- Exportación: `@page` Letter, cuatro márgenes, escapado de título, sin nodos de
  paginación visual, ambos botones con la misma acción y bloqueo anti-duplicado.
- Toolbar sticky compartida con el panel de márgenes y sin contenedores de
  overflow que la oculten.

Comparación de calidad contra `HEAD` en un worktree temporal limpio:

- `tsc`: 356 errores en `HEAD` → 355 en el árbol actual. El cambio elimina un
  error preexistente de `AICaseDrafts.tsx`; no añade errores nuevos. Los 7
  errores restantes de `caseDrafts.test.tsx` existen también en `HEAD`.
- `eslint`: 699 errores / 84 warnings en `HEAD` → 699 / 84 en el árbol actual.
  Los archivos tocados por la fase no añaden errores; `AICaseDrafts.tsx`
  conserva sus 3 warnings preexistentes.

## Despliegue

1. Revisar y aprobar la migración.
2. Aplicarla en el entorno correspondiente.
3. Verificar que `document_settings` existe con default `'{}'`.
4. Desplegar backend y frontend.
5. Smoke test: abrir borrador legacy (2,5 cm), cambiar un margen, guardar,
   reabrir, exportar y confirmar tamaño carta y márgenes en el PDF.
