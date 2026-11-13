# Auditoría Técnica y Documental de Preparación — LegalUp Services Sprint 2

**Fecha de emisión:** 11 de noviembre de 2026\
**Documento de referencia técnica:** `docs/services/SPRINT_2_TECHNICAL_DESIGN.md`\
**Repositorio:** `upLegal/upLegal` (`feat/ua4-letter-pages-phase2`)\
**Carácter del informe:** Exclusivamente auditoría técnica y contractual. No introduce modificaciones de código ni cambios en base de datos.

---

## 1. Resumen Ejecutivo

La presente auditoría evalúa el estado real y documental de los tres bloqueadores externos identificados antes de iniciar el **Sprint 2 de LegalUp Services**:
1. **Escaneo antimalware** de documentos contractuales y comprobantes de pago.
2. **Política de retención y eliminación documental** en almacenamiento y base de datos.
3. **Condiciones contractuales, DPA y privacidad** del proveedor de Inteligencia Artificial.

### Diagnóstico Global

| Dimensión | Estado Técnico | Estado Contractual / Negocio | ¿Bloquea Implementación (Código)? | ¿Bloquea Producción (Documentos Reales)? |
|---|---|---|---|---|
| **1. Scanner Antimalware** | **NO IMPLEMENTADO** | **DECISIÓN PENDIENTE** (selección de proveedor/SLA) | **NO** (si se implementa adapter desacoplado con mock para development) | **SÍ (BLOQUEADOR CRÍTICO)** |
| **2. Retención y Eliminación** | **PARCIAL** (capacidades base sin job automático) | **DECISIÓN PENDIENTE** (plazos comerciales, fiscales y legales) | **NO** (el modelo de datos soporta los campos necesarios) | **SÍ (BLOQUEADOR CRÍTICO)** |
| **3. Proveedor IA (Privacidad/DPA)** | **PARCIAL** (ZDR técnico en OpenRouter, pero default OpenAI) | **PENDIENTE EXTERNO** (sin DPA firmado ni enterprise agreement) | **NO** (pipeline de análisis reutilizable) | **SÍ (BLOQUEADOR CRÍTICO)** |

### Veredicto

- **Para comenzar la implementación de código (entorno development):** **LISTO CON CONDICIONES.** Se puede implementar la arquitectura completa de Sprint 2 (tablas, RLS, máquina de estados, endpoints, UI de revisión), siempre que el subsistema de malware se diseñe como un puerto/interfaz desacoplado que permita emular escaneos con archivos sintéticos exclusivamente en development. En development está prohibido procesar documentos reales.
- **Para la puesta en producción y operación con documentos reales:** **NO LISTO (BLOQUEADO).** No se debe permitir la carga ni el procesamiento de contratos corporativos confidenciales de clientes hasta que se cumplan copulativamente las cinco condiciones del gate de producción (D17): scanner antimalware real operativo, política de retención aprobada, purga probada, marco de IA con DPA confirmado y validaciones legales completadas.

---

## 2. Estado del Scanner Antimalware

### 2.1 Hallazgos en el Repositorio e Infraestructura

1. **Inexistencia de motor o integración antivirus:**
   - **Evidencia:** Una búsqueda exhaustiva en el repositorio (`antivirus`, `clamav`, `virustotal`, `malware`, `quarantine`, `scan_status`) arroja coincidencias únicamente dentro de `docs/services/SPRINT_2_TECHNICAL_DESIGN.md`.
   - Ni en `package.json`, ni en `server/`, ni en `supabase/migrations/` existe software, SDK o cliente HTTP integrado para análisis de archivos maliciosos (ej. ClamAV, VirusTotal API, AWS GuardDuty / S3 Malware Protection, MetaDefender).
   - **Estado:** `NO IMPLEMENTADO`.

2. **Exposición de archivos previa al escaneo en flujos vigentes:**
   - **Evidencia en LegalUp AI (`ai-documents`):**
     - En `src/hooks/useAIDocuments.ts:221-230`, el navegador del usuario sube el archivo PDF directamente al bucket privado `ai-documents` mediante el SDK de cliente de Supabase (`supabase.storage.from(AI_DOCUMENTS_BUCKET).upload(...)`).
     - En `server.mjs:10511-10517` (`extractTextFromStoredPdf`), el backend descarga directamente el archivo y lo entrega a la librería de extracción `server/ai/pdfText.mjs` sin ningún filtro antimalware.
   - **Evidencia en Documentos de Empresa (`company_request_documents`):**
     - En `server.mjs:5878-5900`, la ruta `POST /api/empresas/requests/:requestId/documents` inserta en base de datos una `fileUrl` provista directamente por el cliente sin validación ni escaneo.
   - **Estado:** `RIESGO EN VIGENCIA`.

