# Ledger Domain

## Proposito

Registrar hechos economicos reales en cuentas:

- que paso
- cuanto
- cuando
- en que cuenta

Ledger no modela deudas, reparto entre personas, settlements, presupuestos ni taxonomias de clasificacion.

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
- `currency` solo puede ser una moneda soportada por backend
- cuenta archivada no acepta nuevas transacciones

Comandos:

- `OpenLedgerAccount`
- `RenameLedgerAccount`
- `ArchiveLedgerAccount`
- `ListLedgerSupportedCurrencies`

### Transaction

Campos:

- `id: TransactionId`
- `accountId: AccountId`
- `type: TransactionType` (`income | expense | transfer`)
- `amount: Money`
- `occurredAt: Instant`
- `description: String?`
- `merchant: String?`
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
- `RecordLedgerTransfer`
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
- listar por merchant
- obtener saldo actual por cuenta

## Limites del contexto

Dentro de Ledger:

- cuentas
- movimientos reales
- desglose interno por items

Fuera de Ledger:

- budgeting
- taxonomy/categorias
- deudas/personas
- settlements
- analitica avanzada

## Estado de transferencias

Transferencias operativas con doble transaccion enlazada:

- `transfer_out` en cuenta origen
- `transfer_in` en cuenta destino
- ambas con `linkedTransactionId` reciproco
- al anular una, se anula su transaccion enlazada

## Apertura con balance inicial

`OpenLedgerAccount` permite `openingBalanceAmount` opcional.

No se guarda saldo mutable en `Account`: si se informa balance inicial, se crea una transaccion `income` o `expense` con descripcion `Opening balance`.

## Integracion con Taxonomy

Ledger no persiste clasificacion por categoria.

Si una UI recibe `categoryId` al registrar una transaccion:

1. primero se registra el hecho en Ledger
2. despues un workflow tecnico intenta asignar categoria en Taxonomy

Si la categoria no existe o no aplica, la transaccion permanece valida en Ledger.
