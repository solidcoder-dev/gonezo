# Capacitor Migration Capability Matrix

This matrix tracks Spring API presentation endpoints versus Capacitor plugin coverage.

Status legend:
- `DONE`: Migrated to Capacitor plugin + Android core.
- `PENDING`: Not yet migrated.

## Command Use Cases

| Spring endpoint | Spring controller | Capacitor method | Status |
|---|---|---|---|
| `POST /accounts` | `AccountController.createAccount` | `createAccount` | DONE |
| `POST /transactions/expense` | `ExpenseController.postExpense` | `postExpense` | DONE |
| `POST /transactions/transfer` | `TransferController.postTransfer` | `postTransfer` | DONE |
| `POST /transactions/income` | `TransactionController.postIncome` | `postIncome` | DONE |
| `POST /budget-periods` | `BudgetPeriodController.create` | `createBudgetPeriod` | DONE |
| `POST /budget-periods/{periodId}/allocate` | `BudgetAllocationController.allocate` | `allocateBudget` | DONE |
| `POST /budget-periods/{periodId}/reservations` | `PeriodReservationsController.create` | `createPeriodReservations` | DONE |
| `POST /reservations/{reservationId}/settle` | `ReservationController.settle` | `settleReservation` | DONE |
| `POST /budget-periods/{periodId}/close` | `PeriodClosingController.close` | `closePeriod` | DONE |
| `POST /investments/execute` | `InvestmentController.execute` | `executeInvestment` | DONE |
| `POST /investments/returns` | `InvestmentController.recordReturn` | `recordInvestmentReturn` | DONE |

## Query Use Cases

| Spring endpoint | Spring controller | Capacitor method | Status |
|---|---|---|---|
| `GET /budget-periods/{periodId}/balances` | `CategoryBalanceQueryController.listBalances` | `getCategoryBalances` | DONE |
| `GET /budget-periods/{periodId}/reservations` | `ReservationQueryController.listActiveReservations` | `getPeriodReservations` | DONE |
| `GET /investments/containers/{containerId}/transactions` | `InvestmentQueryController.listTransactions` | `getInvestmentTransactions` | DONE |
| `GET /budget-periods/{periodId}` | `BudgetPeriodQueryController.getPeriod` | `getBudgetPeriod` | DONE |
| `GET /budget-periods/{periodId}/links` | `BudgetLinkQueryController.listLinks` | `getBudgetLinks` | DONE |

## Notes

- Scope is migration of business capabilities used by the app runtime path, preserving DDD layering.
- Spring `api/` module still exists in repository as reference and test harness; runtime migration target is Capacitor + native Android core/plugin.