3. **Mecanismo de aislamiento y cuarentena:**
   - En el código actual no existe aislamiento de objetos: los archivos se almacenan directamente en sus rutas de trabajo definitivas.
   - En el diseño de Sprint 2 (`SPRINT_2_TECHNICAL_DESIGN.md: D3, D11`), se contempla aislar los archivos en el prefijo `quarantine/{company_id}/{order_id}/...` hasta su escaneo, moviéndolos a `clean/...` solo con `scan_status = 'clean'`.
   - **Estado:** `NO IMPLEMENTADO` en código; `VERIFICADO` en diseño conceptual.

4. **Validaciones de tipo MIME, extensión, tamaño y contenido:**
   - **Tamaño:**
     - En `supabase/migrations/20260803000200_ai_documents_bucket_size_limit.sql`, el bucket `ai-documents` tiene configurado a nivel de Storage `file_size_limit = 20971520` (20 MB).
     - Sprint 2 proyecta 20 MB para `service-documents` y 10 MB para `service-payment-proofs`.
   - **MIME y Extensión:**
     - `ai-documents` tiene restricción de bucket `allowed_mime_types = array['application/pdf']`.
     - Sprint 2 proyecta `application/pdf` para contratos y `application/pdf, image/png, image/jpeg` para comprobantes.
   - **Contenido (Magic Bytes):**
     - En `server/ai/pdfText.mjs:71`, la función `extractPdfText` inspecciona los primeros 5 bytes (`head !== '%PDF-'`) antes de parsear con `pdfjs-dist`.
     - **Brecha:** No existe validación de magic bytes para imágenes PNG (`89 50 4E 47`) ni JPEG (`FF D8 FF`) en ningún módulo del servidor.
   - **Estado:** `PARCIAL`.

5. **Estado persistente del escaneo:**
   - En la base de datos actual no existe ninguna columna `scan_status` ni tabla de incidentes de seguridad.
   - Sprint 2 define formalmente `scan_status` (`pending`, `scanning`, `clean`, `infected`, `failed`, `unavailable`) en `service_order_documents` y `proof_scan_status` en `service_order_payments`.
   - **Estado:** `NO IMPLEMENTADO` en base de datos; `VERIFICADO` en diseño conceptual.

### 2.2 Requisitos Mínimos para Producción

Para que la solución antimalware sea apta para producción sin seleccionar arbitrariamente un proveedor en este momento, el subsistema debe cumplir con los siguientes requisitos funcionales y de arquitectura:

1. **Arquitectura desacoplada (Patrón Adapter / Port):**
   - El backend debe definir una interfaz abstracta (`MalwareScanner`) con firma:
     `scanBuffer({ buffer, filename, mimeType }): Promise<{ status: 'clean'|'infected'|'failed'|'unavailable', details?: string }>`
   - Esto permite usar un `MockMalwareScanner` exclusivamente en el entorno `development` (que aprueba o simula infecciones controladas únicamente con buffers sintéticos como la firma estándar EICAR) y exigir un motor antimalware real en `production` sin modificar la lógica de negocio.
2. **Ejecución Asíncrona o con Timeout Estricto:**
   - Archivos PDF de hasta 20 MB pueden tardar varios segundos en ser transferidos y analizados por un servicio externo. Si se ejecuta dentro de la petición HTTP del usuario (`finalize`), el timeout debe ser estrictamente controlado (máximo 8–10 segundos) o ejecutarse en una tarea de fondo para evitar saturar los workers del backend en Render.
3. **Manejo Estricto de Cuarentena (Fail-Closed):**
   - Ante indisponibilidad de red, timeout o fallo del escáner (`unavailable` o `failed`), el archivo **nunca** debe ser procesado por el parser PDF ni enviado a la IA. Debe permanecer en `quarantine/` y en estado `quarantined`.
4. **Respuesta ante Archivos Infectados (`infected`):**
   - Si se detecta malware, el archivo debe ser eliminado inmediatamente de Supabase Storage.
   - La fila en base de datos debe marcarse `rejected`, con `deleted_at = now()`, registrando un evento de seguridad sanitizado (sin exponer detalles del exploit ni rutas de archivo en logs públicos).
5. **Validación de Magic Bytes previa al escaneo:**
   - Todo archivo debe superar la verificación de cabecera hexadecimal antes de llamar al escáner:
     - PDF: `%PDF-` (`0x25 0x50 0x44 0x46 0x2D`)
     - PNG: `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`)
     - JPEG: `\xFF\xD8\xFF` (`0xFF 0xD8 0xFF`)

---

## 3. Retención y Eliminación Documental

### 3.1 Inventario de Almacenamiento y Referencias

