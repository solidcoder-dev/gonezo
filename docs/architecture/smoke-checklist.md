# Smoke Checklist

Run this checklist after each migration step.

## Build and tests

1. `cd app && npm run build`
2. `cd app/android && ./gradlew :app:assembleDebug`
3. `cd app/android && ./gradlew :domain:test`

## Runtime flows (Android emulator)

1. Create account.
2. Post expense.
3. Post transfer.
4. Post income.
5. Create budget period.
6. Allocate budget.
7. Create period reservations.
8. Query category balances.
9. Query reservations.
10. Execute investment and record return.
11. Query investment transactions.
12. Query budget period and budget links.
