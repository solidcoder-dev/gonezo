# Ledger + Taxonomy Workflow

## Objetivo

Permitir que el formulario envie categoria y tags sin acoplar Ledger al dominio de Taxonomy.

## Flujo de escritura

Para `expense`/`income` con categoria + tags:

1. `Ledger` registra la transaccion y devuelve `transactionId`.
2. Workflow tecnico crea/actualiza estado de categorizacion (`pending`).
3. Worker intenta `Taxonomy.AssignCategoryToTransaction`.
4. En paralelo (o justo despues), orquestacion aplica tags con `ApplyTransactionTags`:
   - busca tags existentes
   - crea los que no existen
   - reemplaza asignaciones de tags de la transaccion
5. Si categoria asigna correctamente: estado `assigned`.
6. Si categoria falla (inexistente, archivada, no permitida): estado `failed`.
7. Si tags fallan (ej: tag archivado): resultado `failed` en tagging, sin invalidar Ledger.

Para `transfer`:

- si ambas cuentas comparten divisa: `RecordLedgerTransfer`.
- si cuentas con divisa distinta: `RecordLedgerTransferFx`.
- en ambos casos, `Ledger` registra `transfer_out` + `transfer_in`.
- si se solicita categoria, workflow marca `failed` con `CATEGORY_NOT_ALLOWED_FOR_TRANSFER`.
- tags si se aplican a ambas transacciones (`transfer_out` y `transfer_in`).

## Tabla tecnica de workflow

Tabla sugerida: `workflow_tx_categorization`

Campos minimos:

- `transaction_id`
- `requested_category_id`
- `status` (`pending | processing | assigned | failed | none`)
- `error_code`
- `error_message`
- `attempts`
- `next_attempt_at`
- `updated_at`
- `created_at`

Nota: esta tabla no es fuente de verdad de negocio para categorias; solo estado operativo.

Para tags se puede empezar sin tabla tecnica dedicada (resultado directo de orquestacion `assigned | failed | none`).
Si se requiere retry/observabilidad de tags, usar tabla paralela: `workflow_tx_tagging`.

## Flujo de lectura

El read model de transacciones compone:

1. datos de Ledger
2. asignacion exitosa desde Taxonomy
3. estado tecnico desde workflow (al menos categorizacion)

Salida recomendada:

- `category`: `null` o `{ id, name }`
- `categorization.status`: `none | pending | processing | assigned | failed`
- `categorization.errorCode`: opcional
- `tags`: `[]` o `[{ id, name }]`
- `tagging.status`: `none | assigned | failed` (o `pending/processing` si hay workflow tecnico para tags)
- `tagging.errorCode`: opcional

## Politicas de consistencia

- Ledger es el sistema de registro financiero.
- fallo de Taxonomy no invalida la transaccion de Ledger.
- UI puede mostrar transaccion como `uncategorized` mientras `pending`/`failed`.
- UI puede mostrar tags parciales o vacios si `tagging.status = failed`.