| Tipo de Documento | Ubicación en Storage | Ubicación en Base de Datos | Entidades que Referencian |
|---|---|---|---|
| **Contratos e Insumos de Clientes (Sprint 2)** | `service-documents` (privado) | `service_order_documents` | `service_orders`, `service_order_analyses`, `service_order_retention_actions` |
| **Comprobantes de Pago (Sprint 2)** | `service-payment-proofs` (privado) | `service_order_payments` | `service_orders`, `service_order_quotes`, `service_order_retention_actions` |
| **Documentos LegalUp AI (Existente)** | `ai-documents` (privado) | `ai_documents`, `ai_documents.extracted_text` | `ai_workspaces`, `ai_document_analyses`, `ai_case_intelligence_snapshots`, `lawyer_cases` |
| **Documentos Generados / Tienda (Existente)** | `documents` (público) | `generated_documents`, `generated_documents.payload` | `generated_documents` (compras, descargas) |
| **Documentos Empresa (Existente)** | `documents` o URLs externas | `company_request_documents` | `company_requests`, `companies` |

### 3.2 Mecanismos Existentes de Eliminación y Limpieza

1. **Eliminación manual por usuario:**
   - **LegalUp AI:** Existe `DELETE /api/ai/documents/:id` (`server.mjs:10910-10940`). Elimina el objeto en Storage (`supabase.storage.from('ai-documents').remove([doc.file_path])`) y borra la fila en `ai_documents`.
   - **Casos de Abogados:** `supabase/migrations/20260926000000_safe_case_deletion.sql` contiene la función `can_delete_lawyer_case()`, que **prohíbe expresamente** la eliminación de cualquier caso que contenga documentos, análisis o mensajes. Solo permite el borrado de casos vacíos creados por error.
   - **Empresas y Documentos Generados:** No existen endpoints de eliminación para `company_request_documents` ni para `generated_documents`.
2. **Procesos automáticos de eliminación o limpieza (Crons / Purge Jobs):**
   - **Evidencia:** No existen crons de purga en `server.mjs`, ni en `.github/workflows/`, ni procedimientos programados vía `pg_cron` en Supabase.
   - El único cron existente en el sistema es `POST /api/cron/prospecting` (`server.mjs:531`), destinado exclusivamente a prospección comercial.
   - **Estado:** `NO IMPLEMENTADO`.
3. **Comportamiento en órdenes terminales (Canceladas, Expiradas, Cerradas, Entregadas):**
   - Actualmente, ningún archivo asociado a solicitudes canceladas o finalizadas es eliminado de Storage ni de la base de datos; permanecen de forma indefinida.
   - En el diseño de Sprint 2, se define la máquina de estados y las columnas `retention_until`, `legal_hold`, `purge_started_at` y `purged_at` (`SPRINT_2_TECHNICAL_DESIGN.md: 7.12`), pero se deja explícitamente pendiente la definición de plazos.

### 3.3 Matriz de Retención: Capacidades, Decisiones y Validaciones

```
+----------------------------------------------------------------------------------------------------+
|                                    MATRIZ DE RETENCIÓN DOCUMENTAL                                  |
+------------------------------+---------------------------+-----------------------+-----------------+
| Entidad / Archivo            | Capacidad Técnica Actual  | Decisión de Negocio   | Validación      |
|                              |                           | Pendiente             | Legal Pendiente |
+------------------------------+---------------------------+-----------------------+-----------------+
| Contratos Insumo y Anexos    | Modelo de datos diseñado  | Plazo tras entrega    | Plazo sujeto a  |
| (Subidos por cliente)        | en Sprint 2; requiere job | (parámetro abierto);  | validación legal|
|                              | de purga de Storage y DB. | política de retención | externa (C.C. / |
|                              |                           | para canceladas.      | prescripción).  |
+------------------------------+---------------------------+-----------------------+-----------------+
| Informes Entregables         | Modelo de datos diseñado; | Plazo de acceso del   | Plazo legal de  |
| (Dictamen final aprobado)    | soporte de descarga       | cliente a su copia en | custodia del    |
|                              | firmada.                  | la plataforma.        | encargo.        |
+------------------------------+---------------------------+-----------------------+-----------------+
| Comprobantes de Pago         | Bucket separado proyecta- | Plazo de purga del    | Conservación    |
| (Vouchers con datos bancarios| do; eliminación indepen-  | voucher una vez       | tributaria bajo |
| y RUT)                       | diente de la orden.       | conciliado.           | validación      |
|                              |                           |                       | tributaria ext. |
+------------------------------+---------------------------+-----------------------+-----------------+
| Registros Contables / Pagos  | Campos inmutables en base | Conservar registro    | Obligaciones    |
| (Montos, fechas, referencias)| de datos.                 | financiero perpetuo   | contables según |
|                              |                           | sin el archivo gráfico| normativa SII.  |
+------------------------------+---------------------------+-----------------------+-----------------+
| Auditoría y Eventos          | Append-only en diseño     | Conservación perm-    | Plazo para des- |
| (`service_order_events`)     | (`service_order_events`). | anente de logs para   | virtuación de   |
|                              |                           | trazabilidad legal.   | negligencias.   |
+------------------------------+---------------------------+-----------------------+-----------------+
| Textos Extraídos y Análisis  | Guardados en PostgreSQL   | Momento exacto de     | Principio de    |
| (`service_order_analyses`)   | en texto plano/JSON; debe | purga de la base de   | minimización de |
|                              | incluirse en purga v1.    | datos.                | Ley 21.719.     |
+------------------------------+---------------------------+-----------------------+-----------------+
```

