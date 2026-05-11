# Movements Backup Import

## Objetivo

Importar backups nativos de Gonezo como flujo principal de restauracion/migracion.
Mobills sigue existiendo como import legado, activado explicitamente desde la UI.

El caso de uso coordina datos de varios bounded contexts sin mover reglas de negocio:

- `ledger` conserva cuentas y movimientos publicados
- `taxonomy` conserva categorias, tags y sus asignaciones
- `application/orchestration/backup` define el contrato de import
- `application/services/backup` orquesta la importacion
- `infrastructure/backup` adapta el JSON externo

## Ubicacion de codigo

- `core/src/main/kotlin/com/gonezo/application/orchestration/backup`
- `core/src/main/kotlin/com/gonezo/application/services/backup`
- `core/src/main/kotlin/com/gonezo/infrastructure/backup`
- `app/android/app/src/main/java/com/gonezo/multiplatform/plugins/CorePlugin.java`
- `platforms/android/infrastructure/src/main/java/com/gonezo/multiplatform/core/AndroidMovementsBackupCore.kt`

## Formato

El backup actual usa `schemaVersion: 2`.

Incluye:

- `accounts`
- `categories`
- `tags`
- `postedMovements`

Los movimientos preservan identificadores, cuenta, divisa, fecha, descripcion, categoria, tags y
`linkedTransactionId` en transferencias. La version `1` se acepta solo para datos compatibles; una
transferencia sin enlace se rechaza por fila porque no puede restaurar la relacion completa.

## Flujo Android

1. Usuario abre `Import backup`.
2. Selecciona un JSON de backup de Gonezo.
3. App llama a `movementsImportBackup` con `fileBase64`.
4. `CorePlugin` delega en `AndroidMovementsBackupCore`.
5. `MovementsBackupJsonParser` adapta el JSON al contrato de aplicacion.
6. `ImportMovementsBackupService` coordina:
   - crear cuentas si no existen
   - crear categorias y tags si no existen
   - crear movimientos si no existen
   - asignar categoria y tags por identificador
7. Devuelve resumen y resultado por fila (`imported | failed | skipped`).

## Idempotencia

La identidad del backup es la identidad del movimiento. Si el movimiento ya existe, la fila se marca
como `skipped`; no se duplica.

## Frontera DDD

Importar un backup de movimientos es un caso de uso de orquestacion.
No pertenece a `ledger` ni a `taxonomy`, porque necesita coordinar ambos contextos.
