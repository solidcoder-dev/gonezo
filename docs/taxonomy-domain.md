# Taxonomy Domain

## Proposito

Gestionar clasificacion para transacciones de Ledger sin acoplarse al agregado financiero.

Taxonomy no crea transacciones ni recalcula balances.

## Bounded Context

`Taxonomy`

Lenguaje ubicuo:

- `Category`
- `CategoryAssignment`
- `Tag`
- `TagAssignment`
- `AppliesTo` (solo categorias)

## Aggregate Roots

### Category

Campos:

- `id: CategoryId`
- `name: String`
- `appliesTo: CategoryAppliesTo` (`income | expense`)
- `status: CategoryStatus` (`active | archived`)
- `createdAt: Instant`
- `archivedAt: Instant?`

Reglas:

- nombre obligatorio
- nombre unico por `appliesTo` (normalizado)
- solo categorias activas se pueden asignar

Comandos:

- `CreateCategory`
- `RenameCategory`
- `ArchiveCategory`
- `ListCategories`

### Tag

Campos:

- `id: TagId`
- `name: String`
- `status: TagStatus` (`active | archived`)
- `createdAt: Instant`
- `archivedAt: Instant?`

Reglas:

- nombre obligatorio
- nombre unico global (normalizado)
- solo tags activos se pueden asignar

Comandos:

- `CreateTag`
- `RenameTag`
- `ArchiveTag`
- `ListTags`

### CategoryAssignment

Campos:

- `transactionId: TransactionId`
- `categoryId: CategoryId`
- `assignedAt: Instant`

Reglas:

- una transaccion tiene como maximo una categoria activa
- reasignar reemplaza la asignacion anterior
- solo `income` y `expense` son categorizables

Comandos:

- `AssignCategoryToTransaction`
- `UnassignCategoryFromTransaction`
- `GetAssignmentsByTransactionIds`

### TagAssignment

Campos:

- `transactionId: TransactionId`
- `tagId: TagId`
- `assignedAt: Instant`

Reglas:

- una transaccion puede tener N tags
- reemplazar tags elimina los anteriores y deja la nueva lista
- transferencias si aceptan tags (contexto transversal)

Comandos:

- `ReplaceTransactionTags`
- `GetTagsByTransactionIds`

## Repositorios (domain ports)

- `CategoryRepository`
- `TagRepository`
- `TransactionCategoryAssignmentRepository`
- `TransactionTagAssignmentRepository`
- `TransactionReferencePort` (consulta minima a Ledger para validar tipo/estado si aplica)

Las asignaciones pueden limpiarse por lote mediante `deleteByTransactionIds` cuando un workflow externo elimina transacciones de Ledger. Esa limpieza no vive en el repositorio de Ledger.

## Eventos de dominio

- `CategoryCreated`
- `CategoryArchived`
- `CategoryAssignedToTransaction`
- `CategoryUnassignedFromTransaction`
- `TagCreated`
- `TagArchived`
- `TransactionTagsReplaced`

## Limites del contexto

Dentro de Taxonomy:

- catalogo de categorias y tags
- reglas de asignacion categoria/tags por transaccion

Fuera de Taxonomy:

- creacion/anulacion de transacciones
- balances contables
- retries tecnicos de integracion (workflow)
