# Ledger Domain

## Proposito

Registrar hechos economicos reales en cuentas:

- que paso
- cuanto
- cuando
- en que cuenta

Ledger no modela deudas, reparto entre personas, settlements ni presupuestos.

## Bounded Context

`Ledger`

Lenguaje ubicuo:

- `Account`
- `Transaction`
- `TransactionItem`
- `Income`
- `Expense`
- `Balance`

## Aggregate Roots

### Account

Campos:

- `id: AccountId`
- `name: String`
- `type: AccountType`
- `currency: CurrencyCode`
- `status: AccountStatus`
- `createdAt: Instant`
- `archivedAt: Instant?`

Reglas:

- `name` obligatorio
- `currency` obligatoria
- cuenta archivada no acepta nuevas transacciones

Comandos:

- `OpenLedgerAccount`
- `RenameLedgerAccount`
- `ArchiveLedgerAccount`

### Transaction

Campos:

- `id: TransactionId`
- `accountId: AccountId`
- `type: TransactionType` (`income | expense | transfer`)
- `amount: Money`
- `occurredAt: Instant`
- `description: String?`
- `merchant: String?`
- `categoryId: CategoryId?`
- `status: TransactionStatus` (`draft | posted | voided`)
- `items: List<TransactionItem>`
- `linkedTransactionId: TransactionId?`

Reglas:

- `amount > 0`
- `accountId` obligatorio
- `occurredAt` obligatorio
- moneda de transaccion igual a moneda de cuenta
- en `draft`, suma de items no puede superar `amount`
- al publicar (`posted`), si hay items: `sum(items) == amount`
- transaccion anulada (`voided`) no impacta balance

Comandos:

- `RecordLedgerIncome`
- `RecordLedgerExpense`
- `CreateLedgerExpenseDraft`
- `AddLedgerTransactionItem`
- `RemoveLedgerTransactionItem`
- `PostLedgerDraftTransaction`
- `VoidLedgerTransaction`

## Internal Entity

### TransactionItem

Campos:

- `id: TransactionItemId`
- `name: String`
- `amount: Money`
- `categoryId: CategoryId?`
- `note: String?`

Reglas:

- `name` obligatorio
- `amount > 0`
- moneda del item igual a la moneda de su transaccion

## Value Objects

- `Money`
- `AccountId`
- `TransactionId`
- `TransactionItemId`
- `CategoryId`
- `CurrencyCode`

## Repositorios (domain ports)

- `LedgerAccountRepository`
- `LedgerTransactionRepository`

## Servicios de dominio

- `BalanceCalculator`

## Eventos de dominio

- `AccountOpened`
- `AccountArchived`
- `TransactionRecorded`
- `TransactionVoided`
- `TransactionItemAdded`

## Consultas base

- listar cuentas
- listar transacciones por cuenta
- listar por rango de fechas
- listar por categoria
- listar por merchant
- obtener saldo actual por cuenta

## Limites del contexto

Dentro de Ledger:

- cuentas
- movimientos reales
- desglose interno por items

Fuera de Ledger:

- budgeting
- deudas/personas
- settlements
- analitica avanzada

## Estado de transferencias

MVP operativo en `income` y `expense`.

`transfer` queda modelado en tipo pero su flujo de doble transaccion enlazada se mantiene como fase posterior.
