# Revisión funcional — 8 de septiembre de 2026

Se encontraron errores confirmados en autorización, reservas, pagos, suscripciones, administración y documentos. La compilación de producción pasa, pero no equivale a una validación integral del funcionamiento.

La revisión combina lectura del código, ejecución de las pruebas existentes y reproducciones aisladas de los handlers reales, extraídos mediante el AST de TypeScript y ejecutados con servicios simulados. No se realizaron cobros, envíos de correos ni cambios de cuentas para las reproducciones. No se modificó código de la aplicación.

## Hallazgos prioritarios

### 1. Permisos de administrador basados en datos editables por el usuario — P1

**Ubicación:** [server.mjs:397](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:397).

`requireAdmin` acepta `user.user_metadata.is_admin` y `user.user_metadata.role` como prueba de privilegios. Estos metadatos pueden ser actualizados por el propio usuario mediante Supabase Auth. Por tanto, tener un perfil con rol `client` no impide superar la autorización del servidor. La protección visual de administración también consulta estos metadatos.

**Reproducción:** con un usuario simulado cuyo perfil era `client` y cuyos metadatos contenían `is_admin: true`, el middleware llamó a `next()` y autorizó el acceso. No se alteró ningún usuario real.

**Impacto:** acceso indebido a endpoints administrativos, incluidos datos privados y operaciones administrativas. La protección de las tablas no sustituye esta comprobación porque el servidor usa un cliente con privilegios de servicio.

**Corrección:** basar la autorización en una fuente que el usuario no pueda modificar, y verificar también los permisos de actualización de esa fuente.

### 2. Operaciones de empresas sin autenticación ni pertenencia — P1

**Ubicación:** [server.mjs:6412](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:6412), [server.mjs:4889](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:4889).

Los endpoints para aprobar/rechazar presupuestos y adjuntar documentos a solicitudes no verifican un token ni que el solicitante pertenezca a la empresa. Ejecutan consultas con el cliente privilegiado del servidor.

**Reproducción:** el handler de aprobación, invocado sin cabecera `Authorization`, emitió la actualización de un presupuesto simulado y respondió HTTP 200.

**Impacto:** quien conozca un identificador válido puede cambiar información de otra empresa. Los UUID dificultan adivinar identificadores, pero no son un control de permisos.

**Corrección:** exigir autenticación y comprobar empresa, usuario y rol antes de cada lectura o modificación privada.

### 3. Cancelación de suscripciones que confirma éxito aunque Mercado Pago la rechace — P1

**Ubicación:** [server.mjs:8073](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:8073), [server.mjs:8240](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:8240).

En AI y Pro, una respuesta no exitosa del proveedor solamente se registra en el log. El código continúa marcando la suscripción como `cancelled` y devuelve éxito. Además, un intento posterior de cancelación queda bloqueado porque el endpoint exige estado `active`.

**Reproducción:** simulando HTTP 503 de Mercado Pago, ambos handlers respondieron HTTP 200 con `success: true` y actualizaron la base de datos a `cancelled`.

**Impacto:** el usuario recibe confirmación de baja mientras la autorización de cobros recurrentes puede seguir activa en Mercado Pago.

**Corrección:** confirmar la baja externa antes de darla por completada, o mantener un estado pendiente con reintentos y seguimiento.

### 4. Los reintentos del webhook no recuperan un pago procesado parcialmente — P1

**Ubicación:** [server.mjs:2541](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:2541), [server.mjs:2556](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:2556).

El webhook guarda `payment_id` y confirma la reserva antes de completar la resolución del abogado, el registro contable y los pasos posteriores. Si algo falla después, la siguiente entrega no puede superar `.is('payment_id', null)` y se descarta como duplicada.

**Reproducción:** con un fallo temporal al consultar el perfil del abogado, dos entregas del mismo pago solo intentaron resolver el perfil una vez y no llegaron a escribir en `payments`. La reserva ya estaba reclamada. En ese escenario el código marca revisión manual, pero el reintento no reanuda el trabajo.

**Impacto:** pago aprobado y reserva confirmada sin completar automáticamente los pasos posteriores, que pueden incluir registro del pago, Meet y correos.

**Corrección:** registrar el avance por etapas y hacer que los reintentos continúen las etapas incompletas sin duplicar las completadas.

### 5. Un fallo al crear el checkout deja el horario bloqueado — P1

**Ubicación:** [server.mjs:1421](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:1421), [server.mjs:1596](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:1596).

La reserva se inserta como `pending` antes de crear la preferencia de Mercado Pago. Si la preferencia falla, la respuesta es un error, pero no se libera ni se recupera la reserva creada. La detección de cruces considera las reservas `pending` sin filtrar su antigüedad.

**Reproducción:** primer intento con fallo simulado de Mercado Pago → HTTP 500 y reserva persistida como `pending`; segundo intento para el mismo horario → HTTP 409, «Este horario ya está reservado».

**Impacto:** el cliente no puede reintentar el mismo horario después de un fallo de pago. El código revisado no implementa una limpieza periódica; la migración de prevención de dobles reservas contiene una limpieza puntual.

**Corrección:** recuperar el checkout pendiente de manera idempotente o liberar la reserva cuando falle su creación, además de definir expiración de reservas sin pago.

### 6. No se puede retomar una suscripción Pro abandonada — P1

**Ubicación:** [server.mjs:8143](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:8143).

Después de crear la preaprobación, una suscripción `pending` con `provider_subscription_id` se trata igual que una activa. Si el usuario cierra Mercado Pago antes de autorizar y vuelve a «Activar LegalUp Pro», recibe un error en vez de un enlace para continuar.

