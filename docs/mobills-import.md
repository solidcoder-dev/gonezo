# Mobills Import

## Objetivo

Importar exportes Mobills (TSV/CSV, UTF-16/UTF-8) sin mezclar dominios:

- `ledger` solo registra dinero (cuentas + transacciones)
- `taxonomy` solo clasifica (categorias + tags)
- `application/orchestration/mobills` coordina el caso de uso
- `infrastructure/mobills` adapta el archivo externo

## Ubicacion de codigo

- `core/application/src/main/kotlin/com/gonezo/application/orchestration/mobills`
- `core/application/src/main/kotlin/com/gonezo/application/services/mobills`
- `core/infrastructure/src/main/kotlin/com/gonezo/infrastructure/mobills`

## Flujo

1. `MobillsTsvParser` (infra) lee bytes UTF-16/UTF-8, detecta delimitador (`tab` o `,`) y parsea filas.
2. Parser normaliza filas (`value`, `category`, `tags`) y genera `issues` tecnicos por linea.
3. `MobillsImportCoordinator` (infra) transforma parse result al comando de aplicación.
4. `ImportMobillsStatementService` (orchestración) coordina:
   - resolver/crear cuenta (policy)
   - registrar income/expense en ledger
   - resolver/crear categoria y categorizar (taxonomy)
   - resolver/crear tags y asignarlos (taxonomy)
5. Devuelve resultado por fila (`imported | failed | skipped`) con `errorCode/errorMessage` cuando aplica.

## Integracion App (UI + plugin)

Desde la pantalla de cuentas:

1. Usuario abre `Import` / `Import from Mobills`.
2. Selecciona archivo TSV o CSV.
3. Configura policy:
   - `createMissingAccounts`
   - `createMissingCategories`
   - `createMissingTags`
   - `duplicatePolicy` (`skip | fail | import_anyway`)
4. App llama a `mobillsImport` con:
   - `fileBase64`
   - `policy`
5. UI muestra resumen:
   - `totalRows`
   - `importedCount`
   - `failedCount`
   - `skippedCount`
   - filas con detalle (`sourceLine`, `status`, `transactionId`, `errorCode`, `errorMessage`).

En frontend, esta integracion se encapsula en el modulo:

- `app/src/imports/{application,domain,infrastructure,ui}`
- Proveedor Mobills concreto en `app/src/imports/infrastructure/providers/mobills/*`

## Reglas de normalizacion

- `value < 0` => expense
- `value > 0` => income
- `value == 0` => fallo de fila (`ZERO_VALUE`)
- `subcategory` se ignora
- `category` se conserva
- `tags` se conservan (normalizados y deduplicados)

## Politicas de import

`ImportMobillsPolicy`:

- `createMissingAccounts`
- `createMissingCategories`
- `createMissingTags`
- `duplicatePolicy`:
  - `skip` (default): no vuelve a importar la fila duplicada
  - `fail`: marca la fila como fallida con `DUPLICATE_TRANSACTION`
  - `import_anyway`: importa aunque exista fingerprint previo

## Idempotencia (tabla tecnica)

En Android se usa tabla tecnica `mobills_import_fingerprints` para idempotencia de import:

- `source`
- `fingerprint`
- `transaction_id`
- `first_seen_at`
- `last_seen_at`
- `seen_count`

Esto evita duplicar transacciones al reimportar el mismo archivo sin acoplar `ledger`/`taxonomy`.

## Principio de frontera

Importar Mobills es un caso de uso de coordinación.
No pertenece al dominio `ledger` ni al dominio `taxonomy`.
