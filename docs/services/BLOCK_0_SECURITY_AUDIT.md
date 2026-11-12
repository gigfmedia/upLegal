# Auditoría de Seguridad — Sprint 2, Bloque 0

**Fecha:** 2026-11-11
**Alcance:** Bloque 0 de seguridad de Servicios (scanner antimalware + gate D17)
**Estado auditado original:** árbol de trabajo sin commit, antes del Bloque 0.1
**Veredicto original:** **NO APROBADO (NOT APPROVED)**
**Estado tras correcciones 0.1:** **PARCIALMENTE CORREGIDO — PENDIENTE RE-AUDITORÍA INDEPENDIENTE**
**Veredicto 0.1:** **NO APROBADO TODAVÍA.** Las correcciones de código están implementadas y probadas a nivel unitario; H-07 sigue pendiente por autorización expresa.

---

## 1. Resumen ejecutivo

La implementación es una base razonable: separa el puerto del scanner, rechaza mocks en producción, impone el timeout de 8 s en el wrapper, acumula razones del gate y tiene 36 pruebas unitarias que pasan. Sin embargo, **no satisface D17 de forma acumulativa ni fail-closed** en varios puntos obligatorios.

Se demostraron con probes directos, usando datos sintéticos, los siguientes comportamientos:

1. Un scanner “real” autodeclarado puede satisfacer producción sin ser un adaptador real.
2. La aserción de arranque devuelve `ok: true` validando solo el scanner, sin retención, purga, infraestructura, DPA ni validación legal.
3. Un healthcheck con `healthy: true` pero `status: "degraded"` o `signaturesOutdated: true` se considera saludable.
4. La ausencia de `unresolvedCriticalFailures` en la evidencia de purga se interpreta como `0` y permite el gate.
5. Una verificación de infraestructura con `ok: true` pero Storage falso y base de datos no read-only se considera exitosa.

No se encontró una ruta HTTP de Servicios que procese documentos reales en este estado, por lo que el riesgo es **latente**, no explotable hoy por un usuario final. Pero el Bloque 0 no está integrado: `server.mjs` no importa ni ejecuta estos controles. Si el Bloque 1 agrega rutas sin corregir e integrar el gate, los fallos anteriores se convierten en un bypass real de D17.

**Recomendación:** no autorizar el Bloque 1 todavía. Autorizar primero un Bloque 0.1 de corrección y re-auditoría. No procesar documentos reales de Servicios hasta entonces.

---

## 2. Metodología

- Lectura de `docs/services/SPRINT_2_TECHNICAL_DESIGN.md` y `docs/services/SPRINT_2_READINESS_AUDIT.md`.
- Inspección estática de los cuatro archivos del Bloque 0 y de sus pruebas.
- Búsqueda de integración en `server.mjs` y en `server/`.
- Ejecución de pruebas, `node --check`, lint y typecheck.
- Probes adversariales con Node y buffers sintéticos. No se usaron documentos reales.
- No se modificó código, migraciones, configuración, `server.mjs` ni se implementó wiring.

Limitaciones: no hay scanner real, repositorio PostgreSQL de evidencias ni Storage/DB de producción en este entorno. No se hizo pentest ni auditoría externa. Las líneas citadas corresponden al estado actual del árbol.

---

## 3. Archivos revisados

- `docs/services/SPRINT_2_TECHNICAL_DESIGN.md`
- `docs/services/SPRINT_2_READINESS_AUDIT.md`
- `server/services/security/malwareScanner.mjs`
- `server/services/security/malwareScanner.test.mjs`
- `server/services/security/commercialReadinessGate.mjs`
- `server/services/security/commercialReadinessGate.test.mjs`
- `server.mjs`
- `server/ai/provider.mjs`
- `package.json`
- `eslint.config.js`
- `tsconfig.app.json`

No existen adaptadores reales ni repositorio de evidencias en `server/services/security/`; solo los módulos y sus pruebas.

---

## 4. Resultado de comandos

| Comando | Resultado |
|---|---|
| `npx vitest run server/services/security/malwareScanner.test.mjs server/services/security/commercialReadinessGate.test.mjs` | 2 archivos, 36 tests pasaban en la auditoría original; 53 tras 0.1 |
| `node --check` sobre los cuatro `.mjs` | Pasa |
| `npm run lint` | Falla: 784 problemas (700 errores, 84 warnings), sin rutas de `services/security` en la salida |
| ESLint dirigido a los `.mjs` | Exit 0, pero no aplica reglas: `eslint.config.js` solo incluye `**/*.{ts,tsx}` |
| `npm run typecheck` | Timeout a los 120 s en la auditoría original; en 0.1 completó con 358 errores TS preexistentes; no cubre `.mjs` |
| Búsqueda de imports de seguridad en `server.mjs` / `server/` | Sin integración; solo los propios módulos y tests |

El lint global falla por deuda previa fuera del Bloque 0. El typecheck no cubre archivos `.mjs` porque `tsconfig.app.json` incluye solo `src`. En la auditoría original no había cobertura estática efectiva del Bloque 0; el Bloque 0.1 agregó ESLint efectivo para los `.mjs` (ver 11.3).

---

## 5. Matriz D11 / D17

### 5.1 D11 — Reglas técnicas

| Requisito | Resultado | Evidencia |
|---|---|---|
| Solo `development` y `production`; staging rechazado | PASS | `malwareScanner.mjs:69-103`, `:425-432`; test `malwareScanner.test.mjs:198-204` |
| Mock solo en development/test local | PASS | `MOCK_SCANNER_ENVIRONMENTS` incluye `test` (`malwareScanner.mjs:9`), permitido por la documentación; producción rechazada (`:75-80`, `:410-419`) |
| Producción exige scanner real y saludable | **FAIL** | Acepta objetos autodeclarados “reales” (`:69-93`, `:410-419`) y considera saludable un healthcheck degradado/obsoleto (`:240-249`) |
| Timeout máximo de 8 s | **PARCIAL** | Constante de 8 s y wrapper correcto (`:1`, `:180-208`), pero el puerto no obliga a usar el wrapper (`:293-294`, `:301-305`) y el gate no usa `scannerTimeoutMs` (`commercialReadinessGate.mjs:416`, `:426`) |
| `infected`, `error`, `timeout`, `unavailable` nunca son `clean` | PASS | `scanWithTimeout` normaliza timeout a `unavailable` (`:180-207`); tests `malwareScanner.test.mjs:107-119` |
| No procesar documentos reales sin D17 | **FAIL** | El gate no está integrado; la aserción de arranque es parcial (`commercialReadinessGate.mjs:578-607`); `server.mjs:14419` no la ejecuta |
| Error estable 503 | PASS | `CommercialReadinessError` (`commercialReadinessGate.mjs:394-403`); test `:264-275` |

### 5.2 D17 — Gate de documentos reales