---

## 4. Proveedor de IA: Condiciones Contractuales y Privacidad

### 4.1 Configuración Técnica y Flujo de Datos

- **Punto central de invocación:** Toda inferencia hacia modelos LLM está centralizada en `server/ai/provider.mjs` (`chatCompletion`) y `server/ai/ragEmbeddings.mjs` (`embedBatch`).
- **Valores por defecto en el código (`server/ai/provider.mjs:13-15`):**
  - `AI_PROVIDER_BASE_URL`: por defecto `https://api.openai.com/v1`.
  - `AI_DEFAULT_MODEL`: por defecto `gpt-4o-mini`.
  - `detectAIProvider(baseUrl)`: clasifica según el host (`openrouter`, `openai`, `groq`, etc.).
- **Política ZDR implementada en código (`server/ai/provider.mjs:27-36`):**
  ```javascript
  export function getPrivacyPolicy(baseUrl) {
    const provider = detectAIProvider(baseUrl);
    if (provider === 'openrouter') {
      return { zdr: true, data_collection: 'deny' };
    }
    return null;
  }
  ```
  - **Hallazgo Crítico:** La política ZDR y de denegación de recolección de datos se inyecta en el payload HTTP **únicamente** si `AI_PROVIDER_BASE_URL` incluye `openrouter`. Si la variable de entorno no está configurada o apunta a OpenAI directo, el parámetro `provider` **no se envía**.
- **Contenido enviado al LLM:**
  - En `server.mjs:10630-10670`, el análisis de documentos extrae hasta `80.000` caracteres del texto crudo del documento (`MAX_EXTRACTED_TEXT_CHARS`) y lo concatena directamente en el prompt del sistema (`buildAnalysisUserPrompt`).
  - El contenido no pasa por ninguna capa de anonimización ni redaction de PII (nombres, RUTs, cifras confidenciales, domicilios).

### 4.2 Precisiones Técnicas sobre Privacidad y Modelos de Retención

Para una correcta evaluación de riesgos, se deben distinguir formalmente cuatro conceptos que no deben confundirse:

1. **Entrenamiento vs. Monitoreo de Abuso (OpenAI API):**
   - Los términos comerciales de la API de OpenAI establecen que los datos enviados a través de la API **no se utilizan para entrenar** sus modelos.
   - Sin embargo, los términos estándar de la API de OpenAI **retienen los datos durante 30 días** en sus servidores con fines exclusivos de detección de abusos y monitoreo de seguridad (*Abuse Monitoring*), tras lo cual se eliminan salvo requerimiento legal.
2. **Zero Data Retention (ZDR) vs. Modified Abuse Monitoring:**
   - **ZDR (Zero Data Retention):** Exclusión total de almacenamiento de prompts y respuestas una vez finalizada la llamada HTTP.
   - **Modified Abuse Monitoring:** Mecanismo formal de OpenAI para clientes corporativos calificados que solicitan exención o restricción de la retención de 30 días de monitoreo de abusos.
   - **Retención de Aplicación:** Con independencia de lo que haga el proveedor de inferencia, LegalUp almacena el texto extraído y el análisis estructurado en su propia base de datos (PostgreSQL en Supabase `us-west-1`), el cual debe ser purgado conforme al procedimiento de la sección 7.12 del diseño técnico.
3. **Controles de Enrutamiento de OpenRouter vs. DPA:**
   - Los parámetros `zdr: true` y `data_collection: 'deny'` enviados a OpenRouter son **directivas técnicas de enrutamiento HTTP**.
   - Estas directivas no sustituyen un **Data Processing Agreement (DPA)** bilateral vinculante. El cumplimiento efectivo de ZDR a través de OpenRouter depende de que el proveedor upstream del modelo admita y ejecute la política.
