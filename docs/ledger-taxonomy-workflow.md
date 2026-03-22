# Ledger + Taxonomy Workflow

## Objetivo

Permitir que el formulario envie categoria sin acoplar Ledger al dominio de Taxonomy.

## Flujo de escritura

Para `expense`/`income`:

1. `Ledger` registra la transaccion y devuelve `transactionId`.
2. Workflow tecnico crea/actualiza estado de categorizacion (`pending`).
3. Worker intenta `Taxonomy.AssignCategoryToTransaction`.
4. Si asigna correctamente: estado `assigned`.
5. Si falla (categoria inexistente, archivada, no permitida): estado `failed`.

Para `transfer`:

- `Ledger` registra `transfer_out` + `transfer_in`.
- si se solicita categoria, workflow marca `failed` con `CATEGORY_NOT_ALLOWED_FOR_TRANSFER`.

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

## Flujo de lectura

El read model de transacciones compone:

1. datos de Ledger
2. asignacion exitosa desde Taxonomy
3. estado tecnico desde workflow

Salida recomendada:

- `category`: `null` o `{ id, name }`
- `categorization.status`: `none | pending | processing | assigned | failed`
- `categorization.errorCode`: opcional

## Politicas de consistencia

- Ledger es el sistema de registro financiero.
- fallo de Taxonomy no invalida la transaccion de Ledger.
- UI puede mostrar transaccion como `uncategorized` mientras `pending`/`failed`.