| Requisito | Resultado | Evidencia |
|---|---|---|
| Producción + opt-in explícito | PASS | `commercialReadinessGate.mjs:452-501`; tests `:118-139` |
| Categoría A: scanner real, configurado y saludable | **FAIL** | Fallo de salud degradada/obsoleta y aceptación de scanner autodeclarado; ver H-01 y H-03 |
| Categoría A: parámetros de retención exactos y válidos | PASS | `normalizeRetentionParameters` (`:120-151`); tests `:203-221` |
| Categoría A: purga exitosa, reciente y sin fallos críticos | **FAIL** | Campo faltante de fallos no resueltos se asume `0` (`:268-274`); ver H-04 |
| Categoría A: verificación no destructiva de Storage/DB | **FAIL** | `ok: true` cortocircuita flags falsos de Storage/DB (`:316-318`); ver H-05 |
| Categoría B: DPA de IA vigente, firmado y asociado al proveedor | **PARCIAL / FAIL** | Valida fechas y estado, pero no asocia el proveedor del DPA al proveedor de IA configurado (`:183-220`, `:405-432`); ver H-06 |
| Categoría B: política de retención aprobada y versionada | PASS | `normalizeRetentionPolicy` (`:153-181`); tests `:157-201`. Observación: no valida alcance/servicio |
| Categoría B: validación legal registrada y vigente | PASS | `normalizeLegalValidation` (`:222-255`); tests `:157-201`. Observación: no valida alcance/servicio |
| Evidencia faltante o repositorio no disponible falla cerrado | **PARCIAL / FAIL** | Repositorio ausente o excepción fallan (`:613-660`), pero evidencia incompleta en purga e infraestructura puede pasar; ver H-04 y H-05 |
| Aserción de arranque completa y fail-closed | **FAIL** | Solo valida scanner (`:578-607`); ver H-02 |
| `SERVICES_REAL_DOCUMENTS_ENABLED=true` no hace bypass | PASS | Test `commercialReadinessGate.test.mjs:131-139` |
| Evaluación acumulativa de checks | **PARCIAL** | `evaluate()` acumula razones (`:452-560`), pero `assertProductionStartupSafe` no evalúa la mayoría |

---

## 6. Hallazgos

### H-01 — HIGH — Healthcheck fail-open con estado degradado o firmas obsoletas

**Ubicación:** `server/services/security/malwareScanner.mjs:240-257`; consumo en `commercialReadinessGate.mjs:710-719`.

**Evidencia:** probes directos:

- `{ healthy: true, status: "degraded" }` → `checkScannerHealth` devuelve `healthy: true`.
- `{ healthy: true, signaturesOutdated: true }` → `healthy: true`.
- El gate abre con un scanner que devuelve esos valores.

**Impacto:** un scanner con firmas vencidas o servicio degradado puede satisfacer D17 y procesar documentos reales. Es un fail-open en el control antimalware.

**Corrección mínima:** cualquier señal negativa debe ganar: `status` debe pertenecer al conjunto saludable; `degraded`, `unhealthy`, `stale`, `signaturesOutdated: true` deben fallar. Exigir frescura de firmas (`signaturesUpdatedAt`/`lastUpdate`) y versión del motor. Añadir tests de health degradado y obsoleto.

### H-02 — HIGH — La aserción de arranque solo valida el scanner

**Ubicación:** `commercialReadinessGate.mjs:578-607`.

**Evidencia:** con `environment: "production"`, `realDocumentsEnabled: false`, un scanner fake y sin repositorio de evidencias, `assertProductionStartupSafe()` devuelve `{ ok: true, skipped: false }`.

**Impacto:** si se usa como guard de arranque, la aplicación inicia sin retención aprobada, purga, infraestructura no destructiva, DPA ni validación legal. La aserción transmite una falsa sensación de seguridad.

**Corrección mínima:** en producción, ejecutar `evaluate()` y exigir `allowed === true`; o replicar todos los checks D17. Fallar también para entornos desconocidos, no solo para producción. Añadir tests de arranque con cada evidencia faltante y con repositorio ausente.

### H-03 — HIGH — Producción acepta scanner y repositorio de evidencias autodeclarados

**Ubicación:** `malwareScanner.mjs:69-93` y `:410-419`; `commercialReadinessGate.mjs:405-432` y `:613-659`; fixtures `commercialReadinessGate.test.mjs:22-30` y `:72-76`.

**Evidencia:** `createMalwareScanner({ environment: "production", scanner: fake })` acepta un objeto `{ name: "private-clamav-vpc", scanBuffer: async () => ({ status: "clean" }) }`. El gate también acepta cualquier objeto con `loadEvidence`. La suite usa exactamente un `realScanner()` simulado y un `repository()` en memoria para abrir el gate.

**Impacto:** no hay procedencia verificable. Un error de composición o una inyección puede satisfacer D17 con dobles de test. `kind: "real"` o un nombre que no coincide con el patrón de placeholder no son prueba de un adaptador real.

**Corrección mínima:** construir adaptadores y repositorio en el composition root; que el gate solo acepte salidas de una fábrica/registro de producción confiable. No aceptar objetos arbitrarios inyectados como “reales” en producción. Separar explícitamente fábricas de test. Añadir un test que demuestre que un doble con nombre real es rechazado o no puede construirse en producción.

**Nota:** JavaScript no puede demostrar procedencia de un objeto en runtime; la garantía debe estar en la composición y en las pruebas de integración. Pero la API actual es demasiado permisiva.

### H-04 — HIGH — `unresolvedCriticalFailures` ausente se interpreta como 0

**Ubicación:** `commercialReadinessGate.mjs:268-274`.

**Evidencia:** con evidencia de purga `{ lastSuccessfulRunAt, lastRunResult: "success" }`, sin `unresolvedCriticalFailures`, el gate devuelve `allowed: true`.

**Impacto:** evidencia incompleta de purga se trata como éxito. D17 exige que no haya fallos críticos sin resolver; “no reportado” no es “cero”.

**Corrección mínima:** exigir el campo como entero `>= 0`; ausente, booleano, string no numérico o `null` deben fallar. Añadir test de campo ausente. Considerar exigir también que el worker esté habilitado/registrado y que la evidencia incluya el período purgado.

### H-05 — HIGH — `ok: true` de infraestructura anula flags negativos de Storage/DB

**Ubicación:** `commercialReadinessGate.mjs:316-318`; los flags detallados de `:321-334` nunca se evalúan si `ok` está presente.

**Evidencia:** `{ ok: true, destructive: false, storage: { serviceDocuments: false, servicePaymentProofs: false }, databaseReadOnly: false }` → `allowed: true`.

**Impacto:** una verificación que explícitamente reporta Storage no conforme y DB no read-only se considera no destructiva. D17.5 no se cumple.

**Corrección mínima:** evaluar primero los flags detallados; `ok: true` solo puede ser éxito si todos los detalles son verdaderos y no hay contradicción. Si hay conflicto, fallar cerrado. Añadir tests de `ok: true` con Storage falso y con DB no read-only.

### H-06 — HIGH — El DPA no está asociado al proveedor de IA configurado

**Ubicación:** `commercialReadinessGate.mjs:183-220` guarda `provider`, pero `CommercialReadinessGate` (`:405-432`) no recibe el proveedor activo ni lo compara. `server/ai/provider.mjs:39-49` ya tiene `detectAIProvider`.

**Evidencia:** la evidencia válida del test declara `provider: "OpenAI"`, pero el gate no conoce el proveedor real. Un DPA de OpenAI podría aprobar una app configurada para OpenRouter, Groq u otro proveedor.

**Impacto:** incumplimiento formal de D17.6 (“asociado al proveedor de IA”). El DPA correcto para un proveedor no cubre a otro.