**Reproducción:** una suscripción simulada pendiente y con identificador del proveedor produjo HTTP 409, `ALREADY_SUBSCRIBED`, «Ya tienes una suscripción Pro activa».

**Corrección:** consultar o reutilizar el checkout pendiente y diferenciarlo de una suscripción activa. La cancelación actual tampoco permite cancelar una suscripción pendiente.

### 7. El precio del pagaré lo decide la petición del navegador — P1

**Ubicación:** [server.mjs:2112](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:2112), [server.mjs:2153](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:2153).

`/api/documents/create` toma `total_paid` del body, lo guarda y lo utiliza directamente como `unit_price`. No lo compara con el precio del catálogo. La rama del webhook de documentos tampoco recalcula el precio oficial.

**Reproducción:** una petición simulada de pagaré con `total_paid: 100` generó una preferencia simulada por 100, aunque el precio del frontend es 9.990. No se contactó a Mercado Pago ni se efectuó un cobro.

**Impacto:** el backend permite solicitar un cobro inferior al precio publicado; la aceptación final del importe también depende de las restricciones del proveedor.

**Corrección:** determinar tipo, versión y precio con un catálogo del servidor y validar el importe al confirmar el pago.

### 8. Las rutas de solicitudes y métricas de empresas quedan interceptadas — P2

**Ubicación:** [server.mjs:5487](/Users/juanguajardo/Desktop/upLegal/upLegal/server.mjs:5487).

La ruta GET `/api/admin/empresas/:id` se registra antes de `/api/admin/empresas/requests` y `/api/admin/empresas/metrics`. Express interpreta `requests` y `metrics` como identificadores de empresa y no llega a los handlers específicos.

**Reproducción:** utilizando el router real de Express y el orden de registro del proyecto, ambas URL coincidieron primero con `/api/admin/empresas/:id`.

**Impacto:** el panel de asignación puede mostrar que no hay solicitudes aunque existan, porque su cliente descarta el error y usa una lista vacía.

**Corrección:** registrar las rutas estáticas antes de `:id` y comprobar respuestas no exitosas en el frontend.

### 9. Eliminar el documento profesional falla después de borrar el archivo — P2

**Ubicación:** [document-upload.tsx:143](/Users/juanguajardo/Desktop/upLegal/upLegal/src/components/ui/document-upload.tsx:143).

`removeDocument` llama a `setFileName`, que no está declarado. La llamada ocurre después del borrado del archivo y antes de `onUpload('', '')`, que actualiza los datos del perfil.

**Reproducción:** el handler real, con almacenamiento simulado, borró el archivo y luego lanzó `ReferenceError: setFileName is not defined`; no notificó la eliminación al componente padre.

**Impacto:** el perfil puede conservar la referencia a un archivo que ya no existe. Este componente se utiliza en la página activa del perfil del abogado.

**Corrección:** eliminar la llamada inexistente y completar la actualización del perfil manejando también los errores del almacenamiento.

## Validación y límites

- `npm run build`: correcto, compilación de producción completada.
- `npm run typecheck`: falla inmediatamente porque [src/types/supabase.ts:1](/Users/juanguajardo/Desktop/upLegal/upLegal/src/types/supabase.ts:1) comienza con una advertencia de CLI sin comentar. Al ignorar exclusivamente esa línea en memoria, el compilador reporta 313 diagnósticos adicionales. No todos son fallos en rutas activas: hay código antiguo y archivos sin uso. Ningún archivo se modificó para este análisis.
- Suite completa: 1.092 pruebas pasaron, 9 fallaron y 19 se omitieron. Los nueve fallos iniciales correspondieron a las suites de integración de Supabase bajo la restricción de red.
- Se repitió fuera de la restricción un subconjunto de integración de solo lectura: 7 pruebas pasaron. Sin embargo, algunas consultas privilegiadas recibieron HTTP 401 y esos tests aceptan o ignoran ese resultado; por tanto, el resultado verde no acredita el esquema ni los permisos privilegiados de producción.
- Varias pruebas críticas comprueban únicamente que el archivo contiene determinadas cadenas. Por ejemplo, las de protección de precios comprueban la existencia de `computedPrice` y del texto del log. No prueban por sí mismas que una petición manipulada sea rechazada.
- Las reproducciones adicionales usan handlers reales y servicios simulados. Confirman comportamiento del código, pero no sustituyen pruebas de extremo a extremo con cuentas de cliente, abogado y empresa en un entorno de pruebas.
- No se verificaron cobros, entrega real de correos, creación real de reuniones ni todas las políticas/migraciones de la base de datos desplegada. No se puede certificar que el sistema completo funcione correctamente en producción con esta revisión.

## Funcionalidad adicional incompleta

La ruta `/dashboard/messages` sigue registrada, aunque el menú la tiene oculta. Su proveedor todavía carga conversaciones y mensajes simulados, y el formulario de nueva conversación no crea una conversación persistida. Conviene mantenerla fuera del alcance de funcionalidades anunciadas hasta completar e integrar ese flujo.

## Orden sugerido de corrección

1. Autorización administrativa y permisos de empresas.
2. Cancelación real de cobros y recuperación de pagos parcialmente procesados.
3. Recuperación de checkout, suscripciones pendientes y precios del servidor.
4. Rutas de administración y eliminación de documentos.
5. Restablecer TypeScript y sustituir las pruebas de texto de los flujos críticos por pruebas de comportamiento.