4. **Certificaciones de Seguridad (SOC 2, ISO 27001) vs. Garantías de ZDR:**
   - Las certificaciones SOC 2 Type II e ISO 27001 acreditan controles rigurosos de gestión de seguridad, confidencialidad y procesos operativos de un proveedor.
   - No obstante, una certificación SOC 2 o ISO 27001 **no garantiza automáticamente** Zero Data Retention ni exime al proveedor de retener datos según sus términos de servicio estándar. ZDR requiere un compromiso contractual específico.

### 4.3 Matriz de Cumplimiento Contractual y Documental

Auditoría de las 8 condiciones legales para el procesamiento de información sensible de clientes:

| Condición Exigida | Estado | Evidencia en el Repositorio / Código | Brecha / Pendiente Externo |
|---|---|---|---|
| **1. No uso de datos para entrenamiento** | **PARCIAL** | `server/ai/provider.mjs:32` envía `data_collection: 'deny'` a OpenRouter. `src/pages/PrivacyPolicy.tsx:160` declara que no se usan para entrenar. Términos API OpenAI excluyen entrenamiento por defecto. | Requiere confirmación documental externa de que el proveedor upstream respeta la directiva y que existe respaldo legal vinculante. |
| **2. Retención cero (ZDR) de prompts y respuestas** | **PARCIAL** | `server/ai/provider.mjs:31` envía `zdr: true` en requests a OpenRouter. `PrivacyPolicy.tsx:154` lo informa al usuario. | OpenRouter depende de la capacidad ZDR del proveedor upstream. Con OpenAI directo (default en código), rige retención estándar de 30 días para monitoreo de abusos salvo aprobación de *Modified Abuse Monitoring*. |
| **3. Plazos y mecanismos de eliminación del proveedor** | **PENDIENTE EXTERNO** | Términos públicos de OpenRouter declaran eliminación tras respuesta cuando ZDR está activo. | Requiere confirmación de SLA y procedimiento de auditoría. En la base de datos propia de LegalUp, los textos se conservan hasta la ejecución de la purga. |
| **4. Subprocesadores involucrados** | **PENDIENTE EXTERNO** | `PrivacyPolicy.tsx:129` menciona a OpenRouter y al proveedor del modelo. | Requiere confirmación externa de la lista formal de subencargados (Subprocessor Registry) notificada a clientes corporativos. |
| **5. Ubicación de almacenamiento y cómputo** | **VERIFICADO EN DOCUMENTO** | `PrivacyPolicy.tsx:181` declara base de datos en Supabase `us-west-1` (California, EE.UU.). Servidores de Render en EE.UU. e inferencia en EE.UU. | Los datos sensibles de empresas chilenas son procesados y alojados físicamente en territorio estadounidense. |
| **6. Transferencias internacionales de datos** | **PARCIAL** | Mencionada en `PrivacyPolicy.tsx:178` y aceptada vía checkbox en `TermsConsentCheckbox.tsx`. | La Ley 19.628 y la nueva Ley 21.719 exigen garantías adecuadas (ej. Cláusulas Contractuales Tipo o consentimiento informado específico). Requiere validación legal externa. |
| **7. Acuerdo de Tratamiento de Datos (DPA) vigente** | **PENDIENTE EXTERNO** | No consta copia de DPA en el repositorio de código. | El repositorio aloja código fuente, no la carpeta corporativa. La existencia y vigencia de un DPA bilateral con OpenRouter, OpenAI u otro proveedor queda como **pendiente de confirmación documental externa** por la administración. |
| **8. Tratamiento de información confidencial de clientes** | **PENDIENTE EXTERNO** | `TermsOfService.tsx` y `PrivacyPolicy.tsx` contienen cláusulas generales de confidencialidad y exclusión de responsabilidad. | Los contratos de LegalUp Services contienen secretos comerciales y datos protegidos. Se requiere confirmar que el marco contractual con el proveedor de IA cubra obligaciones de confidencialidad equivalentes a las acordadas con el cliente. |

---

## 5. Consistencia con el Diseño de Sprint 2

Se contrastó el documento `docs/services/SPRINT_2_TECHNICAL_DESIGN.md` con los tres bloqueadores y las decisiones de arquitectura:

1. **Bucket privado `service-documents` (D3):**
   - **Evaluación:** **CONSISTENTE.** El diseño prohíbe terminantemente el uso del bucket público `documents` para Services y establece que el bucket debe ser privado (`public = false`), limitando el acceso a URLs firmadas emitidas por el servidor.
2. **Ausencia de URLs públicas y uso de URLs firmadas:**
   - **Evaluación:** **CONSISTENTE.** El diseño elimina el uso de `getPublicUrl` para contratos y comprobantes, y establece tiempos de expiración breves para las URLs firmadas.