**Corrección mínima:** pasar el proveedor de IA activo (o su identificador normalizado) al gate y compararlo con `aiDpa.provider`. Rechazar mismatch o proveedor desconocido. Añadir tests con DPA de proveedor distinto. Verificar también que el DPA cubra el servicio/uso real, no solo metadatos.

### H-07 — HIGH — El gate no está integrado y la aserción de arranque no se ejecuta

**Ubicación:** `server.mjs:14419` (`app.listen`) no llama a `assertProductionStartupSafe`; no hay imports de `services/security` en `server.mjs`.

**Evidencia:** búsqueda de imports/uso: sin coincidencias fuera de los módulos y tests. La única ruta de Servicios existente es `/api/services/inquiries`, un formulario sin documentos (`server.mjs:539-549`); no llama a `assertReadyForRealDocuments` ni procesa archivos.

**Impacto:** los controles están inertes. Hoy no hay ruta de Servicios que procese documentos reales, por lo que el riesgo es latente; en cuanto el Bloque 1 agregue la ruta, podría procesar sin D17 si no se integra.

**Corrección mínima:** después de corregir H-01 a H-06, ejecutar la aserción completa antes de `app.listen` y llamar al gate en cada frontera de carga/analisis de documentos de Servicios. Añadir una prueba de integración que falle si la ruta real no consulta el gate. Esto queda fuera de esta auditoría.

### M-01 — MEDIUM — Timeout no obligatorio y sin cancelación

**Ubicación:** `malwareScanner.mjs:180-208`; `MalwareScannerPort.scanBuffer` (`:293-294`); `scanBufferWithTimeout` (`:301-305`); gate (`commercialReadinessGate.mjs:416`, `:426`).

**Impacto:** un adaptador que no use el wrapper puede colgar indefinidamente. Aunque el wrapper gane la carrera, el trabajo del scanner sigue ejecutándose. El gate acepta `scannerTimeoutMs` pero no lo usa.

**Corrección mínima:** que el único camino público de escaneo aplique timeout; pasar `AbortSignal` al adaptador; usar `scannerTimeoutMs` en el gate; probar que un adaptador sin wrapper no puede saltarse el límite.

### M-02 — MEDIUM — Circuit breaker manual, local a la instancia y sin integración con health

**Ubicación:** `commercialReadinessGate.mjs:431`, `:438-446`, `:703-707`, `:710-719`.

**Impacto:** un fallo de healthcheck no abre el circuito; solo `recordScanResult` lo hace, y cada instancia tiene su propio estado. Escaneos concurrentes pueden pisarse. La protección es fácil de eludir si el caller olvida registrar resultados.

**Corrección mínima:** abrir el circuito automáticamente ante health fallido; usar estado compartido o inyectado; proteger carreras; probar health fallido repetido y concurrencia.

### M-03 — MEDIUM — El mock aprueba cualquier buffer con aspecto real como `clean`

**Ubicación:** `malwareScanner.mjs:332-379`.

**Impacto:** si el mock se usa en un entorno de test/staging con documentos reales, los marca como limpios. La fábrica lo bloquea en producción, pero `test` está permitido y no hay señal de “solo sintético”.

**Corrección mínima:** exigir marcadores sintéticos explícitos para aprobar; rechazar o marcar `unavailable` ante buffers arbitrarios; documentar y probar el límite. Mantener el bloqueo de producción.

### M-04 — MEDIUM — Carga de evidencias sin timeout ni límite

**Ubicación:** `commercialReadinessGate.mjs:613-659`.

**Impacto:** un repositorio lento o colgado bloquea el gate y la ruta. No hay cota de tamaño ni timeout.

**Corrección mínima:** timeout fail-closed, tamaño máximo y errores tipados; test de repositorio colgado.

### M-05 — MEDIUM — DPA/legal/política solo validan metadatos, no alcance ni cláusulas

**Ubicación:** `commercialReadinessGate.mjs:153-255`.

**Impacto:** un documento con fechas/estado correctos pero alcance equivocado (otro servicio, otro uso, cláusulas ausentes) puede pasar. D17 exige DPA y validación legal aplicables, no solo vigentes.

**Corrección mínima:** modelar alcance/servicio, cláusulas mínimas y proveedor; validar contra configuración. Si la verificación es humana, registrar evidencia estructurada y no inferirla de metadatos.

### M-06 — MEDIUM — Faltan pruebas de los casos que fallan

**Ubicación:** `malwareScanner.test.mjs:150-175`; `commercialReadinessGate.test.mjs:223-243`, `:277-301`.

**Faltan tests de:** health `degraded`/`signaturesOutdated`, `unresolvedCriticalFailures` ausente, `ok: true` con Storage/DB falsos, aserción de arranque sin evidencias, adaptador fake con nombre real, DPA de proveedor distinto, timeout no aplicado por el puerto y ausencia de wiring.

**Impacto:** los defectos anteriores no se detectan en CI; la suite actual da una cobertura engañosa porque sus fixtures son dobles que satisfacen el gate.

**Corrección mínima:** agregar esos casos y un test de integración que exija el gate en la frontera real.

### L-01 — LOW — Normalización de strings inconsistente

**Ubicación:** `commercialReadinessGate.mjs:153-255`.

**Impacto:** algunos campos se recortan para el valor devuelto pero la presencia se evalúa antes del `trim`; espacios o formatos mixtos pueden producir aceptaciones/rechazos inconsistentes. No es un bypass por sí solo.

**Corrección mínima:** normalizar y validar en un solo paso; tests de strings con espacios.

### L-02 — LOW — Detalles de error y semántica de estado

**Ubicación:** `malwareScanner.mjs:121-134`; `commercialReadinessGate.mjs:438-446`.

**Impacto:** los detalles se sanitizan, pero la semántica de `failed`/`unavailable` y el código 503 no distinguen causas. No se observó filtración de rutas/secretos en las pruebas.

**Corrección mínima:** mantener sanitización; documentar códigos; tests de error con datos sensibles.

### L-03 — LOW — Entornos no producción se omiten en la aserción de arranque

**Ubicación:** `commercialReadinessGate.mjs:579-581`.

**Impacto:** cualquier entorno distinto de producción, incluido uno mal escrito, devuelve `ok: true, skipped: true`. La fábrica del scanner sí rechaza entornos no permitidos, pero la aserción por sí sola no.

**Corrección mínima:** omitir solo `development`/`test`; fallar en desconocidos.

### I-01 — INFORMATIONAL — El mock permite `test`

La documentación permite development/test local. No es una contradicción con D11, pero debe quedar explícito que `test` no es un entorno con documentos reales.

### I-02 — INFORMATIONAL — `ReadinessEvidenceRepositoryPort` es una clase adaptadora, no un puerto abstracto puro

No es un defecto de seguridad; el nombre puede inducir a confusión. La implementación real debe ser explícita y separada de los dobles de test.

---

## 7. Lo que sí funciona

