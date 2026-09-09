# Notifications v1

## Alcance

Notifications v1 añade una bandeja interna persistente para el propietario local y un único resumen silencioso de Android. Android es el runtime de producto; el historial se conserva aunque Android no pueda entregar el resumen.

Solo se generan estos tipos:

- `scheduled_confirmation_required`, cuando el procesamiento de un programado crea correctamente un expected que requiere confirmación.
- `scheduled_processing_failed`, cuando se persiste el fallo de procesamiento de una ocurrencia.

No se generan avisos por registros automáticos correctos, vencimientos de expected manuales, imports, voz, sharing remoto, presupuestos ni resúmenes diarios.

## Identidad y estado

Cada evento crea como máximo una notificación. La deduplicación usa tipo, identidad del programado e instante de vencimiento normalizado; repetir el procesamiento no crea otra fila ni otra entrega.

La bandeja pertenece a todas las cuentas del propietario local (`local-user`). Cambiar la cuenta financiera no cambia su identidad ni su contador. Una notificación está activa y no leída cuando `readAt == null && withdrawnAt == null`.

`readAt` conserva la primera lectura. Leer no confirma, registra ni descarta movimientos. Abrir la bandeja, abrir o descartar el resumen Android no marca nada como leído. Una fila se marca al abrir su contenido; también existen lectura explícita y lectura masiva hasta un cursor capturado. No existe marcar como no leída.

`withdrawnAt` indica que el aviso ya no requiere atención y es independiente de `readAt`. Un expected resuelto, descartado o eliminado retira su aviso. Desactivar una serie no retira un expected ya creado que siga pendiente. Un fallo se retira al procesarse correctamente la misma ocurrencia o al desactivar/eliminar su programado.

La bandeja conserva el historial retirado. Las entregas pendientes de una notificación leída o retirada pasan a `cancelled`.

## Persistencia y entrega

La persistencia usa tablas separadas para notificaciones y entregas. Las fechas se normalizan a UTC con milisegundos fijos; el dominio usa `Instant` y la UI formatea localmente. La bandeja se ordena por secuencia local descendente, pagina de 30 y limita a 100. Los cursores son strings opacos.

Los estados de entrega son `pending`, `submitted`, `suppressed` y `cancelled`. `submitted` confirma aceptación de la API, no visualización humana. Los reintentos usan backoff desde un minuto hasta una hora. Permiso denegado o canal bloqueado consume la entrega como `suppressed` sin reintento automático.

Android muestra como máximo un resumen con título `Gonezo` y texto pluralizado `You have N unread notifications`, en el idioma actual de la aplicación. No incluye nombres, importes ni mensajes técnicos. El canal es silencioso, la identidad es estable y un evento nuevo actualiza el resumen existente. Las lecturas, reintentos y refrescos no generan avisos adicionales. Si el usuario descarta el resumen, no se recrea sin un evento nuevo elegible. Con contador cero se retira el resumen.

Guardar el historial no depende del permiso de notificaciones ni del estado del canal. No se solicitan permisos automáticamente y no se usan alarmas exactas. Android decide cuándo ejecuta el trabajo diferido y no se promete puntualidad ni ejecución después de `Forzar detención`.

## Límites de plataforma

La coordinación entre recurrence/expected y notifications vive en la orquestación exterior y conserva `ConsistencyBoundary`; notifications no importa otros dominios ni accede a sus tablas. Android/JDBC implementan los puertos interiores.

La inspección del procesamiento actual confirma que `AndroidConsistencyBoundary` envuelve el bloque con la misma conexión `SQLiteDatabase` obtenida desde `CoreDatabase.getWritableDatabase()`. Los repositorios Android de recurring movement, occurrence, expected y ledger reciben esa misma instancia de `CoreDatabase`, por lo que sus lecturas y escrituras participan en la transacción SQLite abierta por la boundary; las lecturas usan la conexión legible del mismo helper. El cierre ocurre en `endTransaction()` y el commit solo se marca si el bloque retorna normalmente.

No hay Firebase, servidor, sincronización multidispositivo, horarios configurables, preferencias por categoría, event bus genérico, implementaciones nativas iOS/web ni notificaciones para otros contextos. El doble web es únicamente determinista para pruebas y desarrollo; no simula entrega Android ni persistencia nativa. iOS declara la capacidad no soportada.

La restauración de backup financiero no incluye este estado local de ejecución. Una restauración confirmada limpia la bandeja y las entregas; una importación ordinaria conserva la bandeja y solo reconcilia avisos afectados. No se hace backfill histórico.

## Estado inicial de implementación

La implementación parte del HEAD `692f58ccfb3bc14e53f71c82f08b3550a3b50806` en la rama dedicada `feat/notifications-v1`. El baseline `./scripts/verify.sh fast` produjo frontend OK. El check core no pudo iniciar Gradle por el entorno (`Could not determine a usable wildcard IP for this machine`); debe repetirse cuando el runtime de Gradle sea utilizable.