3. **Separación de comprobantes de pago (D16):**
   - **Evaluación:** **CONSISTENTE.** Se crea el bucket privado `service-payment-proofs`, impidiendo que los comprobantes se mezclen con los documentos contractuales o sean leídos por el profesional asignado o la IA.
4. **Control de acceso y segregación de funciones:**
   - **Evaluación:** **CONSISTENTE.** La matriz de actores (Sección 8.1) restringe la lectura de documentos a las partes autorizadas y evita la exposición de análisis no aprobados al cliente.
5. **Máquina de estados y gates de subida:**
   - **Evaluación:** **CONSISTENTE.** La carga de documentos solo se permite tras la aceptación de la cotización y la confirmación administrativa del pago (`awaiting_documents`).

### Observaciones y Omisiones Detectadas en el Diseño

1. **Contradicción Operativa en el Escaneo de Malware (D11):**
   - *Diseño:* Establece que ningún documento se procesa si `scan_status != 'clean'` y que ante la falta de escáner confiable el objeto queda en cuarentena perpetua.
   - *Realidad:* Al no existir ningún escáner en el repositorio, si se implementa el código tal como está redactado, **el flujo quedará 100% bloqueado en desarrollo y pruebas**, impidiendo testear la experiencia de usuario y el pipeline de análisis.
   - *Ajuste recomendado:* Se debe especificar en el diseño técnico una interfaz de escaneo (`MalwareScannerPort`) con un adaptador mockeable para entornos de prueba (`NODE_ENV !== 'production'`).
2. **Omisión en la Purga de Datos Derivados en Base de Datos (Sección 7.12):**
   - *Diseño:* Describe detalladamente la eliminación de objetos en Storage (`service-documents` y `service-payment-proofs`) y la marcación de timestamps `purged_at` en `service_orders` y `service_order_documents`.
   - *Omisión:* No contempla qué ocurre con la tabla `service_order_analyses`. Si un contrato se purga de Storage por vencimiento del plazo de retención o solicitud del cliente, pero su transcripción completa, cláusulas y riesgos permanecen almacenados en JSON en la tabla `service_order_analyses`, **el dato sensible no ha sido purgado del sistema**, vulnerando el principio de retención limitada.
   - *Ajuste recomendado:* El procedimiento de purga debe incluir la sanitización o eliminación del contenido en `service_order_analyses` (por ejemplo, vaciar `claims`, `evidence_sources`, `obligations` y `risks`).

---

## 6. Matriz Consolidada de Bloqueadores

| ID | Hallazgo | Evidencia Concreta | Estado | Riesgo | Acción Necesaria | Bloquea Código | Bloquea Producción |
|---|---|---|---|---|---|---|---|
| **B-01** | **Inexistencia de escáner antimalware** | Repositorio sin librerías ni servicios de escaneo; `scan_status` no existe en DB. | **NO IMPLEMENTADO** | Crítico: Ejecución de código malicioso o PDF bombs en el servidor; propagación a profesionales. | Diseñar `MalwareScannerPort`; seleccionar e integrar servicio antes de go-live. | No (con mock) | **SÍ** |
| **B-02** | **Carga sin aislamiento en frontend** | `src/hooks/useAIDocuments.ts:221` sube directo a carpeta de trabajo en Storage. | **RIESGO VIGENTE** | Alto: Archivos potencialmente dañinos quedan inmediatamente disponibles en Storage. | Implementar D11 con prefijo `quarantine/` server-side para Sprint 2. | No | **SÍ** |
| **B-03** | **Falta de política de retención formalmente aprobada y versionada** | Requiere evidencia administrativa auditable (versión, fecha, aprobador, parámetros autorizados, vigencia); los parámetros técnicos desplegados deben coincidir exactamente con la versión formalmente aprobada. | **DECISIÓN PENDIENTE** | Alto: Incumplimiento de Ley 21.719 o eliminación prematura contraria a plazos de prescripción. | Directorio / LegalUp debe registrar la aprobación formal y los parámetros autorizados. | No | **SÍ** |
| **B-04** | **Inexistencia de worker de purga con evidencia operativa auditable** | Cero crons de purga en código; el gate exige worker operativo con evidencia de ejecución reciente válida (`max_purge_staleness_window_hours`) sin purgas destructivas en boot. | **NO IMPLEMENTADO** | Medio: Acumulación indefinida de datos personales y costos de storage. | Desarrollar worker/cron de purga y registrar evidencia operativa de ejecuciones satisfactorias. | No | **SÍ** |
| **B-05** | **Omisión de purga de texto en base de datos** | `service_order_analyses` guarda evidencia y cláusulas en PostgreSQL sin regla de purga. | **NO IMPLEMENTADO** | Alto: Fuga de confidencialidad en bases de datos tras la supuesta "purga" del archivo. | Incorporar borrado o anonimización de `service_order_analyses` en el job de purga. | No | **SÍ** |
| **B-06** | **DPA con proveedor IA pendiente de confirmación** | No consta copia de DPA en el repositorio; rigen términos de servicio estándar salvo confirmación documental de acuerdo bilateral. | **PENDIENTE EXTERNO** | Crítico: Responsabilidad civil por violación de confidencialidad y secreto empresarial si no hay DPA vinculante. | Confirmar documentalmente la existencia de DPA o suscribir uno con OpenRouter, OpenAI u otro proveedor calificado. | No | **SÍ** |
| **B-07** | **Dependencia de variables de entorno para ZDR** | `server/ai/provider.mjs:14,27`: si falta URL OpenRouter, usa OpenAI sin ZDR. | **PARCIAL** | Alto: Degradación silenciosa a OpenAI estándar (retención de 30 días para auditoría). | Configurar fallback cerrado (fail-closed) si no se garantiza ZDR en producción. | No | **SÍ** |
| **B-08** | **Transferencia internacional sin Cláusulas Tipo** | `src/pages/PrivacyPolicy.tsx:181` reconoce transferencias a EE.UU. sin SCCs formales. | **PENDIENTE EXTERNO** | Medio-Alto: Observaciones regulatorias bajo la nueva Ley 21.719 chilena. | Formalizar anexo de transferencia internacional y consentimiento reforzado. | No | **SÍ** |