- Rechazo de mock en producción por fábrica y por aserción (`malwareScanner.mjs:69-93`, `:410-419`).
- Rechazo de scanner no configurado y de placeholders por nombre.
- Timeout de 8 s y normalización de excepción/timeout a `failed`/`unavailable` en el wrapper.
- `SERVICES_REAL_DOCUMENTS_ENABLED=true` no abre el gate por sí solo.
- Bloqueo de development, de opt-in ausente y de parámetros de retención inválidos/discrepantes.
- Fallo cerrado ante repositorio de evidencias ausente o con excepción.
- Bloqueo de evidencia vencida/revocada, purga fallida, fallos no resueltos > 0 e infraestructura destructiva declarada.
- 36 tests pasaban en la auditoría original; tras el Bloque 0.1 pasan 53 y `node --check` sigue limpio.

---

## 8. Riesgo actual vs. riesgo futuro

- **Actual:** no hay ruta de Servicios que procese documentos reales ni wiring del gate. Los fallos son latentes; no se identificó un bypass HTTP explotable en este estado.
- **Futuro:** si el Bloque 1 agrega la ruta y usa el gate tal como está, H-01/H-04/H-05 pueden abrir el procesamiento con scanner degradado, purga incompleta o infraestructura no conforme. H-02/H-07 pueden hacer que el arranque y la frontera real no ejecuten D17.
- **Conclusión:** el riesgo latente es suficientemente alto para no cerrar el Bloque 0.

---

## 9. Condiciones mínimas para re-auditoría

1. Corregir H-01: precedencia negativa de salud y frescura de firmas; tests.
2. Corregir H-02: aserción de arranque completa o `evaluate()` obligatorio; tests.
3. Corregir H-03: procedencia de adaptadores/repositorio; tests de dobles rechazados.
4. Corregir H-04: campo de fallos no resueltos obligatorio; tests.
5. Corregir H-05: detalles de infraestructura mandan sobre `ok`; tests.
6. Corregir H-06: DPA asociado al proveedor activo; tests.
7. Resolver M-01/M-02: timeout obligatorio, cancelación y circuito automático/compartido.
8. Añadir cobertura estática para `.mjs` o un chequeo equivalente; documentar el lint global preexistente.
9. Implementar el wiring y la ejecución de la aserción de arranque **solo después** de autorizarlo; probar la frontera real.
10. Re-ejecutar esta auditoría con evidencias reales o adaptadores de producción verificables.

---

## 10. Veredicto

**NO APROBADO (NOT APPROVED).**

El Bloque 0 no cumple D17 de forma acumulativa ni fail-closed. Los defectos H-01 a H-07 son corregibles, pero no pueden aceptarse como base para procesar documentos reales. No se recomienda autorizar el Bloque 1 todavía.

**Recomendación:** abrir un Bloque 0.1 de corrección, mantener `SERVICES_REAL_DOCUMENTS_ENABLED=false`, no agregar rutas de documentos reales y re-auditar. Si se necesita avanzar en diseño del Bloque 1, hacerlo sin procesamiento real y sin declarar el Bloque 0 cerrado.

---

## 11. Bloque 0.1 — Correcciones y estado por hallazgo

**Fecha de corrección:** 2026-11-11
**Alcance autorizado:** `malwareScanner.mjs`, `malwareScanner.test.mjs`, `commercialReadinessGate.mjs`, `commercialReadinessGate.test.mjs`, configuración ESLint para `.mjs` y este documento.
**Fuera de alcance:** `server.mjs`, migraciones, buckets, configuración de producción, `SERVICES_REAL_DOCUMENTS_ENABLED`, rutas del Bloque 1, documentos reales y commits.

**Resultado:** **PARCIALMENTE CORREGIDO.** Las correcciones de los controles D11/D17 están implementadas y cubiertas por pruebas unitarias. H-07 sigue pendiente de autorización e integración, y M-05/M-06 tienen límites residuales. **No se declara aprobado el Bloque 0.**

### 11.1 Estado por hallazgo

| Hallazgo | Estado 0.1 | Evidencia |
|---|---|---|
| H-01 — health fail-open | **Corregido** | `normalizeHealth` exige evidencia de motor/firmas y falla ante `degraded`, `stale`, `expired`, `signaturesOutdated`, `ok:false`, estados negativos y firmas de más de 7 días. Pruebas adversariales en `malwareScanner.test.mjs`. |
| H-02 — startup parcial | **Corregido** | `assertProductionStartupSafe` diferencia app disponible de procesamiento habilitado. En producción con flag false devuelve `processingEnabled:false`; con flag true exige `evaluate().allowed`. Entornos desconocidos fallan. Se probó cada evidencia obligatoria ausente. |
| H-03 — procedencia autodeclarada | **Corregido (límite de runtime documentado)** | Producción solo construye scanner mediante `productionScannerFactory` y repositorio mediante `createReadinessEvidenceRepository`; ambos se registran en `WeakSet` privados. La inyección directa en producción se rechaza. Los dobles de test no son aceptados como productivos. Límite: JavaScript no certifica procedencia criptográfica; la garantía depende del composition root y de la integración real. |
| H-04 — purga incompleta | **Corregido** | `enabled === true` y `unresolvedCriticalFailures` entero `>= 0` son obligatorios. Ausente, `null`, string, booleano, array o negativo falla. Se probaron todos esos casos. |
| H-05 — infraestructura contradictoria | **Corregido** | `destructive` y `readOnly` deben ser booleanos estrictos; ambos buckets privados deben ser true. `ok:true` no anula detalles falsos ni contradicciones. Se probaron `ok:false`, `ok:true` incompleto, Storage falso, DB no read-only y flag destructivo inválido. |
| H-06 — DPA sin proveedor asociado | **Corregido** | El gate normaliza el proveedor activo y compara con el proveedor del DPA. Rechaza proveedor ausente, desconocido, alias engañoso y mismatch. También exige alcance de servicio y uso `document_analysis`. |
| H-07 — falta de wiring | **Pendiente por autorización** | No se modificó `server.mjs`. La única ruta de Servicios sigue siendo `/api/services/inquiries`, formulario sin documentos. No hay ejecución de la aserción de arranque ni del gate en una frontera real. |
| M-01 — timeout no obligatorio | **Corregido** | `scanWithTimeout` usa `AbortController`, límite máximo de 8 s, y el wrapper de producción aplica el timeout incluso en `scanBuffer`. `scanDocument` usa `scannerTimeoutMs`. Se probó timeout, aborto y respuesta tardía. |
| M-02 — circuit breaker manual/local | **Corregido** | Un health fallido abre el circuito automáticamente; el estado es compartido o inyectable; se probó concurrencia y recuperación solo mediante health válido. |
| M-03 — mock aprueba buffers reales | **Corregido** | El mock solo devuelve `clean` con marcador sintético explícito `LEGALUP_MOCK_SYNTHETIC_FILE`; buffers arbitrarios devuelven `unavailable`/`synthetic_fixture_required`. |
| M-04 — carga de evidencias sin timeout | **Corregido** | `loadEvidence` usa timeout fail-closed (`evidenceTimeoutMs`, default 5000 ms), límite de tamaño serializado (`maxEvidenceBytes`, default 256 KiB) y errores tipados. Se probaron repositorio colgado, inválido y sobredimensionado. |
| M-05 — alcance/cláusulas | **Parcialmente corregido** | Se modeló alcance de servicio y uso del DPA, además de políticas y validación legal. Las cláusulas contractuales mínimas siguen requiriendo verificación humana/estructurada externa; no se infieren de metadatos. |
| M-06 — faltan pruebas de fallos | **Parcialmente corregido** | Se añadieron pruebas adversariales de health, startup, procedencia, purga, infraestructura, DPA, timeout, mock, circuit breaker y evidencias inválidas. La prueba de integración de la frontera real queda pendiente junto con H-07. |
| L-01 — normalización inconsistente | **Corregido** | Se normalizan strings, fechas, scopes y booleanos; se prueban valores near-miss como `other_services` y `other_document_analysis`. |
| L-02 — detalles y semántica de error | **Corregido en el alcance** | Los detalles se sanitizan; los códigos de razón son estables. No se observaron rutas ni secretos en las pruebas. |
| L-03 — entornos omitidos | **Corregido** | Solo `development` y `test` se omiten; `production` evalúa y entornos desconocidos fallan. |
| I-01 — mock permite `test` | **Informativo, sin cambio** | `test` sigue siendo solo entorno de runner; no se usa para documentos reales. |
| I-02 — puerto/clase adaptadora | **Informativo, sin cambio** | No es un defecto de seguridad; la implementación real debe ser explícita y separada de los dobles. |

