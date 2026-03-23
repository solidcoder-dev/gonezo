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
   - `defaultAccountType`
4. App llama a `mobillsImport` con:
   - `fileBase64`
   - `policy`
5. UI muestra resumen:
   - `totalRows`
   - `importedCount`
   - `failedCount`
   - `skippedCount`
   - filas con detalle (`sourceLine`, `status`, `transactionId`, `errorCode`, `errorMessage`).

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
- `defaultAccountType`

## Principio de frontera

Importar Mobills es un caso de uso de coordinación.
No pertenece al dominio `ledger` ni al dominio `taxonomy`.