---

## 7. Decisiones que Dependen Exclusivamente de LegalUp

Las siguientes definiciones de negocio y legales deben ser resueltas por los fundadores / administración de LegalUp:

1. **Plazos de Retención Documental:**
   - ¿Cuánto tiempo se conservan los contratos originales e informes finales una vez entregados y cerrada la ventana de revisión? (Parámetro abierto sujeto a decisión de negocio y custodia profesional).
   - ¿Cuánto tiempo se conservan los documentos de órdenes canceladas o expiradas? (Parámetro abierto para purga automática tras cancelación).
   - ¿Plazo de eliminación de comprobantes de pago bancarios tras su confirmación? (Mantener el registro financiero inmutable disociado del archivo visual; plazos sujetos a validación profesional tributaria externa).
2. **Definición de Procedimiento de `legal_hold`:**
   - ¿Quién dentro del equipo de LegalUp tiene atribuciones legales para fijar y levantar un `legal_hold` sobre una orden?
3. **Selección del Mecanismo y Presupuesto Antimalware:**
   - Evaluar arquitecturas privadas dedicadas (ej. motor propio en contenedor privado o API corporativa cerrada sin redistribución de muestras).
   - *Advertencia de Confidencialidad:* Los multiscanners comunitarios públicos (como el nivel gratuito o público de VirusTotal) distribuyen copias de los archivos analizados a firmas y redes de seguridad globales. Están terminantemente descartados para contratos y documentos confidenciales de clientes corporativos; el motor debe ser estrictamente privado.
4. **Marco de Contratación del Proveedor de IA:**
   - Decidir si se opera a través de OpenRouter confirmando un plan corporativo con DPA y ZDR, o si se suscribe un acuerdo empresarial directo (ej. OpenAI Enterprise / Azure OpenAI Service) con SOC 2, DPA y exención de monitoreo de abuso.

---

## 8. Confirmaciones y Gestiones Externas Necesarias

Antes de pasar a producción con clientes reales, se deben completar las siguientes gestiones con terceros:

1. **Con el Proveedor de IA (OpenRouter / OpenAI / Azure):**
   - Solicitar y firmar digitalmente el **Data Processing Agreement (DPA)** que incluya expresamente:
     - Cláusula de no entrenamiento de modelos con datos de las solicitudes.
     - Cláusula de Zero Data Retention (retención cero).
     - Certificación de medidas técnicas y de seguridad (SOC 2, ISO 27001).
     - Ubicación geográfica de los centros de datos de inferencia.
2. **Con Asesoría Legal Externa (Legislación Chilena):**
   - Validar la redacción del texto de consentimiento contractual en `service_order_acceptances` conforme a las exigencias de la **Ley 19.628** y la nueva **Ley 21.719 sobre Protección de Datos Personales**.
   - Confirmar si la retención de contratos comerciales de clientes requiere consideraciones especiales frente a las facultades fiscalizadoras de tribunales o responsabilidades del mandato profesional.
3. **Con el Proveedor Antimalware:**
   - Validar límites de rate-limit y tamaño máximo de archivo soportado en la API del servicio seleccionado.