### 11.2 Cambios implementados

- Scanner de producción construido solo por fábrica síncrona; `TrustedProductionMalwareScanner` con `WeakSet` de procedencia.
- Health estricto con versión de motor, versión de firmas, `signaturesUpdatedAt` y antigüedad máxima.
- Timeout con `AbortController`; los resultados tardíos no promueven un timeout a `clean`.
- Mock limitado a fixtures sintéticos; marcador obligatorio.
- Repositorio de evidencias de producción construido solo por fábrica y registrado en `WeakSet`.
- Carga de evidencias con timeout fail-closed y límite de tamaño serializado.
- Gate acumulativo para retención, purga, infraestructura, DPA, validación legal, proveedor y scopes.
- Purga con worker habilitado y fallos no resueltos obligatorios.
- Infraestructura con validación estricta de flags y ambos buckets privados.
- DPA asociado al proveedor activo y al uso `document_analysis`; política y validación legal con alcance de Servicios.
- Startup con distinción entre aplicación disponible y procesamiento habilitado.
- Circuit breaker compartido, apertura por health fallido y recuperación solo con health válido.
- `scanDocument` como contrato de futura frontera, con gate, timeout y registro de resultado.
- ESLint efectivo para `server/services/security/**/*.mjs` con `no-undef` y `no-unused-vars`.

### 11.3 Evidencia de verificación

| Comando | Resultado 0.1 |
|---|---|
| `npx vitest run server/services/security/malwareScanner.test.mjs server/services/security/commercialReadinessGate.test.mjs` | **2 archivos, 53 tests pasan** |
| `node --check` sobre los cuatro `.mjs` | Pasa |
| `npx eslint` sobre los cuatro `.mjs` | Pasa, con reglas efectivas para `.mjs` |
| `npx eslint --print-config server/services/security/commercialReadinessGate.mjs` | Confirma `no-undef`, `no-unused-vars`, `process` global y `sourceType: module` |
| `npm run lint` | Falla por deuda preexistente: 784 problemas (700 errores, 84 warnings), sin rutas de `services/security` |
| `npm run typecheck` | Completa; **358 errores TS preexistentes**; `tsconfig.app.json` no incluye `.mjs` |
| `npx tsc --allowJs --checkJs ...` ad hoc | No limpio por inferencia sin JSDoc; no se usa como gate. ESLint es la comprobación estática efectiva de `.mjs` |
| Búsqueda de wiring en `server.mjs` | Sin imports ni ejecución del gate; H-07 pendiente |

### 11.4 Pruebas adversariales añadidas

- Health: `degraded`, `stale`, `expired`, `signaturesOutdated`, `ok:false`, versión/firma ausente, firma futura, firma vieja, timeout y excepción.
- Timeout: adaptador lento, aborto, adaptador que ignora el wrapper y respuesta tardía.
- Mock: buffer arbitrario, marcador sintético, EICAR, fallo y no disponibilidad.
- Procedencia: scanner inyectado, scanner de test, repositorio inyectado y repositorio no confiable.
- Startup: flag false, flag true, repositorio ausente y cada una de las cinco evidencias obligatorias ausente.
- Purga: deshabilitada, fallida, fallos no resueltos, campo ausente, `null`, string, booleano, array y `enabled` ausente.
- Infraestructura: destructiva, `ok:true` incompleto, `ok:false`, Storage falso, DB no read-only, Storage ausente y flag destructivo inválido.
- DPA: proveedor distinto, desconocido, near-miss, proveedor activo desconocido, alcance de servicio inválido y uso inválido.
- Gate: entorno desconocido, development/test, repositorio colgado, repositorio inválido, evidencia sobredimensionada, `scanDocument` limpio, timeout y procesamiento deshabilitado.
- Circuit breaker: health fallido, concurrencia, cooldown, estado compartido y recuperación por health.

### 11.5 Límites y riesgos residuales

- La procedencia en JavaScript es una garantía de composición, no una prueba criptográfica. Una fábrica de producción mal implementada todavía podría envolver un doble; la validación definitiva requiere adaptadores reales y pruebas de integración.
- No existen scanner real, repositorio PostgreSQL de evidencias ni Storage/DB de producción en este entorno; no se validó contra infraestructura real.
- H-07 no está implementado: no hay ejecución en arranque ni en una frontera de carga/análisis de documentos.
- M-05 sigue requiriendo verificación humana/estructurada de cláusulas contractuales; el código solo valida alcance, proveedor, estado y vigencias.
- No se usaron documentos reales ni se habilitó `SERVICES_REAL_DOCUMENTS_ENABLED`.
- No se modificaron migraciones, buckets, `server.mjs`, rutas del Bloque 1 ni configuración de producción.

### 11.6 Veredicto interno 0.1

**PARCIALMENTE CORREGIDO — NO APROBADO.**

H-01 a H-06, M-01 a M-04 y L-01 a L-03 están corregidos en código y cubiertos por pruebas unitarias. H-07 sigue pendiente de autorización; M-05 y M-06 tienen alcance parcial. El Bloque 0 no debe declararse cerrado ni habilitarse el procesamiento real hasta una re-auditoría independiente y la integración autorizada del gate.

---

## 12. Reauditoría independiente del Bloque 0.1

**Fecha:** 2026-11-12
**Tipo:** revisión independiente de solo lectura, con pruebas adversariales ejecutadas contra el código actual.
**Alcance:** `server/services/security/malwareScanner.mjs`, `commercialReadinessGate.mjs`, sus pruebas, configuración ESLint y búsqueda de wiring en `server.mjs`.
**Restricciones respetadas:** no se modificó código, tests, configuración, `server.mjs`, migraciones, buckets ni variables de entorno; no se procesaron documentos reales; no se habilitó `SERVICES_REAL_DOCUMENTS_ENABLED`; no se implementó H-07.

### 12.1 Veredicto

**NOT APPROVED — NO APROBADO.**

La mayor parte de las correcciones 0.1 está implementada y las 53 pruebas existentes pasan, pero la reauditoría encontró **tres bypasses reproducibles** en el gate y una **carrera del circuit breaker**:

