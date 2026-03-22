# Taxonomy Domain

## Proposito

Gestionar categorias de clasificacion para transacciones de Ledger sin acoplarse al agregado financiero.

Taxonomy no crea transacciones ni recalcula balances.

## Bounded Context

`Taxonomy`

Lenguaje ubicuo:

- `Category`
- `CategoryAssignment`
- `AppliesTo`

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

### CategoryAssignment

Campos:

- `transactionId: TransactionId`
- `categoryId: CategoryId`
- `assignedAt: Instant`

Reglas:

- una transaccion tiene como maximo una categoria activa
- reasignar reemplaza la asignacion anterior
- transferencias no son categorizables

Comandos:

- `AssignCategoryToTransaction`
- `UnassignCategoryFromTransaction`
- `GetAssignmentsByTransactionIds`

## Repositorios (domain ports)

- `CategoryRepository`
- `TransactionCategoryAssignmentRepository`
- `TransactionReferencePort` (consulta minima a Ledger para validar tipo/estado de transaccion)

## Eventos de dominio

- `CategoryCreated`
- `CategoryArchived`
- `CategoryAssignedToTransaction`
- `CategoryUnassignedFromTransaction`

## Limites del contexto

Dentro de Taxonomy:

- catalogo de categorias
- reglas de asignacion categoria-transaccion

Fuera de Taxonomy:

- creacion/anulacion de transacciones
- balances contables
- retries tecnicos de integracion (workflow)