---

## 9. Recomendación Final

### ¿Listo para Implementar? **LISTO CON CONDICIONES**

Se recomienda **autorizar el inicio de la implementación de Sprint 2**, bajo las siguientes condiciones técnicas:
1. **Desacoplar el Escáner de Malware:** Crear la interfaz `MalwareScannerPort` y un adaptador de desarrollo `MockMalwareScanner` en el servidor, de modo que las pruebas unitarias y de integración del flujo de estados puedan ejecutarse sin bloquearse por la falta de un servicio externo contratado.
2. **Implementar el Modelo de Datos Completo:** Crear las tablas `service_orders`, `service_order_quotes`, `service_order_acceptances`, `service_order_payments`, `service_order_documents`, `service_order_analyses`, `service_order_revisions`, `service_order_events` y `service_order_retention_actions`.
3. **Corregir la Purga en DB:** Extender el diseño del job de purga para que limpie tanto los objetos de Storage como el texto analizado en `service_order_analyses`.

### ¿Listo para Producción? **NO LISTO (BLOQUEADO)**

Se debe establecer un **gate formal de despliegue a producción (`CommercialReadinessGate` / D17)**: ningún cliente externo debe tener acceso a crear órdenes ni cargar contratos de Services hasta que se cumplan copulativamente:
- **Verificaciones técnicas (Categoría A):** Scanner antimalware real operativo (mock rechazado en boot), parámetros de retención aprobados y válidos, y worker de purga desplegado y verificado de forma no destructiva.
- **Aprobaciones documentales y externas (Categoría B):** DPA bilateral del proveedor de IA formalmente registrado y vigente, y validación legal y de privacidad completada con evidencia administrativa registrada.
- **Seguridad en runtime:** Imposibilidad de habilitar el servicio comercial modificando de forma aislada variables de entorno sin las verificaciones técnicas y documentales correspondientes.

---

## 10. Addendum D-05 — Discrepancia del límite de comprobantes de pago (12 de noviembre de 2026)

Este addendum no modifica ni reescribe el cuerpo histórico del informe emitido el 11 de noviembre de 2026. Se agrega únicamente para dejar constancia de la discrepancia D-05 y de su tratamiento documental.

- **Observación histórica conservada:** la sección de validaciones de tipo MIME, extensión, tamaño y contenido de este informe registra 10 MB para `service-payment-proofs`.
- **Proyección de diseño:** el diseño y el plan proyectaban 20 MB para el mismo bucket al momento de la revisión.
- **Evidencia disponible:** el límite de 20 MB de `ai-documents` corresponde a otro bucket y no acredita la capacidad de `service-payment-proofs`. No consta que el bucket de comprobantes exista, que el scanner esté seleccionado o verificado, ni que existan pruebas de carga, escaneo o tiempo de procesamiento para archivos de 20 MB con el timeout previsto.
- **Tratamiento aplicado:** 10 MB queda como límite conservador provisional para comprobantes. Los 20 MB quedan como objetivo propuesto pendiente de validación técnica y no se consideran normativos.
- **Estado:** D-05 continúa pendiente; A12 permanece abierto y B1.0 no se declara cerrado. Cualquier cambio futuro del límite deberá registrar la evidencia técnica que lo sustente.
- **Alcance:** este addendum es documental; no crea buckets, no modifica Storage, no implementa validaciones y no declara capacidad verificada.

---

## 11. Resolución documental D-05 — Límite definitivo de comprobantes (13 de noviembre de 2026)

Esta resolución se agrega con posterioridad y no reescribe el cuerpo histórico del informe ni el addendum D-05 del 12 de noviembre de 2026, que se conservan íntegramente.

- **Decisión del usuario:** se aprueba **10 MB (10,485,760 bytes)** como límite máximo normativo de v1 para `service-payment-proofs`, con formatos PDF, PNG y JPEG.
- **Rechazo por exceso:** `upload-url` y `finalize` deben rechazar comprobantes que excedan ese límite.
- **20 MB:** queda fuera del alcance de v1. No es un objetivo pendiente ni un límite normativo. Una ampliación futura requiere una nueva decisión documentada y evidencia técnica suficiente.
- **Estado documental:** D-05 queda resuelta y A12 pasa a aprobado; B1.0 queda `READY FOR FORMAL APPROVAL — NOT CLOSED`.
- **Alcance:** esta decisión de diseño no acredita que Storage, scanner o infraestructura estén implementados o verificados. No crea buckets, no modifica configuración y no autoriza procesamiento de documentos reales.
- **Invariantes:** H-07 y D17 permanecen `BLOCKED`; `SERVICES_REAL_DOCUMENTS_ENABLED=false`; no se procesaron documentos reales.