1. **H-05 sigue abierto:** evidencias de infraestructura contradictorias pueden pasar si un alias positivo aparece antes que el alias negativo (`readOnly: true` oculta `databaseReadOnly: false`; `storage.serviceDocuments: true` oculta `storage.documents: false`; los flags de nivel superior se ignoran si existe `storage`).
2. **H-06 sigue abierto:** la normalización por regex acepta proveedores ajenos que contienen el nombre del proveedor activo con un separador, por ejemplo `not-openai`, como si fueran `openai`.
3. **H-01 tiene un residual:** respuestas de salud malformadas con cadenas negativas (`healthy: "false"`, `ok: "false"`, `degraded: "true"`) se consideran saludables si el estado es `healthy`.
4. **M-02 tiene una carrera:** un healthcheck iniciado antes de una falla puede completar después y borrar `openUntil`, dejando el gate abierto sin un healthcheck posterior a la falla.
5. **H-07 sigue pendiente:** el gate no se ejecuta en `app.listen` ni en una frontera real de documentos.

Por estos motivos el Bloque 0.1 **no puede declararse cerrado** ni habilitarse el procesamiento comercial real. El estado correcto es **correcciones parciales verificadas, con hallazgos altos aún abiertos**.

### 12.2 Resultado por hallazgo

| Hallazgo | Resultado independiente | Evidencia |
|---|---|---|
| H-01 — health fail-open | **PARCIAL** | Los casos booleanos de `degraded`, `stale`, `expired`, `signaturesOutdated`, `ok:false` y firmas vencidas/futuras están cubiertos (`malwareScanner.mjs:290-344`; `malwareScanner.test.mjs:224-295`). Sin embargo, valores string malformados no se rechazan: `healthy: "false"` y `ok: "false"` se ignoran y `status: "healthy"` prevalece (`malwareScanner.mjs:292-317`). Probe: el gate devolvió `allowed:true` con un scanner cuyo health era `{healthy:"false", status:"healthy", ...}`. |
| H-02 — startup parcial | **CORREGIDO (sin wiring)** | `assertProductionStartupSafe` exige `evaluate().allowed` cuando producción tiene el flag activo y falla para entornos desconocidos (`commercialReadinessGate.mjs:836-889`). Tests de flag false, flag true, evidencia ausente y entornos en `commercialReadinessGate.test.mjs:515-590`. No se ejecuta en el servidor: ver H-07. |
| H-03 — procedencia autodeclarada | **CORREGIDO CON LÍMITE DE RUNTIME** | Producción rechaza inyección directa y usa `productionScannerFactory`/`createReadinessEvidenceRepository` con `WeakSet` privados (`malwareScanner.mjs:41,87-89,595-625`; `commercialReadinessGate.mjs:110,567-621`). Tests en `malwareScanner.test.mjs:298-356` y `commercialReadinessGate.test.mjs:233-244,717-730`. No hay prueba criptográfica de procedencia; una fábrica de producción mal implementada sigue siendo un límite de composición. |
| H-04 — purga incompleta | **CORREGIDO** | `enabled` y `unresolvedCriticalFailures` son obligatorios; ausente, `null`, string, booleano, array y negativo fallan (`commercialReadinessGate.mjs:370-427`; pruebas `commercialReadinessGate.test.mjs:374-416`). |
| H-05 — infraestructura contradictoria | **NO CORREGIDO** | La selección de alias usa el primer valor presente (`valueOf`, `commercialReadinessGate.mjs:112-119`). `normalizeInfrastructure` no compara alias contradictorios (`:429-474`). Probe con `{readOnly:true, databaseReadOnly:false}` devolvió `allowed:true`; igual con `storage:{serviceDocuments:true, documents:false}` y con `storageDocuments:false` + `storage` positivo. El test existente solo prueba ambos flags en falso, no la contradicción (`commercialReadinessGate.test.mjs:418-455`). |
| H-06 — DPA sin proveedor asociado | **NO CORREGIDO** | `normalizeProviderIdentity` usa regex con límites de palabra: `/\bopenai\b/` acepta `not-openai`, `evil-openai`, etc. (`commercialReadinessGate.mjs:152-160`). La comparación del gate confía en esa normalización (`:1184-1191`). Probe con DPA `provider:"not-openai"` y `aiProvider:"openai"` devolvió `allowed:true`. El test solo cubre `notopenai` sin separador (`commercialReadinessGate.test.mjs:350-352`). |
| H-07 — wiring ausente | **PENDIENTE / FAIL** | `server.mjs` no importa `services/security`; `/api/services/inquiries` es un formulario sin documentos (`server.mjs:539-547`) y `app.listen` (`:14419`) no ejecuta la aserción. No hay frontera que llame al gate. |
| M-01 — timeout no obligatorio | **CORREGIDO** | `scanWithTimeout` usa `AbortController`, limita a 8 s y clasifica timeout como `unavailable`; el wrapper de producción aplica el timeout (`malwareScanner.mjs:195-268,448-475`). Pruebas de aborto, respuesta tardía y timeout en `malwareScanner.test.mjs:147-185,366-377`. |
| M-02 — circuit breaker manual/local | **PARCIAL** | El health fallido abre el circuito y el estado es inyectable/compartido (`commercialReadinessGate.mjs:684-695,1006-1027`). Pero `checkScanner` borra `openUntil` en cualquier health exitoso (`:1027`), incluso si una falla ocurrió mientras el health estaba en vuelo. Probe con dos instancias y health diferido: `{"allowed":true,"circuitOpenUntil":0}`. El test llamado “concurrencia” es secuencial y solo prueba `recordScanResult` (`commercialReadinessGate.test.mjs:630-647`). |
| M-03 — mock aprueba buffers reales | **CORREGIDO** | El mock solo devuelve `clean` con `LEGALUP_MOCK_SYNTHETIC_FILE`; buffers arbitrarios devuelven `unavailable`/`synthetic_fixture_required` (`malwareScanner.mjs:550-557`; pruebas `malwareScanner.test.mjs:66-84`). |
| M-04 — carga de evidencias sin timeout | **CORREGIDO CON RESIDUAL** | Hay timeout fail-closed y límite de tamaño serializado (`commercialReadinessGate.mjs:907-957`; pruebas `commercialReadinessGate.test.mjs:457-493`). Residual: el límite se aplica después de que el repositorio ya cargó el objeto y el timeout no cancela el trabajo subyacente. |
| M-05 — alcance/cláusulas | **PARCIAL** | Se validan scopes de Servicios y `document_analysis` (`commercialReadinessGate.mjs:300-313`; pruebas `commercialReadinessGate.test.mjs:312-344`), pero las cláusulas contractuales mínimas siguen sin verificación estructurada. |
| M-06 — faltan pruebas de fallos | **PARCIAL** | Las 53 pruebas cubren muchos casos, pero faltan exactamente los bypasses de esta reauditoría: alias contradictorios, proveedor con separador y health con strings negativos. La prueba de integración sigue bloqueada por H-07. |
| L-01 — normalización inconsistente | **PARCIAL** | Fechas, scopes y booleanos se normalizan, pero la normalización de proveedor introduce el bypass de H-06. |
| L-02 — detalles y semántica | **CORREGIDO CON RESIDUAL** | `details` se sanitiza (`malwareScanner.mjs:158-193`), pero `provider` se devuelve sin sanitizar desde el resultado o el nombre del scanner (`:165-186`). No se observó fuga en las pruebas. |
| L-03 — entornos omitidos | **CORREGIDO** | Solo `development` y `test` se omiten; `production` evalúa y entornos desconocidos fallan (`commercialReadinessGate.mjs:836-889`; pruebas `commercialReadinessGate.test.mjs:568-590`). |

### 12.3 Evidencia ejecutada en esta reauditoría

| Comprobación | Resultado |
|---|---|
| `npx vitest run server/services/security/malwareScanner.test.mjs server/services/security/commercialReadinessGate.test.mjs` | **2 archivos, 53 tests pasan** |
| `node --check` sobre los cuatro `.mjs` | Pasa sin salida |
| `npx eslint` sobre los cuatro `.mjs` | Pasa sin salida |
| `npx eslint --print-config server/services/security/commercialReadinessGate.mjs` | Confirma `no-undef`, `no-unused-vars`, `process` global, `sourceType: module` |
| `npm run typecheck` | Completa con **358 errores TS preexistentes**; `tsconfig.app.json` incluye solo `src`, por lo que no cubre los `.mjs` |
| `npm run lint` | **784 problemas (700 errores, 84 warnings)** preexistentes, sin rutas de `server/services/security` |
| Búsqueda en `server.mjs` | Sin imports ni ejecución de `services/security`; única ruta Services sin documentos (`:539-547`); `app.listen` sin aserción (`:14419`) |

### 12.4 Pruebas adversariales que fallaron

Los siguientes probes se ejecutaron con Node contra los módulos actuales, sin persistir archivos ni modificar el árbol:

```text
provider-spoof {"allowed":true,"reasons":[]}
infra-contradiction {"allowed":true,"reasons":[]}
storage-alias-contradiction {"allowed":true,"reasons":[]}
top-level-conflict {"allowed":true,"reasons":[]}
db-alias-contradiction {"allowed":true,"reasons":[]}
healthy-string-false {"healthy":true}
ok-string-false {"healthy":true}
degraded-string-true {"healthy":true}
stale-string-true {"healthy":true}
circuit-race {"allowed":true,"circuitOpenUntil":0,"reasons":[]}
```

Estos resultados contradicen las afirmaciones de la sección 11.1 de que H-05 y H-06 estaban corregidos y de que H-01 fallaba cerrado ante cualquier señal negativa. No contradicen las 53 pruebas existentes porque esos casos no están cubiertos por ellas.

### 12.5 Riesgos residuales y límites

- **H-05:** una evidencia con aliases contradictorios puede describir una verificación destructiva o un bucket no conforme y aun así abrir el gate. La corrección debe rechazar cualquier contradicción entre aliases, no elegir el primero.
- **H-06:** un DPA de un proveedor ajeno cuyo nombre contenga `-openai`, `-openrouter`, etc. puede asociarse al proveedor activo. La normalización debe usar identidades exactas o una allowlist cerrada, no búsqueda por substring con límites de palabra.
- **H-01 residual:** un adaptador que devuelva strings en lugar de booleanos puede abrir el gate. Debe exigirse el tipo booleano para `healthy`, `ok`, `degraded`, `stale`, `outdated`, `expired` y `signaturesOutdated`, o rechazar cualquier valor no booleano.
- **M-02 residual:** un healthcheck en vuelo puede cerrar el circuito después de una falla. La recuperación debería exigir un healthcheck iniciado después de `lastFailureAt` o después del cooldown, no solo un resultado exitoso de una comprobación antigua.
- **H-07:** mientras no se ejecute `assertProductionStartupSafe` en el arranque y no se revalide el gate en `upload-url`, `finalize` y `analysis`, los controles permanecen inertes frente a una ruta real.
- **M-05/M-06:** las cláusulas contractuales requieren verificación humana/estructurada externa; no hay prueba de integración de la frontera real.
- No se validó contra un scanner real, PostgreSQL de evidencias, Storage ni DB de producción.

### 12.6 Recomendación de la reauditoría

**No autorizar el cierre del Bloque 0 ni el Bloque 1.** Antes de una nueva aprobación:

1. Corregir H-05 para rechazar contradicciones entre `readOnly`/`databaseReadOnly`, `storage.*`/flags de nivel superior y aliases de buckets.
2. Corregir H-06 con identidades de proveedor exactas o allowlist cerrada, y agregar pruebas para `not-openai`, `evil-openai`, `openai-evil` y variantes con separadores.
3. Endurecer H-01 para rechazar valores no booleanos en todas las señales de salud.
4. Corregir la carrera de M-02 y reemplazar la prueba secuencial por una prueba con health diferido real.
5. Mantener `SERVICES_REAL_DOCUMENTS_ENABLED=false` y no agregar rutas de documentos hasta autorizar e implementar H-07 con pruebas de integración.

**Estado final de esta reauditoría:** **NO APROBADO.** Las correcciones 0.1 son una mejora verificable, pero H-01, H-05, H-06, M-02 y H-07 impiden declarar D11/D17 fail-closed.

---

## 13. Bloque 0.2 — Correcciones de hallazgos altos

**Fecha:** 2026-11-12
**Tipo:** corrección autorizada de H-05, H-06, H-01 residual y M-02, con pruebas de regresión.
**Archivos modificados:** `server/services/security/malwareScanner.mjs`, `server/services/security/commercialReadinessGate.mjs`, sus pruebas y este informe.
**Restricciones respetadas:** no se modificaron `server.mjs`, rutas de procesamiento, migraciones/esquema, buckets, flujos comerciales de Servicios ni configuración de producción; no se procesaron documentos reales; no se habilitó `SERVICES_REAL_DOCUMENTS_ENABLED`; no se implementó H-07; no se creó ningún commit.

### 13.1 Resultado

**CORRECCIONES 0.2 VERIFICADAS EN CÓDIGO Y PRUEBAS — BLOQUE 0 SIGUE NO APROBADO.**

H-05, H-06, H-01 residual y la carrera de M-02 quedaron corregidos y cubiertos por pruebas adversariales. Sin embargo, H-07 continúa pendiente y M-05/M-06 conservan alcance parcial. Esta sección no sustituye una reauditoría independiente y no autoriza declarar D17 satisfecho ni iniciar el Bloque 1.

### 13.2 Evidencia antes/después

La reauditoría §12 dejó una línea base de **53 tests pasando** y cuatro bypasses reproducibles. Se agregaron primero pruebas de regresión; antes de corregir el código, la suite quedó en **59 tests con 4 fallos**:

| Prueba de regresión | Resultado antes de corregir |
|---|---|
| `compara el proveedor canónico exacto sin aceptar prefijos ni sufijos` | Falló: un DPA con proveedor no canónico devolvía `allowed:true` y la lista de razones vacía. |
| `rechaza aliases contradictorios de infraestructura sin aplicar precedencia` | Falló: `readOnly:true` + `databaseReadOnly:false` (y los demás aliases contradictorios) devolvía `allowed:true`. |
| `no cierra el circuito si una falla ocurre durante el healthcheck en vuelo` | Falló: un health exitoso iniciado antes de la falla borraba `openUntil` y devolvía `allowed:true`. |
| `rechaza señales de salud con tipos inesperados o strings negativos` | Falló: `healthy:"false"`, `ok:"false"`, `degraded:"true"` y tipos inválidos se interpretaban como saludables si el estado era `healthy`. |

Después de las correcciones, la misma suite pasa completa:

```text
Test Files  2 passed (2)
Tests       60 passed (60)
```

Se agregaron **7 pruebas** en total: proveedor canónico exacto, aliases contradictorios, aliases equivalentes, carrera del circuito, recuperación posterior al cooldown, tipos de salud directos y tipos de salud a través del gate.

### 13.3 Cambios implementados

| Hallazgo | Corrección | Ubicación |
|---|---|---|
| H-05 — infraestructura contradictoria | Se reemplazó la precedencia por recolección de todos los aliases propios. Cada alias debe ser booleano estricto y todos deben coincidir. `storage` y los flags de nivel superior se comparan entre sí; un `storage` inválido ya no cae silenciosamente al flag superior. Las contradicciones usan `INFRASTRUCTURE_CHECK_FAILED`. | `commercialReadinessGate.mjs:136-199`, `:485-570`; pruebas `commercialReadinessGate.test.mjs:488-545` |
| H-06 — proveedor asociado incorrectamente | Se eliminó la búsqueda por regex/substring. La identidad se normaliza con `trim().toLowerCase()` y se resuelve contra una allowlist cerrada de identificadores exactos. Valores como `not-openai`, `openai-compatible`, `evil-openai`, `openai-evil`, `openai2`, `open ai`, `openrouter` y `OpenAI, Inc.` no equivalen a `openai`; solo espacios exteriores y mayúsculas se normalizan. | `commercialReadinessGate.mjs:205-217`, `:743`, `:1285-1290`; pruebas `commercialReadinessGate.test.mjs:374-403` |
| H-01 residual — health con tipos inesperados | `healthy`, `ok`, `degraded`, `stale`, `outdated`, `expired` y `signaturesOutdated` deben ser booleanos; `status` debe ser string. En modo estricto, versiones y aliases deben ser strings no vacíos y consistentes; el timestamp debe ser válido y consistente entre aliases. Valores no booleanos, strings negativos, objetos y números en versiones fallan cerrado. | `malwareScanner.mjs:270-430`, `:444`; pruebas `malwareScanner.test.mjs:245-269` y `commercialReadinessGate.test.mjs:805-821` |
| M-02 residual — carrera del circuit breaker | Cada falla incrementa `failureRevision`. `checkScanner` captura la revisión antes del healthcheck y la revalida después; un resultado exitoso de un health iniciado antes de una falla no puede cerrar el circuito. En ese caso devuelve `SCANNER_CIRCUIT_OPEN`. La recuperación sigue funcionando con un health iniciado después del cooldown. | `commercialReadinessGate.mjs:768-783`, `:1050-1120`; pruebas `commercialReadinessGate.test.mjs:749-803` |

### 13.4 Verificación ejecutada

| Comando | Resultado 0.2 |
|---|---|
| `npx vitest run server/services/security/malwareScanner.test.mjs server/services/security/commercialReadinessGate.test.mjs` | **2 archivos, 60 tests pasan** |
| `node --check server/services/security/malwareScanner.mjs` | Pasa |
| `node --check server/services/security/commercialReadinessGate.mjs` | Pasa |
| `npx eslint` sobre los cuatro `.mjs` de seguridad | Pasa sin salida |
| `npm run typecheck` | Completa con **358 errores TS preexistentes**; `tsconfig.app.json` no incluye `.mjs` |
| `npm run lint` | **784 problemas (700 errores, 84 warnings)** preexistentes; ninguna ruta de `server/services/security` en la salida |
| Revisión de `server.mjs` / `git status` | Sin cambios en `server.mjs`; no hay wiring nuevo del gate |

### 13.5 Límites que permanecen

- **H-07 sigue pendiente:** el gate no se ejecuta en `app.listen`, `upload-url`, `finalize` ni `analysis`. Los controles corregidos siguen sin estar conectados a una frontera real de documentos.
- **M-02 sigue siendo estado local al proceso:** la carrera fue corregida, pero el circuit breaker no es una garantía distribuida ni persistente entre instancias.
- **M-05/M-06 siguen parciales:** no hay verificación estructurada de cláusulas contractuales ni prueba de integración de la frontera real. Las nuevas pruebas cubren los bypasses de esta ronda, no toda la matriz de fallos.
- **H-03 conserva su límite de composición:** la procedencia en JavaScript no es una prueba criptográfica; una fábrica de producción mal implementada podría envolver un doble.
- No se validó contra scanner real, PostgreSQL de evidencias, Storage ni DB de producción.
- No se procesaron documentos reales ni se habilitó el procesamiento comercial.

### 13.6 Veredicto 0.2

**NO APROBADO.** H-05, H-06, H-01 residual y la carrera de M-02 están corregidos en código y cubiertos por pruebas. El Bloque 0 no puede cerrarse mientras H-07 no esté implementado y verificado, y mientras M-05/M-06 no cuenten con evidencia suficiente. Mantener `SERVICES_REAL_DOCUMENTS_ENABLED=false` y no iniciar el Bloque 1.

---

## 14. Cierre administrativo de H-07 — BLOCKED

**Fecha:** 2026-11-12
**Estado de H-07:** **BLOCKED — no RESOLVED.**
**Alcance de esta sección:** documental únicamente.

H-07 no puede completarse porque el flujo de documentos de LegalUp Services todavía no existe como frontera real. La única ruta de Services es `/api/services/inquiries`, un formulario sin archivos ni procesamiento documental (`server.mjs:539-547`). No existen rutas `upload-url`, `finalize`, registro, análisis, listado o cuarentena de documentos de Services, ni el modelo/tablas/buckets asociados. Por ello no hay un punto de entrada real donde integrar y verificar el gate.

### 14.1 Dependencia explícita

**H-07 depende de la implementación de las rutas y del modelo de documentos de Services en Block 1.** Como mínimo deben existir la orden de servicio, el registro de documentos, la carga/finalización y el análisis, con autenticación y persistencia reales. Después de esa implementación, H-07 requerirá:

1. ejecutar la aserción de arranque en la inicialización del servidor;
2. revalidar el gate en cada operación que acepte o procese documentos de Services;
3. responder `503` con `SERVICES_NOT_READY_FOR_REAL_DOCUMENTS` cuando el gate esté cerrado;
4. añadir pruebas de integración contra las rutas reales, no solo funciones aisladas.

### 14.2 Restricciones respetadas

- No se modificó código, `server.mjs`, rutas, migraciones, Storage ni infraestructura.
- No se crearon guards sin consumidores, rutas simuladas ni pruebas sintéticas presentadas como integración.
- No se procesaron documentos reales.
- `SERVICES_REAL_DOCUMENTS_ENABLED` no fue modificado y debe permanecer `false`.

### 14.3 Consecuencia

Este cierre administrativo **no significa que H-07 esté implementado**, ni que el Bloque 0 o D17 estén aprobados. El procesamiento comercial real sigue deshabilitado y Block 1 no queda autorizado por esta sección.

**Verificación:** las 60 pruebas de seguridad existentes pasan; no se añadieron ni modificaron pruebas; el único cambio de esta sección es documental.
